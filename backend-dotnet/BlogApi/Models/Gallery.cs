using System.ComponentModel.DataAnnotations.Schema;

namespace BlogApi.Models
{
    public class Gallery
    {
        public int Id { get; set; }

        public string ImageUrl { get; set; } = string.Empty;
        [NotMapped]
        public string? ThumbnailUrl { get; set; }
        public int? ImageWidth { get; set; }
        public int? ImageHeight { get; set; }
        public int SortOrder { get; set; } = 0;
        public bool IsActive { get; set; } = true;
        public string Tag { get; set; } = "artwork";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
