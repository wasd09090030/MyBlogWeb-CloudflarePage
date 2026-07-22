using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BlogApi.Services;

namespace BlogApi.Controllers
{
    [ApiController]
    [Route("api/internal/image-assets")]
    public class ImageAssetsController : ControllerBase
    {
        private readonly ImageAssetResolveService _resolveService;
        private readonly ImageAssetBackfillService _backfillService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<ImageAssetsController> _logger;

        public ImageAssetsController(
            ImageAssetResolveService resolveService,
            ImageAssetBackfillService backfillService,
            IConfiguration configuration,
            ILogger<ImageAssetsController> logger)
        {
            _resolveService = resolveService;
            _backfillService = backfillService;
            _configuration = configuration;
            _logger = logger;
        }

        [HttpGet("{publicId}")]
        public async Task<IActionResult> Resolve(string publicId)
        {
            var expectedToken = _configuration["ImageAssets:ResolveToken"];
            if (string.IsNullOrWhiteSpace(expectedToken))
            {
                _logger.LogError("ImageAssets:ResolveToken is not configured.");
                return StatusCode(StatusCodes.Status503ServiceUnavailable, "Service unavailable");
            }

            var authorization = Request.Headers.Authorization.ToString();
            var actualToken = authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                ? authorization.Substring("Bearer ".Length).Trim()
                : string.Empty;

            if (!FixedTimeEquals(actualToken, expectedToken))
            {
                return Unauthorized();
            }

            var result = await _resolveService.ResolveAsync(publicId);
            return result == null ? NotFound() : Ok(result);
        }

        [Authorize]
        [HttpPost("backfill/article-covers")]
        public async Task<IActionResult> BackfillArticleCovers()
        {
            var updated = await _backfillService.BackfillArticleCoversAsync();
            return Ok(new { updated });
        }

        private static bool FixedTimeEquals(string left, string right)
        {
            var leftBytes = Encoding.UTF8.GetBytes(left);
            var rightBytes = Encoding.UTF8.GetBytes(right);
            return leftBytes.Length == rightBytes.Length
                && CryptographicOperations.FixedTimeEquals(leftBytes, rightBytes);
        }
    }
}
