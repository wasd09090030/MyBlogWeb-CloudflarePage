using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using BlogApi.Services;
using BlogApi.DTOs;

namespace BlogApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ImagebedController : ControllerBase
    {
        private readonly ImagebedService _imagebedService;

        public ImagebedController(ImagebedService imagebedService)
        {
            _imagebedService = imagebedService;
        }

        /// <summary>
        /// 获取图床配置
        /// </summary>
        [HttpGet("config")]
        public async Task<ActionResult<ImagebedConfigDto>> GetConfig()
        {
            var config = await _imagebedService.GetConfigAsync();
            if (config == null)
            {
                return Ok(new ImagebedConfigDto());
            }

            return Ok(new ImagebedConfigDto
            {
                Domain = config.Domain,
                ApiToken = config.ApiToken,
                UploadFolder = config.UploadFolder
            });
        }

        /// <summary>
        /// 保存图床配置
        /// </summary>
        [HttpPost("config")]
        public async Task<ActionResult<ImagebedConfigDto>> SaveConfig([FromBody] ImagebedConfigDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Domain))
            {
                return BadRequest(new { error = "域名不能为空" });
            }

            if (string.IsNullOrWhiteSpace(dto.ApiToken))
            {
                return BadRequest(new { error = "API Token 不能为空" });
            }

            var config = await _imagebedService.SaveConfigAsync(dto);
            
            return Ok(new ImagebedConfigDto
            {
                Domain = config.Domain,
                ApiToken = config.ApiToken,
                UploadFolder = config.UploadFolder
            });
        }
    }
}
