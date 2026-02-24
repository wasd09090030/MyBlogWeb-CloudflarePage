using BlogApi.Models;

namespace BlogApi.DTOs
{
    public class CreateArticleDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Slug { get; set; }
        public string Content { get; set; } = string.Empty;
        public string? ContentMarkdown { get; set; }
        public string? CoverImage { get; set; }
        public ArticleCategory Category { get; set; }
        public List<string>? Tags { get; set; }
        public string? AiSummary { get; set; }
    }

    public class UpdateArticleDto
    {
        public string? Title { get; set; }
        public string? Slug { get; set; }
        public string? Content { get; set; }
        public string? ContentMarkdown { get; set; }
        public string? CoverImage { get; set; }
        public ArticleCategory? Category { get; set; }
        public List<string>? Tags { get; set; }
        public string? AiSummary { get; set; }
    }

    public class ArticleSummaryDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Slug { get; set; }
        public string? CoverImage { get; set; }
        public ArticleCategory Category { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? Content { get; set; }  // 添加内容字段用于生成摘要
        public string? ContentMarkdown { get; set; }  // 可选的 Markdown 内容
        public List<string>? Tags { get; set; }
        public string? AiSummary { get; set; }
    }

    public class ArticleWithCommentsDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Slug { get; set; }
        public string Content { get; set; } = string.Empty;
        public string? ContentMarkdown { get; set; }
        public string? CoverImage { get; set; }
        public ArticleCategory Category { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int CommentCount { get; set; }
        public List<string>? Tags { get; set; }
        public string? AiSummary { get; set; }
    }
}
