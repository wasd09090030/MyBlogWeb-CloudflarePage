namespace BlogApi.DTOs
{
    public class CreateCommentDto
    {
        public string Content { get; set; } = string.Empty;
        public string Author { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Website { get; set; }
        public int ArticleId { get; set; }
        public int? ParentId { get; set; }
    }

    public class UpdateCommentStatusDto
    {
        public string Status { get; set; } = string.Empty;
    }

    public class CommentDto
    {
        public int Id { get; set; }
        public string Content { get; set; } = string.Empty;
        public string Author { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Website { get; set; }
        public int ArticleId { get; set; }
        public int? ParentId { get; set; }
        public int Likes { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? UserIp { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
