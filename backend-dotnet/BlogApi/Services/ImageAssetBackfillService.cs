using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using BlogApi.Data;
using BlogApi.DTOs;
using BlogApi.Models;

namespace BlogApi.Services
{
    public class ImageAssetBackfillService
    {
        private readonly BlogDbContext _context;
        private readonly IConfiguration _configuration;

        public ImageAssetBackfillService(BlogDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<int> BackfillArticleCoversAsync()
        {
            var articles = await _context.Articles
                .Where(a => a.CoverImageAssetId == null && a.CoverImage != null && a.CoverImage != "")
                .ToListAsync();

            var count = 0;
            foreach (var article in articles)
            {
                var assetId = await GetOrCreateArticleCoverAssetIdAsync(article.CoverImage);
                if (!assetId.HasValue) continue;

                article.CoverImageAssetId = assetId;
                article.UpdatedAt = DateTime.UtcNow;
                count++;
            }

            await _context.SaveChangesAsync();
            return count;
        }

        public async Task<GalleryImageAssetBackfillResultDto> BackfillGalleriesAsync()
        {
            var galleries = await _context.Galleries
                .Where(g => g.ImageAssetId == null)
                .ToListAsync();

            var result = new GalleryImageAssetBackfillResultDto
            {
                Total = galleries.Count
            };

            foreach (var gallery in galleries)
            {
                var assetId = await GetOrCreateImageAssetIdAsync(gallery.ImageUrl, ImageAssetKind.Gallery);
                if (!assetId.HasValue)
                {
                    result.Skipped++;
                    continue;
                }

                gallery.ImageAssetId = assetId;
                gallery.UpdatedAt = DateTime.UtcNow;
                result.Updated++;
            }

            await _context.SaveChangesAsync();
            return result;
        }

        public async Task<int?> GetOrCreateArticleCoverAssetIdAsync(string? coverImage)
        {
            return await GetOrCreateImageAssetIdAsync(coverImage, ImageAssetKind.ArticleCover);
        }

        public async Task<int?> GetOrCreateImageAssetIdAsync(string? imageUrl, ImageAssetKind kind)
        {
            if (string.IsNullOrWhiteSpace(imageUrl))
            {
                return null;
            }

            var normalizedImageUrl = imageUrl.Trim();
            var storageKey = ExtractStorageKey(normalizedImageUrl);
            if (string.IsNullOrWhiteSpace(storageKey))
            {
                return null;
            }

            if (!IsAllowedImageSource(normalizedImageUrl, storageKey))
            {
                return null;
            }

            var publicId = BuildPublicId(storageKey);
            var asset = await _context.ImageAssets.FirstOrDefaultAsync(a => a.PublicId == publicId);
            if (asset == null)
            {
                asset = new ImageAsset
                {
                    PublicId = publicId,
                    StorageKey = storageKey,
                    SourceUrl = normalizedImageUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase)
                        ? normalizedImageUrl
                        : null,
                    Kind = kind,
                    ContentType = GuessContentType(storageKey),
                    Version = 1,
                    IsActive = true
                };
                _context.ImageAssets.Add(asset);
                await _context.SaveChangesAsync();
            }

            return asset.Id;
        }

        private static string ExtractStorageKey(string coverImage)
        {
            if (Uri.TryCreate(coverImage, UriKind.Absolute, out var uri))
            {
                var path = uri.AbsolutePath.TrimStart('/');
                return path.StartsWith("file/", StringComparison.OrdinalIgnoreCase)
                    ? path.Substring("file/".Length)
                    : path;
            }

            return coverImage.TrimStart('/');
        }

        private bool IsAllowedImageSource(string imageUrl, string storageKey)
        {
            if (!Uri.TryCreate(imageUrl, UriKind.Absolute, out var uri))
            {
                return IsValidStorageKey(storageKey);
            }

            var configuredOrigin = _configuration["ImageAssets:AllowedSourceOrigin"];
            if (string.IsNullOrWhiteSpace(configuredOrigin) ||
                !Uri.TryCreate(configuredOrigin, UriKind.Absolute, out var allowedOrigin))
            {
                return true;
            }

            return string.Equals(uri.Scheme, allowedOrigin.Scheme, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(uri.Host, allowedOrigin.Host, StringComparison.OrdinalIgnoreCase) &&
                uri.Port == allowedOrigin.Port &&
                uri.AbsolutePath.StartsWith("/file/", StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsValidStorageKey(string storageKey)
        {
            return !storageKey.Contains("..", StringComparison.Ordinal) &&
                !storageKey.StartsWith("/", StringComparison.Ordinal) &&
                !storageKey.StartsWith("\\", StringComparison.Ordinal);
        }

        private static string BuildPublicId(string storageKey)
        {
            var hash = SHA256.HashData(Encoding.UTF8.GetBytes(storageKey));
            var token = Convert.ToBase64String(hash)
                .Replace("+", "-")
                .Replace("/", "_")
                .TrimEnd('=');
            return $"i_{token.Substring(0, 16)}";
        }

        private static string? GuessContentType(string storageKey)
        {
            var ext = Path.GetExtension(storageKey).ToLowerInvariant();
            return ext switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".webp" => "image/webp",
                ".gif" => "image/gif",
                ".avif" => "image/avif",
                _ => null
            };
        }
    }
}
