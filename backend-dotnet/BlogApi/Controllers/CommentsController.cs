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

        public CommentsController(CommentService commentService)
        {
            _commentService = commentService;
        }

        [HttpPost]
        public async Task<ActionResult<Comment>> Create([FromBody] CreateCommentDto dto)
        {
            var userIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var comment = await _commentService.CreateAsync(dto, userIp);
            return CreatedAtAction(nameof(GetByArticle), new { articleId = comment.ArticleId }, comment);
        }

        [HttpGet("article/{articleId}")]
        public async Task<ActionResult<List<Comment>>> GetByArticle(int articleId)
        {
            var comments = await _commentService.GetByArticleAsync(articleId);
            return Ok(comments);
        }

        [Authorize]
        [HttpGet("admin/all")]
        public async Task<ActionResult<List<Comment>>> GetAll()
        {
            var comments = await _commentService.GetAllAsync();
            return Ok(comments);
        }

        [Authorize]
        [HttpGet("admin/pending")]
        public async Task<ActionResult<List<Comment>>> GetPending()
        {
            var comments = await _commentService.GetPendingAsync();
            return Ok(comments);
        }

        [Authorize]
        [HttpPatch("admin/{id}/status")]
        public async Task<ActionResult<Comment>> UpdateStatus(int id, [FromBody] UpdateCommentStatusDto dto)
        {
            var comment = await _commentService.UpdateStatusAsync(id, dto);
            if (comment == null)
                return NotFound();

            return Ok(comment);
        }

        [HttpPost("{id}/like")]
        public async Task<ActionResult<Comment>> Like(int id)
        {
            var comment = await _commentService.LikeAsync(id);
            if (comment == null)
                return NotFound();

            return Ok(comment);
        }

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
