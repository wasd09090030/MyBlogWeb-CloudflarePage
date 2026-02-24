using Microsoft.AspNetCore.Mvc;
using BlogApi.Services;
using BlogApi.Utils;

namespace BlogApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AiController : ControllerBase
    {
        private readonly DeepSeekService _deepSeekService;
        private readonly ILogger<AiController> _logger;

        public AiController(DeepSeekService deepSeekService, ILogger<AiController> logger)
        {
            _deepSeekService = deepSeekService;
            _logger = logger;
        }

        /// <summary>
        /// 生成文章概要
        /// </summary>
        [HttpPost("summary")]
        public async Task<ActionResult<object>> GenerateSummary([FromBody] GenerateSummaryRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Content))
            {
                return BadRequest("文章内容不能为空");
            }

            try
            {
                var result = await _deepSeekService.GenerateSummaryAsync(
                    request.Content, 
                    request.Title ?? "未命名文章"
                );

                var slugCandidate = !string.IsNullOrWhiteSpace(result.Slug)
                    ? result.Slug
                    : request.Title ?? "article";
                var slug = SlugHelper.Slugify(slugCandidate);
                if (string.IsNullOrWhiteSpace(slug))
                {
                    slug = "article";
                }

                return Ok(new { summary = result.Summary, slug });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "AI 服务配置错误");
                return StatusCode(503, new { error = ex.Message });
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "调用 AI 服务失败");
                return StatusCode(503, new { error = "AI 服务暂时不可用，请稍后重试" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "生成概要时发生未知错误");
                return StatusCode(500, new { error = "生成概要失败，请稍后重试" });
            }
        }
    }

    public class GenerateSummaryRequest
    {
        public string Content { get; set; } = string.Empty;
        public string? Title { get; set; }
    }
}
