using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using BlogApi.Services;
using BlogApi.DTOs;
using BlogApi.Models;

namespace BlogApi.Controllers
{
    /// <summary>
    /// 文章管理接口。
    /// 提供文章创建、查询、搜索、更新与删除等能力。
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class ArticlesController : ControllerBase
    {
        private readonly ArticleService _articleService;

        /// <summary>
        /// 初始化 <see cref="ArticlesController"/>。
        /// </summary>
        /// <param name="articleService">文章业务服务。</param>
        public ArticlesController(ArticleService articleService)
        {
            _articleService = articleService;
        }

        /// <summary>
        /// 创建文章。
        /// </summary>
        /// <param name="dto">创建文章所需数据。</param>
        /// <returns>创建成功后的文章实体。</returns>
        [Authorize]  // 需要登录才能创建文章
        [HttpPost]
        public async Task<ActionResult<Article>> Create([FromBody] CreateArticleDto dto)
        {
            var article = await _articleService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = article.Id }, article);
        }

        /// <summary>
        /// 获取文章列表。
        /// 可通过参数控制分类过滤、分页与摘要模式。
        /// </summary>
        /// <param name="category">可选分类过滤。</param>
        /// <param name="page">可选页码（从 1 开始）。</param>
        /// <param name="limit">可选每页条数。</param>
        /// <param name="summary">是否返回摘要数据结构。</param>
        /// <returns>文章列表或分页对象。</returns>
        [HttpGet]
        public async Task<ActionResult<object>> GetAll(
            [FromQuery] ArticleCategory? category = null,
            [FromQuery] int? page = null,
            [FromQuery] int? limit = null,
            [FromQuery] bool summary = false)
        {
            // 优先级 1：summary=true 时直接走摘要接口（可叠加 category/page/limit）。
            if (summary)
            {
                var summaries = await _articleService.GetAllSummaryAsync(category, page, limit);
                return Ok(summaries);
            }

            // 优先级 2：只要出现分页参数，就返回分页结构。
            if (page.HasValue || limit.HasValue)
            {
                var paginated = await _articleService.GetWithPaginationAsync(category, page, limit);
                return Ok(paginated);
            }

            // 优先级 3：无分页时按分类返回完整文章列表。
            if (category.HasValue)
            {
                var articles = await _articleService.GetByCategoryAsync(category.Value);
                return Ok(articles);
            }

            // 默认：返回全部完整文章。
            var allArticles = await _articleService.GetAllAsync();
            return Ok(allArticles);
        }

        /// <summary>
        /// 获取推荐文章。
        /// 推荐结果由服务端按随机策略选取。
        /// </summary>
        /// <param name="limit">返回数量上限。</param>
        /// <returns>推荐文章列表。</returns>
        [HttpGet("featured")]
        public async Task<ActionResult<List<Article>>> GetFeatured([FromQuery] int limit = 5)
        {
            var articles = await _articleService.GetFeaturedAsync(limit);
            return Ok(articles);
        }

        /// <summary>
        /// 按关键词搜索文章。
        /// 匹配范围包含标题、HTML 内容与 Markdown 内容。
        /// </summary>
        /// <param name="keyword">搜索关键词。</param>
        /// <returns>最多 50 条摘要结果。</returns>
        [HttpGet("search")]
        public async Task<ActionResult<List<ArticleSummaryDto>>> Search(
            [FromQuery] string keyword)
        {
            // 入参兜底，避免把空关键词传到服务层触发全表模糊匹配。
            if (string.IsNullOrWhiteSpace(keyword))
                return BadRequest("搜索关键词不能为空");

            var results = await _articleService.SearchAsync(keyword);
            return Ok(results);
        }

        /// <summary>
        /// 获取指定分类的全部文章。
        /// </summary>
        /// <param name="category">文章分类。</param>
        /// <returns>分类下文章列表。</returns>
        [HttpGet("category/{category}")]
        public async Task<ActionResult<List<Article>>> GetByCategory(ArticleCategory category)
        {
            var articles = await _articleService.GetByCategoryAsync(category);
            return Ok(articles);
        }

        /// <summary>
        /// 根据 ID 获取单篇文章。
        /// </summary>
        /// <param name="id">文章 ID。</param>
        /// <returns>文章详情，不存在则返回 404。</returns>
        [HttpGet("{id}")]
        public async Task<ActionResult<Article>> GetById(int id)
        {
            var article = await _articleService.GetByIdAsync(id);
            if (article == null)
                return NotFound();

            return Ok(article);
        }

        /// <summary>
        /// 更新指定文章。
        /// </summary>
        /// <param name="id">文章 ID。</param>
        /// <param name="dto">更新字段。</param>
        /// <returns>更新后的文章，不存在则返回 404。</returns>
        [Authorize]  // 需要登录才能更新文章
        [HttpPut("{id}")]
        public async Task<ActionResult<Article>> Update(int id, [FromBody] UpdateArticleDto dto)
        {
            var article = await _articleService.UpdateAsync(id, dto);
            if (article == null)
                return NotFound();

            return Ok(article);
        }

        /// <summary>
        /// 删除指定文章。
        /// </summary>
        /// <param name="id">文章 ID。</param>
        /// <returns>删除成功返回 204，不存在返回 404。</returns>
        [Authorize]  // 需要登录才能删除文章
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _articleService.DeleteAsync(id);
            if (!result)
                return NotFound();

            return NoContent();
        }
    }
}
