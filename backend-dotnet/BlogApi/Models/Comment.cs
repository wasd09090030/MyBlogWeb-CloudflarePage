namespace BlogApi.Models
{
    public class Comment
    {
        public int Id { get; set; }
        public string Content { get; set; } = string.Empty;
        public string Author { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Website { get; set; }
        public int ArticleId { get; set; }
        public int? ParentId { get; set; }
        public int Likes { get; set; } = 0;
        public string Status { get; set; } = "pending"; // pending, approved, rejected
        public string? UserIp { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public Article? Article { get; set; }
    }
}
