using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace BlogApi.Services
{
    public class JwtService
    {
        private readonly IConfiguration _config;

        public JwtService(IConfiguration config)
        {
            _config = config;
        }

        /// <summary>
        /// 生成 Access Token
        /// </summary>
        public string GenerateAccessToken(string username, string role = "Admin")
        {
            var secretKey = _config["Jwt:SecretKey"] 
                ?? throw new InvalidOperationException("JWT SecretKey 未配置");
            
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var expirationMinutes = int.Parse(_config["Jwt:AccessTokenExpirationMinutes"] ?? "60");

            var claims = new[]
            {
                new Claim(ClaimTypes.Name, username),
                new Claim(ClaimTypes.Role, role),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
            };

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(expirationMinutes),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        /// <summary>
        /// 生成 Refresh Token
        /// </summary>
        public string GenerateRefreshToken()
        {
            var randomBytes = new byte[64];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomBytes);
            return Convert.ToBase64String(randomBytes);
        }

        /// <summary>
        /// 从过期的 Token 中获取 ClaimsPrincipal
        /// </summary>
        public ClaimsPrincipal? GetPrincipalFromExpiredToken(string token)
        {
            var secretKey = _config["Jwt:SecretKey"] 
                ?? throw new InvalidOperationException("JWT SecretKey 未配置");

            var tokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = false, // 允许过期的 token
                ValidateIssuerSigningKey = true,
                ValidIssuer = _config["Jwt:Issuer"],
                ValidAudience = _config["Jwt:Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            try
            {
                var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out var securityToken);
                
                if (securityToken is not JwtSecurityToken jwtSecurityToken ||
                    !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
                {
                    return null;
                }

                return principal;
            }
            catch
            {
                return null;
            }
        }

        /// <summary>
        /// 获取 Access Token 过期时间
        /// </summary>
        public DateTime GetAccessTokenExpiration()
        {
            var expirationMinutes = int.Parse(_config["Jwt:AccessTokenExpirationMinutes"] ?? "60");
            return DateTime.UtcNow.AddMinutes(expirationMinutes);
        }

        /// <summary>
        /// 获取 Refresh Token 过期时间
        /// </summary>
        public DateTime GetRefreshTokenExpiration()
        {
            var expirationDays = int.Parse(_config["Jwt:RefreshTokenExpirationDays"] ?? "7");
            return DateTime.UtcNow.AddDays(expirationDays);
        }
    }
}
