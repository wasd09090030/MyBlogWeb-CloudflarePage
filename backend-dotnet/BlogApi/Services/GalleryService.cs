using Microsoft.EntityFrameworkCore;
using BlogApi.Data;
using BlogApi.Models;
using BlogApi.DTOs;
using SixLabors.ImageSharp;

namespace BlogApi.Services
{
    /// <summary>
    /// 画廊领域服务。
    /// 负责画廊数据 CRUD、排序/启用状态管理、缩略图 URL 生成与图片尺寸探测。
    /// </summary>
    public class GalleryService
    {
        private readonly BlogDbContext _context;
        private readonly HttpClient _httpClient;
        private readonly ILogger<GalleryService> _logger;
        private readonly ImageAssetBackfillService _imageAssetBackfillService;
        private readonly ImageAssetUrlService _imageAssetUrlService;

        /// <summary>
        /// 初始化 <see cref="GalleryService"/>。
        /// 使用独立 HttpClient 读取远程图片头/流信息，避免阻塞主业务请求。
        /// </summary>
        public GalleryService(
            BlogDbContext context,
            IHttpClientFactory httpClientFactory,
            ILogger<GalleryService> logger,
            ImageAssetBackfillService imageAssetBackfillService,
            ImageAssetUrlService imageAssetUrlService)
        {
            _context = context;
            _httpClient = httpClientFactory.CreateClient();
            _httpClient.Timeout = TimeSpan.FromSeconds(10);
            _logger = logger;
            _imageAssetBackfillService = imageAssetBackfillService;
            _imageAssetUrlService = imageAssetUrlService;
        }

        /// <summary>
        /// 获取全部启用中的画廊项，并补齐缩略图地址。
        /// </summary>
        public async Task<List<Gallery>> GetAllActiveAsync()
        {
            var galleries = await _context.Galleries
                .Include(g => g.ImageAsset)
                .Where(g => g.IsActive)
                .OrderBy(g => g.SortOrder)
                .ToListAsync();

            ApplyThumbnailUrls(galleries);
            return galleries;
        }

        /// <summary>
        /// 获取全部画廊项（含禁用项），并补齐缩略图地址。
        /// </summary>
        public async Task<List<Gallery>> GetAllAsync()
        {
            var galleries = await _context.Galleries
                .Include(g => g.ImageAsset)
                .OrderBy(g => g.SortOrder)
                .ToListAsync();

            ApplyThumbnailUrls(galleries);
            return galleries;
        }

        /// <summary>
        /// 按 ID 获取画廊项，并补齐缩略图地址。
        /// </summary>
        public async Task<Gallery?> GetByIdAsync(int id)
        {
            var gallery = await _context.Galleries
                .Include(g => g.ImageAsset)
                .FirstOrDefaultAsync(g => g.Id == id);
            if (gallery != null)
            {
                ApplyThumbnailUrl(gallery);
            }
            return gallery;
        }

