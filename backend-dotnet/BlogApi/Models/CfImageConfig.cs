namespace BlogApi.Models
{
    /// <summary>
    /// Cloudflare 图片转换配置
    /// </summary>
    public class CfImageConfig
    {
        public int Id { get; set; }

        /// <summary>
        /// 是否启用缩略图转换
        /// </summary>
        public bool IsEnabled { get; set; } = true;

        /// <summary>
        /// Cloudflare Zone 域名（为空则使用源图片域名）
        /// </summary>
        public string? ZoneDomain { get; set; }

        /// <summary>
        /// 强制使用 https 访问转换链接
        /// </summary>
        public bool UseHttps { get; set; } = true;

        /// <summary>
        /// 缩放模式（如 scale-down）
        /// </summary>
        public string Fit { get; set; } = "scale-down";

        /// <summary>
        /// 缩略图宽度（像素）
        /// </summary>
        public int Width { get; set; } = 300;

        /// <summary>
        /// 压缩质量（1-100）
        /// </summary>
        public int Quality { get; set; } = 50;

        /// <summary>
        /// 输出格式（如 webp, jpeg, png, auto）
        /// </summary>
        public string Format { get; set; } = "webp";

        /// <summary>
        /// 签名参数名（默认 sig）
        /// </summary>
        public string SignatureParam { get; set; } = "sig";

        /// <summary>
        /// 是否使用 Worker 生成缩略图
        /// </summary>
        public bool UseWorker { get; set; } = false;

        /// <summary>
        /// Worker 基础地址（如 https://imgworker.example.com）
        /// </summary>
        public string? WorkerBaseUrl { get; set; }

        /// <summary>
        /// 签名过期时间（秒）
        /// </summary>
        public int TokenTtlSeconds { get; set; } = 3600;

        /// <summary>
        /// 静态签名令牌（规则校验用）
        /// </summary>
        public string? SignatureToken { get; set; }

        /// <summary>
        /// HMAC 签名密钥（可选）
        /// </summary>
        public string? SignatureSecret { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
