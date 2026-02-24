using System.Collections.Generic;
using BlogApi.DTOs;
using BlogApi.Models;
using Microsoft.AspNetCore.Http;

namespace BlogApi.Services.Beatmaps
{
    /// <summary>
    /// 负责上传参数、导入参数与外部配置的业务校验。
    /// </summary>
    public interface IBeatmapValidationService
    {
        void EnsureValidOszUpload(IFormFile oszFile);
        void EnsureValidImportRequest(BeatmapImportRequestDto dto);
        void EnsureImagebedConfigReady(ImagebedConfig? config);
        void EnsureHasManiaBeatmaps(IReadOnlyCollection<BeatmapParseResult> maniaResults);
        string BuildStorageKey(string? fileName);
    }
}
