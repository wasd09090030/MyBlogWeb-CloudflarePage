namespace BlogApi.DTOs
{
    public class CreateGalleryDto
    {
        public string ImageUrl { get; set; } = string.Empty;
        public int SortOrder { get; set; } = 0;
        public bool IsActive { get; set; } = true;
        public string Tag { get; set; } = "artwork";
    }

    public class UpdateGalleryDto
    {
        public string? ImageUrl { get; set; }
        public int? SortOrder { get; set; }
        public bool? IsActive { get; set; }
        public string? Tag { get; set; }
        public DateTime? CreatedAt { get; set; }
    }

    public class GalleryDto
    {
        public int Id { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public string? ThumbnailUrl { get; set; }
        public int? ImageWidth { get; set; }
        public int? ImageHeight { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
        public string Tag { get; set; } = "artwork";
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class GalleryDimensionsDto
    {
        public int Id { get; set; }
        public int? ImageWidth { get; set; }
        public int? ImageHeight { get; set; }
    }

    public class GalleryRefreshResultDto
    {
        public int Total { get; set; }
        public int Updated { get; set; }
        public int Failed { get; set; }
    }

    public class UpdateSortOrderDto
    {
        public int Id { get; set; }
        public int SortOrder { get; set; }
    }

    public class BatchImportGalleryDto
    {
        public List<string> ImageUrls { get; set; } = new List<string>();
        public bool IsActive { get; set; } = true;
        public string Tag { get; set; } = "artwork";
    }
}
