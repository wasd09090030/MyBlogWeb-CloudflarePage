using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using BlogApi.Services;
using BlogApi.DTOs;

namespace BlogApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;
        private readonly JwtService _jwtService;

        /// <summary>
        /// 初始化认证控制器，注入认证与 JWT 服务。
        /// </summary>
        public AuthController(AuthService authService, JwtService jwtService)
        {
            _authService = authService;
            _jwtService = jwtService;
        }

        /// <summary>
        /// 校验管理员凭据并签发访问令牌与刷新令牌。
        /// </summary>
        [HttpPost("login")]
        public ActionResult<AuthResponse> Login([FromBody] LoginDto dto)
        {
            try
            {
                var result = _authService.ValidateAdmin(dto.Username, dto.Password);

                if (!result.Success)
                {
                    return Unauthorized(result);
                }

                // 生成 JWT Token
                result.Token = _jwtService.GenerateAccessToken(dto.Username);
                result.RefreshToken = _jwtService.GenerateRefreshToken();
                result.ExpiresAt = _jwtService.GetAccessTokenExpiration();

                // 存储 RefreshToken
                var refreshExpiresAt = _jwtService.GetRefreshTokenExpiration();
                _authService.StoreRefreshToken(dto.Username, result.RefreshToken, refreshExpiresAt);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new AuthResponse
                {
                    Success = false,
                    Message = $"服务器内部错误: {ex.Message}"
                });
            }
        }

        /// <summary>
        /// 使用刷新令牌换取新的访问令牌。
        /// </summary>
        [HttpPost("refresh")]
        public ActionResult<AuthResponse> RefreshToken([FromBody] RefreshTokenDto dto)
        {
            try
            {
                var result = _authService.RefreshToken(dto.RefreshToken, _jwtService);

                if (!result.Success)
                {
                    return Unauthorized(result);
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new AuthResponse
                {
                    Success = false,
                    Message = $"服务器内部错误: {ex.Message}"
                });
            }
        }

        /// <summary>
        /// 吊销当前用户刷新令牌并执行登出。
        /// </summary>
        [Authorize]
        [HttpPost("logout")]
        public IActionResult Logout()
        {
            try
            {
                var username = User.Identity?.Name;
                _authService.RevokeRefreshToken(username);
                return Ok(new { success = true, message = "已成功登出" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"登出失败: {ex.Message}" });
            }
        }

        /// <summary>
        /// 验证当前访问令牌是否有效。
        /// </summary>
        [Authorize]
        [HttpGet("verify")]
        public IActionResult VerifyToken()
        {
            // 如果能到达这里，说明 Token 有效
            var username = User.Identity?.Name;
            return Ok(new { success = true, message = "Token 有效", username });
        }

        /// <summary>
        /// 修改管理员登录密码。
        /// </summary>
        [Authorize]
        [HttpPost("change-password")]
        public ActionResult<AuthResponse> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            try
            {
                var result = _authService.ChangePassword(dto.CurrentPassword, dto.NewPassword);

                if (!result.Success)
                {
                    return BadRequest(result);
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new AuthResponse
                {
                    Success = false,
                    Message = $"服务器内部错误: {ex.Message}"
                });
            }
        }
    }
}