        /// <summary>
        /// 创建画廊项。
        /// 未显式提供排序时自动追加到末尾，并尝试探测图片宽高。
        /// </summary>
        public async Task<Gallery> CreateAsync(CreateGalleryDto dto)
        {
            // 如果未指定排序，自动分配到最后
            var maxSortOrder = await _context.Galleries.AnyAsync() 
                ? await _context.Galleries.MaxAsync(g => g.SortOrder) 
                : -1;
            
            var gallery = new Gallery
            {
                ImageUrl = dto.ImageUrl.Trim(),
                ImageAssetId = await _imageAssetBackfillService
                    .GetOrCreateImageAssetIdAsync(dto.ImageUrl, ImageAssetKind.Gallery),
                SortOrder = dto.SortOrder > 0 ? dto.SortOrder : maxSortOrder + 1,
                IsActive = dto.IsActive,
                Tag = string.IsNullOrWhiteSpace(dto.Tag) ? "artwork" : dto.Tag.Trim(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var (width, height) = await TryFetchImageSizeAsync(gallery.ImageUrl);
            gallery.ImageWidth = width;
            gallery.ImageHeight = height;

            _context.Galleries.Add(gallery);
            await _context.SaveChangesAsync();
            await LoadImageAssetAsync(gallery);
            ApplyThumbnailUrl(gallery);
            return gallery;
        }

        /// <summary>
        /// 批量补齐缩略图地址。
        /// </summary>
        private void ApplyThumbnailUrls(List<Gallery> galleries)
        {
            if (galleries.Count == 0) return;
            foreach (var gallery in galleries)
            {
                gallery.ThumbnailUrl = _imageAssetUrlService.BuildThumbnailUrl(gallery.ImageAsset);
            }
        }

        /// <summary>
        /// 补齐单条缩略图地址。
        /// </summary>
        private void ApplyThumbnailUrl(Gallery gallery)
        {
            gallery.ThumbnailUrl = _imageAssetUrlService.BuildThumbnailUrl(gallery.ImageAsset);
        }

        /// <summary>
        /// 更新画廊项。
        /// 当图片地址变化时重新探测尺寸并刷新缩略图地址。
        /// </summary>
        public async Task<Gallery?> UpdateAsync(int id, UpdateGalleryDto dto)
        {
            var gallery = await _context.Galleries
                .Include(g => g.ImageAsset)
                .FirstOrDefaultAsync(g => g.Id == id);
            if (gallery == null) return null;

            if (dto.ImageUrl != null)
            {
                gallery.ImageUrl = dto.ImageUrl.Trim();
                gallery.ImageAssetId = await _imageAssetBackfillService
                    .GetOrCreateImageAssetIdAsync(dto.ImageUrl, ImageAssetKind.Gallery);
                var (width, height) = await TryFetchImageSizeAsync(gallery.ImageUrl);
                gallery.ImageWidth = width;
                gallery.ImageHeight = height;
            }
            if (dto.SortOrder.HasValue) gallery.SortOrder = dto.SortOrder.Value;
            if (dto.IsActive.HasValue) gallery.IsActive = dto.IsActive.Value;
            if (dto.Tag != null)
            {
                gallery.Tag = string.IsNullOrWhiteSpace(dto.Tag) ? "artwork" : dto.Tag.Trim();
            }
            if (dto.CreatedAt.HasValue) gallery.CreatedAt = dto.CreatedAt.Value;

            gallery.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await LoadImageAssetAsync(gallery);
            ApplyThumbnailUrl(gallery);
            return gallery;
        }

        /// <summary>
        /// 删除画廊项。
        /// </summary>
        public async Task<bool> DeleteAsync(int id)
        {
            var gallery = await _context.Galleries.FindAsync(id);
            if (gallery == null) return false;

            _context.Galleries.Remove(gallery);
            await _context.SaveChangesAsync();
            return true;
        }

        /// <summary>
        /// 批量更新排序。
        /// </summary>
        public async Task<bool> UpdateSortOrderAsync(List<UpdateSortOrderDto> updates)
        {
            foreach (var update in updates)
            {
                var gallery = await _context.Galleries.FindAsync(update.Id);
                if (gallery != null)
                {
                    gallery.SortOrder = update.SortOrder;
                    gallery.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }

        /// <summary>
        /// 切换单条画廊启用状态。
        /// </summary>
        public async Task<Gallery?> ToggleActiveAsync(int id)
        {
            var gallery = await _context.Galleries.FindAsync(id);
            if (gallery == null) return null;

            gallery.IsActive = !gallery.IsActive;
            gallery.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return gallery;
        }

        /// <summary>
        /// 批量导入画廊项。
        /// 空 URL 会被跳过，排序从当前末尾连续追加。
        /// </summary>
        public async Task<List<Gallery>> BatchImportAsync(BatchImportGalleryDto dto)
        {
            var maxSortOrder = await _context.Galleries.AnyAsync() 
                ? await _context.Galleries.MaxAsync(g => g.SortOrder) 
                : -1;

            var galleries = new List<Gallery>();
            var sortOrder = maxSortOrder + 1;

            foreach (var imageUrl in dto.ImageUrls)
            {
                if (string.IsNullOrWhiteSpace(imageUrl)) continue;

                var trimmedUrl = imageUrl.Trim();
                var gallery = new Gallery
                {
                    ImageUrl = trimmedUrl,
                    ImageAssetId = await _imageAssetBackfillService
                        .GetOrCreateImageAssetIdAsync(trimmedUrl, ImageAssetKind.Gallery),
                    SortOrder = sortOrder++,
                    IsActive = dto.IsActive,
                    Tag = string.IsNullOrWhiteSpace(dto.Tag) ? "artwork" : dto.Tag.Trim(),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                var (width, height) = await TryFetchImageSizeAsync(trimmedUrl);
                gallery.ImageWidth = width;
                gallery.ImageHeight = height;

                galleries.Add(gallery);
            }

            if (galleries.Any())
            {
                _context.Galleries.AddRange(galleries);
                await _context.SaveChangesAsync();
                foreach (var gallery in galleries)
                {
                    await LoadImageAssetAsync(gallery);
                }
            }

            ApplyThumbnailUrls(galleries);
            return galleries;
        }

        private async Task LoadImageAssetAsync(Gallery gallery)
        {
            if (!gallery.ImageAssetId.HasValue)
            {
                gallery.ImageAsset = null;
                return;
            }

            gallery.ImageAsset = await _context.ImageAssets
                .FirstOrDefaultAsync(asset => asset.Id == gallery.ImageAssetId.Value);
        }

        /// <summary>
        /// 批量刷新全量画廊图片尺寸。
        /// 返回总数、成功与失败统计。
        /// </summary>
        public async Task<GalleryRefreshResultDto> RefreshAllDimensionsAsync()
        {
            var galleries = await _context.Galleries
                .OrderBy(g => g.Id)
                .ToListAsync();

            var updated = 0;
            var failed = 0;

            foreach (var gallery in galleries)
            {
                var (width, height) = await TryFetchImageSizeAsync(gallery.ImageUrl);
                if (width.HasValue && height.HasValue)
                {
                    gallery.ImageWidth = width;
                    gallery.ImageHeight = height;
                    gallery.UpdatedAt = DateTime.UtcNow;
                    updated++;
                }
                else
                {
                    failed++;
                }
            }

            if (updated > 0)
            {
                await _context.SaveChangesAsync();
            }

            return new GalleryRefreshResultDto
            {
                Total = galleries.Count,
                Updated = updated,
                Failed = failed
            };
        }

        /// <summary>
        /// 尝试读取远程图片尺寸。
        /// 任何网络/格式异常都只记录日志并返回 null，避免影响主流程。
        /// </summary>
        private async Task<(int? Width, int? Height)> TryFetchImageSizeAsync(string imageUrl)
        {
            if (string.IsNullOrWhiteSpace(imageUrl)) return (null, null);
            if (!Uri.TryCreate(imageUrl, UriKind.Absolute, out var uri)) return (null, null);

            try
            {
                using var response = await _httpClient.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("获取图片失败: {StatusCode} {Url}", response.StatusCode, imageUrl);
                    return (null, null);
                }

                var mediaType = response.Content.Headers.ContentType?.MediaType;
                if (mediaType != null && !mediaType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning("URL 返回内容非图片类型: {MediaType} {Url}", mediaType, imageUrl);
                    return (null, null);
                }

                var contentLength = response.Content.Headers.ContentLength;
                // 仅做轻量探测，超大图片直接跳过以控制内存和等待时间。
                if (contentLength.HasValue && contentLength.Value > 20 * 1024 * 1024)
                {
                    _logger.LogWarning("图片过大，跳过解析: {ContentLength} {Url}", contentLength.Value, imageUrl);
                    return (null, null);
                }

                await using var stream = await response.Content.ReadAsStreamAsync();
                var info = await Image.IdentifyAsync(stream);
                if (info == null)
                {
                    _logger.LogWarning("无法识别图片信息: {Url}", imageUrl);
                    return (null, null);
                }

                return (info.Width, info.Height);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "解析图片尺寸失败: {Url}", imageUrl);
                return (null, null);
            }
        }
    }
}
