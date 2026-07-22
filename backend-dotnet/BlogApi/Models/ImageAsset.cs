namespace BlogApi.Models
{
    public enum ImageAssetKind
    {
        ArticleCover,
        Gallery,
        Beatmap,
        Other
    }

    public class ImageAsset
    {
        public int Id { get; set; }
        public string PublicId { get; set; } = string.Empty;
        public string StorageKey { get; set; } = string.Empty;
        public string? SourceUrl { get; set; }
        public string? ContentType { get; set; }
        public int Version { get; set; } = 1;
        public ImageAssetKind Kind { get; set; } = ImageAssetKind.Other;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}