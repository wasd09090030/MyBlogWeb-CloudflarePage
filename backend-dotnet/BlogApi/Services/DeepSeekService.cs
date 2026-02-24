using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BlogApi.Services
{
    public class DeepSeekService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<DeepSeekService> _logger;
        private readonly JsonSerializerOptions _jsonOptions;

        public DeepSeekService(IConfiguration configuration, ILogger<DeepSeekService> logger)
        {
            _httpClient = new HttpClient();
            _configuration = configuration;
            _logger = logger;
            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true // 忽略大小写
            };
        }

        /// <summary>
        /// 使用 DeepSeek API 生成文章概要与 slug
        /// </summary>
        public async Task<AiSummaryResult> GenerateSummaryAsync(string content, string title)
        {
            var apiKey = _configuration["DeepSeek:ApiKey"];
            var apiUrl = _configuration["DeepSeek:ApiUrl"] ?? "https://api.deepseek.com/v1/chat/completions";
            var model = _configuration["DeepSeek:Model"] ?? "deepseek-chat";

            if (string.IsNullOrEmpty(apiKey))
            {
                _logger.LogWarning("DeepSeek API Key 未配置");
                throw new InvalidOperationException("AI 服务未配置，请在 appsettings.json 中设置 DeepSeek:ApiKey");
            }

            // 截取内容避免过长
            var truncatedContent = content.Length > 4000 ? content.Substring(0, 4000) + "..." : content;

            var requestBody = new
            {
                model = model,
                messages = new[]
                {
                    new
                    {
                        role = "system",
                        content = "你是一个专业的文章摘要生成助手。请根据提供的文章内容生成 JSON，仅包含 summary 和 slug 两个字段。summary 为 100-200 字中文概要，slug 为英文小写、使用短横线连接、避免空格与特殊字符。只输出 JSON，不要添加前缀或代码块。"
                    },
                    new
                    {
                        role = "user",
                        content = $"请为以下文章生成 JSON：\n\n标题：{title}\n\n内容：\n{truncatedContent}"
                    }
                },
                max_tokens = 600,
                temperature = 0.7
            };

            var jsonContent = JsonSerializer.Serialize(requestBody);
            var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");
            
            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            try
            {
                var response = await _httpClient.PostAsync(apiUrl, httpContent);
                var responseContent = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError($"DeepSeek API 调用失败: {response.StatusCode} - {responseContent}");
                    throw new HttpRequestException($"AI 服务调用失败: {response.StatusCode}");
                }

                _logger.LogDebug($"DeepSeek API 响应: {responseContent}");
                
                var result = JsonSerializer.Deserialize<DeepSeekResponse>(responseContent, _jsonOptions);
                var responseText = result?.Choices?.FirstOrDefault()?.Message?.Content?.Trim();

                if (string.IsNullOrEmpty(responseText))
                {
                    _logger.LogWarning($"AI 返回内容解析失败，原始响应: {responseContent}");
                    throw new InvalidOperationException("AI 返回的概要为空");
                }

                var aiResult = ParseAiResult(responseText);
                if (string.IsNullOrWhiteSpace(aiResult.Summary))
                {
                    _logger.LogWarning($"AI 返回内容解析失败，原始响应: {responseContent}");
                    throw new InvalidOperationException("AI 返回的概要为空");
                }

                _logger.LogInformation($"成功生成文章概要，长度: {aiResult.Summary.Length}");
                return aiResult;
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "调用 DeepSeek API 时发生网络错误");
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "生成文章概要时发生错误");
                throw;
            }
        }

        private static AiSummaryResult ParseAiResult(string responseText)
        {
            var cleaned = StripCodeFence(responseText);
            var jsonCandidate = ExtractJson(cleaned);

            try
            {
                using var doc = JsonDocument.Parse(jsonCandidate);
                var root = doc.RootElement;
                var summary = root.TryGetProperty("summary", out var summaryElement)
                    ? summaryElement.GetString()
                    : null;
                var slug = root.TryGetProperty("slug", out var slugElement)
                    ? slugElement.GetString()
                    : null;

                if (!string.IsNullOrWhiteSpace(summary))
                {
                    return new AiSummaryResult
                    {
                        Summary = summary.Trim(),
                        Slug = slug?.Trim()
                    };
                }
            }
            catch
            {
                // Ignore parse errors and fallback to raw text as summary.
            }

            return new AiSummaryResult
            {
                Summary = cleaned.Trim(),
                Slug = null
            };
        }

        private static string StripCodeFence(string input)
        {
            var trimmed = input.Trim();
            if (!trimmed.StartsWith("```"))
            {
                return trimmed;
            }

            var firstLineBreak = trimmed.IndexOf('\n');
            if (firstLineBreak >= 0)
            {
                trimmed = trimmed.Substring(firstLineBreak + 1);
            }

            var lastFence = trimmed.LastIndexOf("```", StringComparison.Ordinal);
            if (lastFence >= 0)
            {
                trimmed = trimmed.Substring(0, lastFence);
            }

            return trimmed.Trim();
        }

        private static string ExtractJson(string input)
        {
            var firstBrace = input.IndexOf('{');
            var lastBrace = input.LastIndexOf('}');
            if (firstBrace >= 0 && lastBrace > firstBrace)
            {
                return input.Substring(firstBrace, lastBrace - firstBrace + 1);
            }

            return input.Trim();
        }
    }

    public class AiSummaryResult
    {
        public string Summary { get; set; } = string.Empty;
        public string? Slug { get; set; }
    }

    // DeepSeek API 响应模型
    public class DeepSeekResponse
    {
        public List<DeepSeekChoice>? Choices { get; set; }
    }

    public class DeepSeekChoice
    {
        public DeepSeekMessage? Message { get; set; }
    }

    public class DeepSeekMessage
    {
        public string? Content { get; set; }
    }
}
