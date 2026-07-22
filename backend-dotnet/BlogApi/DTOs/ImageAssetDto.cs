namespace BlogApi.DTOs
{
    public class ImageAssetResolveDto
    {
        public string PublicId { get; set; } = string.Empty;
        public string StorageKey { get; set; } = string.Empty;
        public string? SourceUrl { get; set; }
        public string? ContentType { get; set; }
        public int Version { get; set; }
    }
}
