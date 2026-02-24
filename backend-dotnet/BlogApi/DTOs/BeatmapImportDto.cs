using System.Collections.Generic;

namespace BlogApi.DTOs
{
    public class BeatmapImportRequestDto
    {
        public string? SourceFileName { get; set; }
        public string? StorageKey { get; set; }
        public string? UploadPath { get; set; }
        public List<BeatmapUploadedFileDto> UploadedFiles { get; set; } = new();
        public List<BeatmapOsuFileDto> OsuFiles { get; set; } = new();
    }

    public class BeatmapUploadedFileDto
    {
        public string Path { get; set; } = string.Empty;
        public string Src { get; set; } = string.Empty;
    }

    public class BeatmapOsuFileDto
    {
        public string Path { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
    }
}
