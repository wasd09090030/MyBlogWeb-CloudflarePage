using Microsoft.EntityFrameworkCore;
using BlogApi.Data;
using BlogApi.DTOs;

namespace BlogApi.Services
{
    public class ImageAssetResolveService
    {
        private readonly BlogDbContext _context;
        private readonly ImageAssetUrlService _urlService;

        public ImageAssetResolveService(BlogDbContext context, ImageAssetUrlService urlService)
        {
            _context = context;
            _urlService = urlService;
        }

        public async Task<ImageAssetResolveDto?> ResolveAsync(string publicId)
        {
            if (!_urlService.IsValidPublicId(publicId)) return null;

            var asset = await _context.ImageAssets
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.PublicId == publicId && a.IsActive);

            if (asset == null) return null;

            return new ImageAssetResolveDto
            {
                PublicId = asset.PublicId,
                StorageKey = asset.StorageKey,
                SourceUrl = asset.SourceUrl,
                ContentType = asset.ContentType,
                Version = asset.Version
            };
        }
    }
}
