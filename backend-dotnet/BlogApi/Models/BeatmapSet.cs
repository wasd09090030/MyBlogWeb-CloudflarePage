using System;
using System.Collections.Generic;

namespace BlogApi.Models
{
    public class BeatmapSet
    {
        public int Id { get; set; }
        public string StorageKey { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Artist { get; set; } = string.Empty;
        public string Creator { get; set; } = string.Empty;
        public string? BackgroundFile { get; set; }
        public string? AudioFile { get; set; }
        public int? PreviewTime { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<BeatmapDifficulty> Difficulties { get; set; } = new();
    }
}
