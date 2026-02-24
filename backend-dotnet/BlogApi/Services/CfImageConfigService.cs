using Microsoft.EntityFrameworkCore;
using BlogApi.Data;
using BlogApi.Models;
using BlogApi.DTOs;

namespace BlogApi.Services
{
    public class CfImageConfigService
    {
        private readonly BlogDbContext _context;

        public CfImageConfigService(BlogDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// 获取 Cloudflare 图片转换配置
        /// </summary>
        public async Task<CfImageConfig?> GetConfigAsync()
        {
            return await _context.CfImageConfigs.FirstOrDefaultAsync();
        }

        /// <summary>
        /// 保存或更新 Cloudflare 图片转换配置
        /// </summary>
        public async Task<CfImageConfig> SaveConfigAsync(CfImageConfigDto dto)
        {
            var config = await _context.CfImageConfigs.FirstOrDefaultAsync();
            if (config == null)
            {
                config = new CfImageConfig
                {
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.CfImageConfigs.Add(config);
            }

            config.IsEnabled = dto.IsEnabled;
            config.ZoneDomain = string.IsNullOrWhiteSpace(dto.ZoneDomain) ? null : dto.ZoneDomain.Trim();
            config.UseHttps = dto.UseHttps;
            config.Fit = string.IsNullOrWhiteSpace(dto.Fit) ? "scale-down" : dto.Fit.Trim();
            config.Width = dto.Width < 0 ? 300 : dto.Width;
            config.Quality = dto.Quality < 0 ? 50 : dto.Quality;
            config.Format = string.IsNullOrWhiteSpace(dto.Format) ? "webp" : dto.Format.Trim();
            config.SignatureParam = string.IsNullOrWhiteSpace(dto.SignatureParam) ? "sig" : dto.SignatureParam.Trim();
            config.UseWorker = dto.UseWorker;
            config.WorkerBaseUrl = string.IsNullOrWhiteSpace(dto.WorkerBaseUrl) ? null : dto.WorkerBaseUrl.Trim();
            config.TokenTtlSeconds = dto.TokenTtlSeconds <= 0 ? 3600 : dto.TokenTtlSeconds;
            config.SignatureToken = string.IsNullOrWhiteSpace(dto.SignatureToken) ? null : dto.SignatureToken.Trim();
            config.SignatureSecret = string.IsNullOrWhiteSpace(dto.SignatureSecret) ? null : dto.SignatureSecret.Trim();
            config.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return config;
        }
    }
}
