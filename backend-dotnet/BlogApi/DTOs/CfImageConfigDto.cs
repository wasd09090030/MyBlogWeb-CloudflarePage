namespace BlogApi.DTOs
{
    /// <summary>
    /// Cloudflare 图片转换配置 DTO
    /// </summary>
    public class CfImageConfigDto
    {
        public bool IsEnabled { get; set; } = true;
        public string? ZoneDomain { get; set; }
        public bool UseHttps { get; set; } = true;
        public string Fit { get; set; } = "scale-down";
        public int Width { get; set; } = 300;
        public int Quality { get; set; } = 50;
        public string Format { get; set; } = "webp";
        public string SignatureParam { get; set; } = "sig";
        public bool UseWorker { get; set; } = false;
        public string? WorkerBaseUrl { get; set; }
        public int TokenTtlSeconds { get; set; } = 3600;
        public string? SignatureToken { get; set; }
        public string? SignatureSecret { get; set; }
    }
}
