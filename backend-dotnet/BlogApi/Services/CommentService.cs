using Microsoft.EntityFrameworkCore;
using BlogApi.Data;
using BlogApi.Models;
using BlogApi.DTOs;

namespace BlogApi.Services
{
    public class CommentService
    {
        private readonly BlogDbContext _context;

        public CommentService(BlogDbContext context)
        {
            _context = context;
        }

        public async Task<Comment> CreateAsync(CreateCommentDto dto, string userIp)
        {
            var comment = new Comment
            {
                Content = dto.Content,
                Author = dto.Author,
                Email = dto.Email,
                Website = dto.Website,
                ArticleId = dto.ArticleId,
                ParentId = dto.ParentId,
                UserIp = userIp,
                Status = "pending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Comments.Add(comment);
            await _context.SaveChangesAsync();
            return comment;
        }

        public async Task<List<Comment>> GetByArticleAsync(int articleId)
        {
            return await _context.Comments
                .Where(c => c.ArticleId == articleId && c.Status == "approved")
                .OrderBy(c => c.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<Comment>> GetAllAsync()
        {
            return await _context.Comments
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<Comment>> GetPendingAsync()
        {
            return await _context.Comments
                .Where(c => c.Status == "pending")
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();
        }

        public async Task<Comment?> UpdateStatusAsync(int id, UpdateCommentStatusDto dto)
        {
            var comment = await _context.Comments.FindAsync(id);
            if (comment == null) return null;

            comment.Status = dto.Status;
            comment.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return comment;
        }

        public async Task<Comment?> LikeAsync(int id)
        {
            var comment = await _context.Comments.FindAsync(id);
            if (comment == null) return null;

            comment.Likes++;
            await _context.SaveChangesAsync();
            return comment;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var comment = await _context.Comments.FindAsync(id);
            if (comment == null) return false;

            _context.Comments.Remove(comment);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
