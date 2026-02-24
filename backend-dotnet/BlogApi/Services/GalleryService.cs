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

        /// <summary>
        /// 初始化 <see cref="GalleryService"/>。
        /// 使用独立 HttpClient 读取远程图片头/流信息，避免阻塞主业务请求。
        /// </summary>
        public GalleryService(BlogDbContext context, IHttpClientFactory httpClientFactory, ILogger<GalleryService> logger)
        {
            _context = context;
            _httpClient = httpClientFactory.CreateClient();
            _httpClient.Timeout = TimeSpan.FromSeconds(10);
            _logger = logger;
        }

        /// <summary>
        /// 获取全部启用中的画廊项，并补齐缩略图地址。
        /// </summary>
        public async Task<List<Gallery>> GetAllActiveAsync()
        {
            var galleries = await _context.Galleries
                .Where(g => g.IsActive)
                .OrderBy(g => g.SortOrder)
                .ToListAsync();

            await ApplyThumbnailUrlsAsync(galleries);
            return galleries;
        }

        /// <summary>
        /// 获取全部画廊项（含禁用项），并补齐缩略图地址。
        /// </summary>
        public async Task<List<Gallery>> GetAllAsync()
        {
            var galleries = await _context.Galleries
                .OrderBy(g => g.SortOrder)
                .ToListAsync();

            await ApplyThumbnailUrlsAsync(galleries);
            return galleries;
        }

        /// <summary>
        /// 按 ID 获取画廊项，并补齐缩略图地址。
        /// </summary>
        public async Task<Gallery?> GetByIdAsync(int id)
        {
            var gallery = await _context.Galleries.FindAsync(id);
            if (gallery != null)
            {
                await ApplyThumbnailUrlAsync(gallery);
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
            await ApplyThumbnailUrlAsync(gallery);
            return gallery;
        }

        /// <summary>
        /// 批量补齐缩略图地址。
        /// </summary>
        private async Task ApplyThumbnailUrlsAsync(List<Gallery> galleries)
        {
            if (galleries.Count == 0) return;
            var config = await _context.CfImageConfigs.AsNoTracking().FirstOrDefaultAsync();
            foreach (var gallery in galleries)
            {
                gallery.ThumbnailUrl = BuildThumbnailUrl(gallery.ImageUrl, config);
            }
        }

        /// <summary>
        /// 补齐单条缩略图地址。
        /// </summary>
        private async Task ApplyThumbnailUrlAsync(Gallery gallery)
        {
            var config = await _context.CfImageConfigs.AsNoTracking().FirstOrDefaultAsync();
            gallery.ThumbnailUrl = BuildThumbnailUrl(gallery.ImageUrl, config);
        }

        /// <summary>
        /// 根据配置生成缩略图 URL。
        /// 配置缺失、关闭或 URL 非法时回退原图地址。
        /// </summary>
        private string? BuildThumbnailUrl(string imageUrl, CfImageConfig? config)
        {
            if (string.IsNullOrWhiteSpace(imageUrl)) return null;
            if (config == null || !config.IsEnabled) return imageUrl;
            if (!Uri.TryCreate(imageUrl, UriKind.Absolute, out var sourceUri)) return imageUrl;

            if (config.UseWorker)
            {
                // Worker 生成失败时回退原图，保证前台至少可展示。
                var workerUrl = BuildWorkerThumbnailUrl(sourceUri, config);
                return string.IsNullOrWhiteSpace(workerUrl) ? imageUrl : workerUrl;
            }

            return BuildCdnThumbnailUrl(sourceUri, imageUrl, config);
        }

        /// <summary>
        /// 生成 Cloudflare Image Resizing（cdn-cgi）风格缩略图 URL。
        /// </summary>
        private string? BuildCdnThumbnailUrl(Uri sourceUri, string imageUrl, CfImageConfig config)
        {
            string? baseHost = null;
            string? zoneScheme = null;
            if (!string.IsNullOrWhiteSpace(config.ZoneDomain))
            {
                var trimmedZone = config.ZoneDomain.Trim();
                if (Uri.TryCreate(trimmedZone, UriKind.Absolute, out var zoneUri))
                {
                    baseHost = zoneUri.Host;
                    zoneScheme = zoneUri.Scheme;
                }
                else
                {
                    baseHost = trimmedZone;
                }
            }

            baseHost ??= sourceUri.Host;

            var scheme = config.UseHttps
                ? "https"
                : (string.IsNullOrWhiteSpace(zoneScheme) ? sourceUri.Scheme : zoneScheme);

            var options = new List<string>();
            if (!string.IsNullOrWhiteSpace(config.Fit)) options.Add($"fit={config.Fit}");
            if (config.Width > 0) options.Add($"width={config.Width}");
            if (config.Quality > 0) options.Add($"quality={config.Quality}");
            if (!string.IsNullOrWhiteSpace(config.Format)) options.Add($"format={config.Format}");

            var optionString = options.Count > 0 ? string.Join(',', options) : "";

            var baseUrl = $"{scheme}://{baseHost}/cdn-cgi/image/{optionString}/{imageUrl}";
            // 可选签名：支持 HMAC secret 或固定 token。
            var signature = BuildSignature(optionString, imageUrl, config);
            if (!string.IsNullOrWhiteSpace(signature))
            {
                baseUrl = baseUrl.Contains('?') ? $"{baseUrl}&{signature}" : $"{baseUrl}?{signature}";
            }

            return baseUrl;
        }

        /// <summary>
        /// 生成 Worker 缩略图 URL（带过期时间与签名）。
        /// </summary>
        private string? BuildWorkerThumbnailUrl(Uri sourceUri, CfImageConfig config)
        {
            if (string.IsNullOrWhiteSpace(config.WorkerBaseUrl)) return null;
            if (string.IsNullOrWhiteSpace(config.SignatureSecret)) return null;

            var baseUrl = config.WorkerBaseUrl.Trim().TrimEnd('/');

            var path = sourceUri.AbsolutePath;
            if (path.StartsWith("/file/", StringComparison.OrdinalIgnoreCase))
            {
                path = path.Substring("/file/".Length);
            }
            else
            {
                // 非 /file/ 前缀时仍尝试按绝对路径去掉 leading slash。
                path = path.TrimStart('/');
            }

            if (string.IsNullOrWhiteSpace(path)) return null;

            var width = config.Width > 0 ? config.Width : 300;
            var quality = config.Quality > 0 ? config.Quality : 50;
            var format = string.IsNullOrWhiteSpace(config.Format) ? "webp" : config.Format;
            var fit = string.IsNullOrWhiteSpace(config.Fit) ? "scale-down" : config.Fit;
            var ttl = config.TokenTtlSeconds > 0 ? config.TokenTtlSeconds : 3600;
            var exp = DateTimeOffset.UtcNow.ToUnixTimeSeconds() + ttl;

            var data = $"{path}|{width}|{quality}|{format}|{fit}|{exp}";
            var sig = BuildHmacSignature(data, config.SignatureSecret);
            if (string.IsNullOrWhiteSpace(sig)) return null;

            var param = string.IsNullOrWhiteSpace(config.SignatureParam) ? "sig" : config.SignatureParam.Trim();

            return $"{baseUrl}/thumb/{path}?w={width}&q={quality}&fmt={format}&fit={fit}&exp={exp}&{param}={sig}";
        }

        /// <summary>
        /// 生成签名参数字符串。
        /// 优先 secret(HMAC)；未提供 secret 时回退静态 token。
        /// </summary>
        private string? BuildSignature(string optionString, string imageUrl, CfImageConfig config)
        {
            if (!string.IsNullOrWhiteSpace(config.SignatureSecret))
            {
                var param = string.IsNullOrWhiteSpace(config.SignatureParam) ? "sig" : config.SignatureParam.Trim();
                var data = $"{optionString}|{imageUrl}";
                var sig = BuildHmacSignature(data, config.SignatureSecret);
                return $"{param}={sig}";
            }

            if (!string.IsNullOrWhiteSpace(config.SignatureToken))
            {
                var param = string.IsNullOrWhiteSpace(config.SignatureParam) ? "sig" : config.SignatureParam.Trim();
                return $"{param}={config.SignatureToken}";
            }

            return null;
        }

        /// <summary>
        /// 计算 HMAC-SHA256 签名，输出小写十六进制。
        /// </summary>
        private string? BuildHmacSignature(string data, string secret)
        {
            using var hmac = new System.Security.Cryptography.HMACSHA256(System.Text.Encoding.UTF8.GetBytes(secret));
            var hash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(data));
            return Convert.ToHexString(hash).ToLowerInvariant();
        }

        /// <summary>
        /// 更新画廊项。
        /// 当图片地址变化时重新探测尺寸并刷新缩略图地址。
        /// </summary>
        public async Task<Gallery?> UpdateAsync(int id, UpdateGalleryDto dto)
        {
            var gallery = await _context.Galleries.FindAsync(id);
            if (gallery == null) return null;

            if (dto.ImageUrl != null)
            {
                gallery.ImageUrl = dto.ImageUrl.Trim();
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
            await ApplyThumbnailUrlAsync(gallery);
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
            }

            await ApplyThumbnailUrlsAsync(galleries);
            return galleries;
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
