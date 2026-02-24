using System;
using System.Collections.Generic;
using BlogApi.DTOs;
using BlogApi.Models;

namespace BlogApi.Services.Beatmaps
{
    /// <summary>
    /// osu 文件解析后的中间结构。
    /// 该结构在“解析 -> 映射”环节流转，避免业务层直接依赖原始文本格式。
    /// </summary>
    public class BeatmapParseResult
    {
        public Dictionary<string, string> General { get; } = new(StringComparer.OrdinalIgnoreCase);
        public Dictionary<string, string> Metadata { get; } = new(StringComparer.OrdinalIgnoreCase);
        public Dictionary<string, string> Difficulty { get; } = new(StringComparer.OrdinalIgnoreCase);
        public string OsuFileName { get; set; } = string.Empty;
        public bool IsMania { get; set; }
        public int Mode { get; set; }
        public string? Title { get; set; }
        public string? Artist { get; set; }
        public string? Creator { get; set; }
        public string? Version { get; set; }
        public string? AudioFile { get; set; }
        public string? BackgroundFile { get; set; }
        public int? PreviewTime { get; set; }
        public int? AudioLeadIn { get; set; }
        public int Columns { get; set; } = 4;
        public double OverallDifficulty { get; set; } = 5;
        public double? Bpm { get; set; }
        public List<TimingPointDto> TimingPoints { get; } = new();
        public List<ManiaNoteDto> Notes { get; } = new();
    }

    /// <summary>
    /// 写入 BeatmapDifficulty.DataJson 的序列化结构。
    /// </summary>
    public class ManiaBeatmapData
    {
        public int Columns { get; set; }
        public int? AudioLeadIn { get; set; }
        public int? PreviewTime { get; set; }
        public List<TimingPointDto> TimingPoints { get; set; } = new();
        public List<ManiaNoteDto> Notes { get; set; } = new();
    }

    /// <summary>
    /// 从文件名中提取的元信息。
    /// </summary>
    public class OszFileNameInfo
    {
        public DateTime? CreatedAt { get; set; }
        public string? Artist { get; set; }
        public string? Title { get; set; }
    }

    /// <summary>
    /// 映射阶段输出：包含谱面集合与其难度列表。
    /// </summary>
    public class BeatmapSetMappingResult
    {
        public BeatmapSet BeatmapSet { get; set; } = new();
        public List<BeatmapDifficulty> Difficulties { get; set; } = new();
    }
}
