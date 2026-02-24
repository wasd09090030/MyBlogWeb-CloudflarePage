namespace BlogApi.DTOs
{
    /// <summary>
    /// 图床配置 DTO
    /// </summary>
    public class ImagebedConfigDto
    {
        public string Domain { get; set; } = string.Empty;
        public string ApiToken { get; set; } = string.Empty;
        public string? UploadFolder { get; set; }
    }
}
