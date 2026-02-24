using Microsoft.EntityFrameworkCore;
using BlogApi.Data;
using BlogApi.Models;
using BlogApi.DTOs;
using BlogApi.Utils;
using Markdig;

namespace BlogApi.Services
{
    /// <summary>
    /// 文章领域服务。
    /// 负责文章的创建、查询、更新、删除，以及摘要检索和 slug 去重等逻辑。
    /// </summary>
    public class ArticleService
    {
        private readonly BlogDbContext _context;

        /// <summary>
        /// 初始化 <see cref="ArticleService"/>。
        /// </summary>
        /// <param name="context">数据库上下文。</param>
        public ArticleService(BlogDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// 创建文章。
        /// 当仅提供 Markdown 内容时，会自动生成 HTML 内容。
        /// </summary>
        /// <param name="dto">创建文章数据。</param>
        /// <returns>持久化后的文章实体。</returns>
        public async Task<Article> CreateAsync(CreateArticleDto dto)
        {
            var htmlContent = ResolveHtmlContent(dto.Content, dto.ContentMarkdown);

            var article = new Article
            {
                Title = dto.Title,
                Slug = await GenerateUniqueSlugAsync(dto.Slug ?? dto.Title),
                Content = htmlContent,
                ContentMarkdown = dto.ContentMarkdown,
                CoverImage = dto.CoverImage,
                Category = dto.Category,
                Tags = dto.Tags ?? new List<string>(),
                AiSummary = dto.AiSummary,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Articles.Add(article);
            await _context.SaveChangesAsync();
            return article;
        }

        /// <summary>
        /// 获取全部文章（包含评论），按创建时间倒序。
        /// </summary>
        /// <returns>文章列表。</returns>
        public async Task<List<Article>> GetAllAsync()
        {
            return await _context.Articles
                .Include(a => a.Comments)
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();
        }

        /// <summary>
        /// 获取文章摘要列表，并返回统一分页结构。
        /// </summary>
        /// <param name="category">可选分类过滤。</param>
        /// <param name="page">可选页码。</param>
        /// <param name="limit">可选每页条数。</param>
        /// <returns>包含 data、total、page、pageSize、totalPages 的对象。</returns>
        public async Task<object> GetAllSummaryAsync(ArticleCategory? category = null, int? page = null, int? limit = null)
        {
            var query = _context.Articles.AsQueryable();

            if (category.HasValue)
            {
                query = query.Where(a => a.Category == category.Value);
            }

            // 先统计总数，再做分页，确保 total 反映“过滤后全集”而非当前页数量。
            var total = await query.CountAsync();
            
            // 固定排序后再分页，避免跨页数据顺序抖动。
            query = query.OrderByDescending(a => a.CreatedAt);

            if (page.HasValue && limit.HasValue)
            {
                // 仅当 page 与 limit 都提供时启用分页，兼容历史“只传 summary 不分页”的调用。
                query = query.Skip((page.Value - 1) * limit.Value).Take(limit.Value);
            }

            var data = await query
                .Select(a => new ArticleSummaryDto
                {
                    Id = a.Id,
                    Title = a.Title,
                    Slug = a.Slug,
                    CoverImage = a.CoverImage,
                    Category = a.Category,
                    CreatedAt = a.CreatedAt,
                    UpdatedAt = a.UpdatedAt,
                    // 列表摘要限制长度，降低传输体积与前端首屏负担。
                    Content = a.Content.Length > 240 ? a.Content.Substring(0, 240) : a.Content,
                    // Markdown 截断更短，尽量减少半截语法导致的渲染噪音。
                    ContentMarkdown = a.ContentMarkdown != null && a.ContentMarkdown.Length > 240
                        ? a.ContentMarkdown.Substring(0, 200) 
                        : a.ContentMarkdown,
                    Tags = a.Tags,
                    AiSummary = a.AiSummary
                })
                .ToListAsync();

            // 未分页时 pageSize 使用当前 data 数量，避免返回 0 造成 totalPages 计算异常。
            var currentPage = page ?? 1;
            var pageSize = limit ?? data.Count;

            return new
            {
                data,
                total,
                page = currentPage,
                pageSize,
                totalPages = pageSize > 0 ? (int)Math.Ceiling((double)total / pageSize) : 1
            };
        }

        /// <summary>
        /// 获取完整文章分页数据（包含评论）。
        /// </summary>
        /// <param name="category">可选分类过滤。</param>
        /// <param name="page">页码，默认 1。</param>
        /// <param name="limit">每页条数，默认 10。</param>
        /// <returns>包含 data、total、page、pageSize、totalPages 的对象。</returns>
        public async Task<object> GetWithPaginationAsync(ArticleCategory? category = null, int? page = null, int? limit = null)
        {
            var query = _context.Articles.AsQueryable();

            if (category.HasValue)
            {
                query = query.Where(a => a.Category == category.Value);
            }

            var total = await query.CountAsync();
            var currentPage = page ?? 1;
            var pageSize = limit ?? 10;

            var articles = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip((currentPage - 1) * pageSize)
                .Take(pageSize)
                .Include(a => a.Comments)
                .ToListAsync();

            return new
            {
                data = articles,
                total,
                page = currentPage,
                pageSize,
                totalPages = (int)Math.Ceiling((double)total / pageSize)
            };
        }

        /// <summary>
        /// 获取指定分类的文章列表。
        /// </summary>
        /// <param name="category">文章分类。</param>
        /// <returns>分类下文章列表。</returns>
        public async Task<List<Article>> GetByCategoryAsync(ArticleCategory category)
        {
            return await _context.Articles
                .Where(a => a.Category == category)
                .Include(a => a.Comments)
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();
        }

        /// <summary>
        /// 获取推荐文章。
        /// 当前采用“随机抽取文章 ID”的策略实现。
        /// </summary>
        /// <param name="limit">推荐条数上限。</param>
        /// <returns>推荐文章列表。</returns>
        public async Task<List<Article>> GetFeaturedAsync(int limit = 5)
        {
            // 获取所有文章的ID
            var allIds = await _context.Articles
                .Select(a => a.Id)
                .ToListAsync();

            if (allIds.Count == 0)
                return new List<Article>();

            // 通过随机打散 ID 集合实现轻量“推荐”，不保证稳定顺序。
            var random = new Random();
            var selectedIds = allIds
                .OrderBy(x => random.Next())
                .Take(Math.Min(limit, allIds.Count))
                .ToList();

            // 二次查询实体并附带评论，供前端直接渲染卡片信息。
            return await _context.Articles
                .Where(a => selectedIds.Contains(a.Id))
                .Include(a => a.Comments)
                .ToListAsync();
        }

        /// <summary>
        /// 根据关键词搜索文章。
        /// 匹配标题、HTML 内容与 Markdown 内容，最多返回 50 条摘要结果。
        /// </summary>
        /// <param name="keyword">搜索关键词。</param>
        /// <returns>文章摘要列表。</returns>
        public async Task<List<ArticleSummaryDto>> SearchAsync(string keyword)
        {
            var query = _context.Articles.AsQueryable();

            // 使用 EF.Functions.Like 下推到数据库执行，大小写行为取决于数据库排序规则。
            query = query.Where(a => 
                EF.Functions.Like(a.Title, $"%{keyword}%") || 
                EF.Functions.Like(a.Content, $"%{keyword}%") ||
                (a.ContentMarkdown != null && EF.Functions.Like(a.ContentMarkdown, $"%{keyword}%"))
            );

            return await query
                .OrderByDescending(a => a.CreatedAt)
                .Take(50) // 限制最多返回50条结果
                .Select(a => new ArticleSummaryDto
                {
                    Id = a.Id,
                    Title = a.Title,
                    Slug = a.Slug,
                    CoverImage = a.CoverImage,
                    Category = a.Category,
                    CreatedAt = a.CreatedAt,
                    UpdatedAt = a.UpdatedAt,
                    // 搜索结果仅返回摘要，避免把全文直接拉回列表页。
                    Content = a.Content.Length > 240 ? a.Content.Substring(0, 240) : a.Content,
                    ContentMarkdown = a.ContentMarkdown != null && a.ContentMarkdown.Length > 240
                        ? a.ContentMarkdown.Substring(0, 200) 
                        : a.ContentMarkdown,
                    Tags = a.Tags,
                    AiSummary = a.AiSummary
                })
                .ToListAsync();
        }

        /// <summary>
        /// 按 ID 获取文章详情。
        /// </summary>
        /// <param name="id">文章 ID。</param>
        /// <returns>文章实体；不存在时返回 null。</returns>
        public async Task<Article?> GetByIdAsync(int id)
        {
            return await _context.Articles
                .Include(a => a.Comments)
                .FirstOrDefaultAsync(a => a.Id == id);
        }

        /// <summary>
        /// 更新文章。
        /// 当只更新 Markdown 且未传入 HTML 时，会自动重建 HTML 内容。
        /// </summary>
        /// <param name="id">文章 ID。</param>
        /// <param name="dto">更新字段。</param>
        /// <returns>更新后的文章；不存在时返回 null。</returns>
        public async Task<Article?> UpdateAsync(int id, UpdateArticleDto dto)
        {
            var article = await _context.Articles.FindAsync(id);
            if (article == null) return null;

            if (dto.Title != null) article.Title = dto.Title;
            if (dto.Slug != null)
            {
                // 显式传入 slug 时始终做唯一化，避免与其他文章冲突。
                article.Slug = await GenerateUniqueSlugAsync(dto.Slug, article.Id);
            }
            else if (string.IsNullOrWhiteSpace(article.Slug))
            {
                // 历史数据可能缺失 slug，这里在更新时兜底补齐。
                article.Slug = await GenerateUniqueSlugAsync(article.Title, article.Id);
            }
            if (dto.Content != null) article.Content = dto.Content;
            if (dto.ContentMarkdown != null)
            {
                article.ContentMarkdown = dto.ContentMarkdown;
                if (string.IsNullOrWhiteSpace(dto.Content))
                {
                    // 若本次未显式给 HTML，则基于新的 Markdown 重新生成 HTML。
                    article.Content = ResolveHtmlContent(null, dto.ContentMarkdown);
                }
            }
            if (dto.CoverImage != null) article.CoverImage = dto.CoverImage;
            if (dto.Category.HasValue) article.Category = dto.Category.Value;
            if (dto.Tags != null) article.Tags = dto.Tags;
            if (dto.AiSummary != null) article.AiSummary = dto.AiSummary;

            article.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return article;
        }

        /// <summary>
        /// 解析最终 HTML 内容。
        /// 优先使用显式传入的 HTML；若为空则尝试将 Markdown 转为 HTML。
        /// </summary>
        /// <param name="content">原始 HTML 内容。</param>
        /// <param name="markdown">Markdown 内容。</param>
        /// <returns>最终可存储的 HTML 字符串。</returns>
        private static string ResolveHtmlContent(string? content, string? markdown)
        {
            if (!string.IsNullOrWhiteSpace(content))
            {
                return content;
            }

            if (string.IsNullOrWhiteSpace(markdown))
            {
                return string.Empty;
            }

            return Markdown.ToHtml(markdown);
        }

        /// <summary>
        /// 生成唯一 slug。
        /// 若 slug 已存在，则自动追加递增后缀（例如 -2、-3）。
        /// </summary>
        /// <param name="source">slug 来源文本。</param>
        /// <param name="excludeId">更新场景下需要排除的文章 ID。</param>
        /// <returns>唯一 slug。</returns>
        private async Task<string> GenerateUniqueSlugAsync(string? source, int? excludeId = null)
        {
            var baseSlug = SlugHelper.Slugify(source ?? string.Empty);
            if (string.IsNullOrWhiteSpace(baseSlug))
            {
                baseSlug = "article";
            }

            var slug = baseSlug;
            var suffix = 1;

            while (await _context.Articles.AnyAsync(a => a.Slug == slug && (!excludeId.HasValue || a.Id != excludeId.Value)))
            {
                suffix++;
                slug = $"{baseSlug}-{suffix}";
            }

            return slug;
        }

        /// <summary>
        /// 删除文章。
        /// </summary>
        /// <param name="id">文章 ID。</param>
        /// <returns>删除成功返回 true；文章不存在返回 false。</returns>
        public async Task<bool> DeleteAsync(int id)
        {
            var article = await _context.Articles.FindAsync(id);
            if (article == null) return false;

            _context.Articles.Remove(article);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
