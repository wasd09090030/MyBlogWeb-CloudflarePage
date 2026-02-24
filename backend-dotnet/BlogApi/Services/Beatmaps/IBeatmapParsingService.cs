using System.Collections.Generic;
using BlogApi.DTOs;

namespace BlogApi.Services.Beatmaps
{
    /// <summary>
    /// 负责将 .osu 原始文本解析为可落库的中间模型。
    /// </summary>
    public interface IBeatmapParsingService
    {
        IReadOnlyList<BeatmapParseResult> ParseManiaFromExtractedDirectory(string setRoot);
        IReadOnlyList<BeatmapParseResult> ParseManiaFromImport(IEnumerable<BeatmapOsuFileDto> osuFiles, IReadOnlyDictionary<string, string> uploadedFiles);
    }
}
