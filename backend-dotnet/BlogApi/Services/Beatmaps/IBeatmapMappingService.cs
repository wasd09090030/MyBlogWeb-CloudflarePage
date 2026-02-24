using System.Collections.Generic;
using BlogApi.DTOs;
using BlogApi.Models;

namespace BlogApi.Services.Beatmaps
{
    /// <summary>
    /// 负责将解析结果转换为数据库实体，以及处理与路径映射相关的规则。
    /// </summary>
    public interface IBeatmapMappingService
    {
        Dictionary<string, string> NormalizeUploadedFileMap(IEnumerable<BeatmapUploadedFileDto>? uploadedFiles);
        BeatmapSetMappingResult BuildSetAndDifficulties(
            IReadOnlyList<BeatmapParseResult> maniaResults,
            string sourceFileName,
            string storageKey,
            IReadOnlyDictionary<string, string> uploadedFiles);

        string NormalizeRelativePath(string path);
        string BuildUploadRoot(string? baseFolder, string storageKey);
        string CombineUploadFolder(string root, string relativeDir);
        string? MapUploadedSrc(IReadOnlyDictionary<string, string> uploaded, string? relativePath);
        string ResolveBeatmapFolderPath(BeatmapSet set, ImagebedConfig config);
    }
}
