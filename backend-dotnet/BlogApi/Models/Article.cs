using System.Text.Json.Serialization;
using BlogApi.Utils;

namespace BlogApi.Models
{
    [JsonConverter(typeof(LowerCaseEnumConverter<ArticleCategory>))]
    public enum ArticleCategory
    {
        Study,      // 学习
        Game,       // 游戏
        Work,       // 个人作品
        Resource,   // 资源分享
        Other       // 其他
    }

    public class Article
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? ContentMarkdown { get; set; }
        public string? CoverImage { get; set; }
        public ArticleCategory Category { get; set; } = ArticleCategory.Other;
        
        /// <summary>
        /// 自定义标签列表（存储为 JSON 字符串）
        /// </summary>
        public List<string> Tags { get; set; } = new List<string>();
        
        /// <summary>
        /// AI 生成的文章概要
        /// </summary>
        public string? AiSummary { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    }
}
