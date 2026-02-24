using System;

namespace BlogApi.Models
{
    public class BeatmapDifficulty
    {
        public int Id { get; set; }
        public int BeatmapSetId { get; set; }
        public BeatmapSet? BeatmapSet { get; set; }
        public string Version { get; set; } = string.Empty;
        public int Mode { get; set; }
        public int Columns { get; set; }
        public double OverallDifficulty { get; set; }
        public double? Bpm { get; set; }
        public string OsuFileName { get; set; } = string.Empty;
        public string DataJson { get; set; } = string.Empty;
        public int NoteCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
