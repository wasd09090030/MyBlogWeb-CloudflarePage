namespace BlogApi.Models
{
    /// <summary>
    /// 图床配置模型
    /// </summary>
    public class ImagebedConfig
    {
        public int Id { get; set; }
        
        /// <summary>
        /// 图床域名
        /// </summary>
        public string Domain { get; set; } = string.Empty;
        
        /// <summary>
        /// API Token
        /// </summary>
        public string ApiToken { get; set; } = string.Empty;
        
        /// <summary>
        /// 默认上传目录
        /// </summary>
        public string? UploadFolder { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
