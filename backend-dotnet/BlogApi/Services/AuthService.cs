using BlogApi.DTOs;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Collections.Concurrent;

namespace BlogApi.Services
{
    public class AuthService
    {
        private readonly string _passwordFilePath;
        private const string DefaultUsername = "admin";
        private const string DefaultPassword = "admin123"; // 默认密码

        // 存储 RefreshToken (生产环境建议使用 Redis 或数据库)
        private static readonly ConcurrentDictionary<string, RefreshTokenInfo> _refreshTokens = new();

        public AuthService(IWebHostEnvironment env)
        {
            _passwordFilePath = Path.Combine(env.ContentRootPath, "admin-password.enc");
            
            // 如果密码文件不存在,创建默认密码
            if (!File.Exists(_passwordFilePath))
            {
                var hashedPassword = BCrypt.Net.BCrypt.HashPassword(DefaultPassword);
                File.WriteAllText(_passwordFilePath, hashedPassword);
            }
        }

        public AuthResponse ValidateAdmin(string username, string password)
        {
            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            {
                return new AuthResponse { Success = false, Message = "用户名和密码不能为空" };
            }

            if (username != DefaultUsername)
            {
                return new AuthResponse { Success = false, Message = "用户名或密码错误" };
            }

            try
            {
                var storedHash = File.ReadAllText(_passwordFilePath);
                
                if (BCrypt.Net.BCrypt.Verify(password, storedHash))
                {
                    return new AuthResponse { Success = true, Message = "登录成功" };
                }
                else
                {
                    return new AuthResponse { Success = false, Message = "用户名或密码错误" };
                }
            }
            catch (Exception ex)
            {
                return new AuthResponse { Success = false, Message = $"验证失败: {ex.Message}" };
            }
        }

        public AuthResponse ChangePassword(string currentPassword, string newPassword)
        {
            if (string.IsNullOrWhiteSpace(currentPassword) || string.IsNullOrWhiteSpace(newPassword))
            {
                return new AuthResponse { Success = false, Message = "密码不能为空" };
            }

            if (newPassword.Length < 6)
            {
                return new AuthResponse { Success = false, Message = "新密码长度至少为6个字符" };
            }

            try
            {
                var storedHash = File.ReadAllText(_passwordFilePath);
                
                if (!BCrypt.Net.BCrypt.Verify(currentPassword, storedHash))
                {
                    return new AuthResponse { Success = false, Message = "当前密码错误" };
                }

                var newHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
                File.WriteAllText(_passwordFilePath, newHash);

                return new AuthResponse { Success = true, Message = "密码修改成功" };
            }
            catch (Exception ex)
            {
                return new AuthResponse { Success = false, Message = $"密码修改失败: {ex.Message}" };
            }
        }

        /// <summary>
        /// 存储 Refresh Token
        /// </summary>
        public void StoreRefreshToken(string username, string refreshToken, DateTime expiresAt)
        {
            // 移除该用户之前的所有 RefreshToken
            var keysToRemove = _refreshTokens.Where(x => x.Value.Username == username).Select(x => x.Key).ToList();
            foreach (var key in keysToRemove)
            {
                _refreshTokens.TryRemove(key, out _);
            }

            // 存储新的 RefreshToken
            _refreshTokens[refreshToken] = new RefreshTokenInfo
            {
                Username = username,
                ExpiresAt = expiresAt
            };
        }

        /// <summary>
        /// 验证并刷新 Token
        /// </summary>
        public AuthResponse RefreshToken(string refreshToken, JwtService jwtService)
        {
            if (string.IsNullOrWhiteSpace(refreshToken))
            {
                return new AuthResponse { Success = false, Message = "Refresh Token 不能为空" };
            }

            if (!_refreshTokens.TryGetValue(refreshToken, out var tokenInfo))
            {
                return new AuthResponse { Success = false, Message = "无效的 Refresh Token" };
            }

            if (tokenInfo.ExpiresAt < DateTime.UtcNow)
            {
                _refreshTokens.TryRemove(refreshToken, out _);
                return new AuthResponse { Success = false, Message = "Refresh Token 已过期" };
            }

            // 移除旧的 RefreshToken
            _refreshTokens.TryRemove(refreshToken, out _);

            // 生成新的 Token
            var newAccessToken = jwtService.GenerateAccessToken(tokenInfo.Username);
            var newRefreshToken = jwtService.GenerateRefreshToken();
            var expiresAt = jwtService.GetAccessTokenExpiration();
            var refreshExpiresAt = jwtService.GetRefreshTokenExpiration();

            // 存储新的 RefreshToken
            StoreRefreshToken(tokenInfo.Username, newRefreshToken, refreshExpiresAt);

            return new AuthResponse
            {
                Success = true,
                Message = "Token 刷新成功",
                Token = newAccessToken,
                RefreshToken = newRefreshToken,
                ExpiresAt = expiresAt
            };
        }

        /// <summary>
        /// 撤销 Refresh Token (登出时调用)
        /// </summary>
        public void RevokeRefreshToken(string? username)
        {
            if (string.IsNullOrEmpty(username)) return;

            var keysToRemove = _refreshTokens.Where(x => x.Value.Username == username).Select(x => x.Key).ToList();
            foreach (var key in keysToRemove)
            {
                _refreshTokens.TryRemove(key, out _);
            }
        }

        /// <summary>
        /// 清理过期的 RefreshToken
        /// </summary>
        public static void CleanupExpiredTokens()
        {
            var expiredKeys = _refreshTokens.Where(x => x.Value.ExpiresAt < DateTime.UtcNow).Select(x => x.Key).ToList();
            foreach (var key in expiredKeys)
            {
                _refreshTokens.TryRemove(key, out _);
            }
        }
    }

    public class RefreshTokenInfo
    {
        public string Username { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
    }
}
