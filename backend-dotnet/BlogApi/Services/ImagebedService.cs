using Microsoft.EntityFrameworkCore;
using BlogApi.Data;
using BlogApi.Models;
using BlogApi.DTOs;

namespace BlogApi.Services
{
    public class ImagebedService
    {
        private readonly BlogDbContext _context;

        public ImagebedService(BlogDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// 获取图床配置
        /// </summary>
        public async Task<ImagebedConfig?> GetConfigAsync()
        {
            return await _context.ImagebedConfigs.FirstOrDefaultAsync();
        }

        /// <summary>
        /// 保存或更新图床配置
        /// </summary>
        public async Task<ImagebedConfig> SaveConfigAsync(ImagebedConfigDto dto)
        {
            var config = await _context.ImagebedConfigs.FirstOrDefaultAsync();
            
            if (config == null)
            {
                // 创建新配置
                config = new ImagebedConfig
                {
                    Domain = dto.Domain,
                    ApiToken = dto.ApiToken,
                    UploadFolder = dto.UploadFolder,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.ImagebedConfigs.Add(config);
            }
            else
            {
                // 更新现有配置
                config.Domain = dto.Domain;
                config.ApiToken = dto.ApiToken;
                config.UploadFolder = dto.UploadFolder;
                config.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return config;
        }
    }
}
