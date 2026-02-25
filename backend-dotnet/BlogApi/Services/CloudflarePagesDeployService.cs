using System.Net;

namespace BlogApi.Services
{
    public class CloudflarePagesDeployService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<CloudflarePagesDeployService> _logger;

        public CloudflarePagesDeployService(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<CloudflarePagesDeployService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<DeployTriggerResult> TriggerDeployAsync(CancellationToken cancellationToken = default)
        {
            var hookUrl = ResolveDeployHookUrl();
            if (string.IsNullOrWhiteSpace(hookUrl))
            {
                return DeployTriggerResult.Fail(
                    HttpStatusCode.ServiceUnavailable,
                    "Cloudflare Pages Deploy Hook 未配置"
                );
            }

            if (!Uri.TryCreate(hookUrl, UriKind.Absolute, out var hookUri))
            {
                return DeployTriggerResult.Fail(
                    HttpStatusCode.InternalServerError,
                    "Deploy Hook 地址格式无效"
                );
            }

            try
            {
                var client = _httpClientFactory.CreateClient();
                using var request = new HttpRequestMessage(HttpMethod.Post, hookUri);
                using var response = await client.SendAsync(request, cancellationToken);

                if (response.IsSuccessStatusCode)
                {
                    return DeployTriggerResult.Ok("已触发 Cloudflare Pages 重构发布");
                }

                var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning(
                    "触发 Cloudflare Pages Deploy Hook 失败，HTTP {StatusCode}，Body: {Body}",
                    (int)response.StatusCode,
                    Truncate(responseBody, 400)
                );

                return DeployTriggerResult.Fail(
                    HttpStatusCode.BadGateway,
                    $"Cloudflare 返回异常状态: {(int)response.StatusCode}"
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "触发 Cloudflare Pages Deploy Hook 时发生异常");
                return DeployTriggerResult.Fail(
                    HttpStatusCode.BadGateway,
                    "触发 Cloudflare Pages 重构失败，请检查网络或 Hook 配置"
                );
            }
        }

        private string? ResolveDeployHookUrl()
        {
            return _configuration["Cloudflare:PagesDeployHookUrl"]
                ?? _configuration["Cloudflare:Pages:DeployHookUrl"]
                ?? _configuration["CLOUDFLARE_PAGES_DEPLOY_HOOK_URL"];
        }

        private static string Truncate(string? value, int maxLength)
        {
            if (string.IsNullOrEmpty(value) || value.Length <= maxLength)
            {
                return value ?? string.Empty;
            }
            return value.Substring(0, maxLength);
        }
    }

    public sealed record DeployTriggerResult(bool Success, HttpStatusCode StatusCode, string Message)
    {
        public static DeployTriggerResult Ok(string message)
        {
            return new DeployTriggerResult(true, HttpStatusCode.OK, message);
        }

        public static DeployTriggerResult Fail(HttpStatusCode statusCode, string message)
        {
            return new DeployTriggerResult(false, statusCode, message);
        }
    }
}
