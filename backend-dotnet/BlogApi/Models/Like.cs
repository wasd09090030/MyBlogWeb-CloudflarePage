namespace BlogApi.Models
{
    public class Like
    {
        public int Id { get; set; }
        public int ArticleId { get; set; }
        public string UserIdentifier { get; set; } = string.Empty;
        public string Type { get; set; } = "article"; // article, comment
        public int? TargetId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
