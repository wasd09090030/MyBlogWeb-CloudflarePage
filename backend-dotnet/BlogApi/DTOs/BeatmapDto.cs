using System.Collections.Generic;

namespace BlogApi.DTOs
{
    public class BeatmapSetDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Artist { get; set; } = string.Empty;
        public string Creator { get; set; } = string.Empty;
        public string? BackgroundUrl { get; set; }
        public string? AudioUrl { get; set; }
        public int? PreviewTime { get; set; }
        public List<BeatmapDifficultyDto> Difficulties { get; set; } = new();
    }

    public class BeatmapDifficultyDto
    {
        public int Id { get; set; }
        public int BeatmapSetId { get; set; }
        public string Version { get; set; } = string.Empty;
        public int Mode { get; set; }
        public int Columns { get; set; }
        public double OverallDifficulty { get; set; }
        public double? Bpm { get; set; }
        public int NoteCount { get; set; }
    }

    public class BeatmapDataDto
    {
        public int Id { get; set; }
        public int BeatmapSetId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Artist { get; set; } = string.Empty;
        public string Creator { get; set; } = string.Empty;
        public string Version { get; set; } = string.Empty;
        public int Columns { get; set; }
        public double OverallDifficulty { get; set; }
        public double? Bpm { get; set; }
        public int? PreviewTime { get; set; }
        public int? AudioLeadIn { get; set; }
        public string? BackgroundUrl { get; set; }
        public string? AudioUrl { get; set; }
        public List<TimingPointDto> TimingPoints { get; set; } = new();
        public List<ManiaNoteDto> Notes { get; set; } = new();
    }

    public class TimingPointDto
    {
        public int Time { get; set; }
        public double BeatLength { get; set; }
        public int Meter { get; set; }
        public bool Uninherited { get; set; }
    }

    public class ManiaNoteDto
    {
        public int Time { get; set; }
        public int Column { get; set; }
        public int? EndTime { get; set; }
    }

    public class BeatmapUploadResultDto
    {
        public BeatmapSetDto? BeatmapSet { get; set; }
        public string? Warning { get; set; }
    }
}
