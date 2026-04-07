using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using BlogApi.Services;
using BlogApi.DTOs;
using BlogApi.Models;

namespace BlogApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CommentsController : ControllerBase
    {
        private readonly CommentService _commentService;

        /// <summary>
        /// 初始化评论控制器，注入评论业务服务。
        /// </summary>
        public CommentsController(CommentService commentService)
        {
            _commentService = commentService;
        }

        /// <summary>
        /// 创建一条新评论，并记录提交者 IP。
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<Comment>> Create([FromBody] CreateCommentDto dto)
        {
            var userIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var comment = await _commentService.CreateAsync(dto, userIp);
            return CreatedAtAction(nameof(GetByArticle), new { articleId = comment.ArticleId }, comment);
        }

        /// <summary>
        /// 获取指定文章下的评论列表。
        /// </summary>
        [HttpGet("article/{articleId}")]
        public async Task<ActionResult<List<Comment>>> GetByArticle(int articleId)
        {
            var comments = await _commentService.GetByArticleAsync(articleId);
            return Ok(comments);
        }

        /// <summary>
        /// 获取后台全部评论。
        /// </summary>
        [Authorize]
        [HttpGet("admin/all")]
        public async Task<ActionResult<List<Comment>>> GetAll()
        {
            var comments = await _commentService.GetAllAsync();
            return Ok(comments);
        }

        /// <summary>
        /// 获取后台待审核评论列表。
        /// </summary>
        [Authorize]
        [HttpGet("admin/pending")]
        public async Task<ActionResult<List<Comment>>> GetPending()
        {
            var comments = await _commentService.GetPendingAsync();
            return Ok(comments);
        }

        /// <summary>
        /// 更新指定评论的审核状态。
        /// </summary>
        [Authorize]
        [HttpPatch("admin/{id}/status")]
        public async Task<ActionResult<Comment>> UpdateStatus(int id, [FromBody] UpdateCommentStatusDto dto)
        {
            var comment = await _commentService.UpdateStatusAsync(id, dto);
            if (comment == null)
                return NotFound();

            return Ok(comment);
        }

        /// <summary>
        /// 为指定评论点赞。
        /// </summary>
        [HttpPost("{id}/like")]
        public async Task<ActionResult<Comment>> Like(int id)
        {
            var comment = await _commentService.LikeAsync(id);
            if (comment == null)
                return NotFound();

            return Ok(comment);
        }

        /// <summary>
        /// 删除指定评论。
        /// </summary>
        [Authorize]
        [HttpDelete("admin/{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _commentService.DeleteAsync(id);
            if (!result)
                return NotFound();

            return NoContent();
        }
    }
}
