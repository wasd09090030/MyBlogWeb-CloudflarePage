using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.Json;
using BlogApi.DTOs;
using BlogApi.Models;

namespace BlogApi.Services.Beatmaps
{
    /// <summary>
    /// 映射服务：
    /// - 将解析结果映射为 BeatmapSet / BeatmapDifficulty 实体
    /// - 统一维护路径标准化、上传目录拼接、图床路径反推等规则
    /// </summary>
    public class BeatmapMappingService : IBeatmapMappingService
    {
        public Dictionary<string, string> NormalizeUploadedFileMap(IEnumerable<BeatmapUploadedFileDto>? uploadedFiles)
        {
            var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (uploadedFiles == null)
            {
                return result;
            }

            foreach (var file in uploadedFiles)
            {
                if (string.IsNullOrWhiteSpace(file.Path) || string.IsNullOrWhiteSpace(file.Src))
                {
                    continue;
                }

                var normalizedPath = NormalizeRelativePath(file.Path).TrimStart('/');
                result[normalizedPath] = file.Src;
            }

            return result;
        }

        public BeatmapSetMappingResult BuildSetAndDifficulties(
            IReadOnlyList<BeatmapParseResult> maniaResults,
            string sourceFileName,
            string storageKey,
            IReadOnlyDictionary<string, string> uploadedFiles)
        {
            var primary = maniaResults[0];
            var oszInfo = ParseOszFileName(sourceFileName ?? string.Empty);
            var resolvedTitle = !string.IsNullOrWhiteSpace(oszInfo.Title) ? oszInfo.Title : primary.Title;
            var resolvedArtist = !string.IsNullOrWhiteSpace(oszInfo.Artist) ? oszInfo.Artist : primary.Artist;
            var createdAt = oszInfo.CreatedAt ?? DateTime.UtcNow;

            var beatmapSet = new BeatmapSet
            {
                StorageKey = storageKey,
                Title = resolvedTitle ?? "Unknown",
                Artist = resolvedArtist ?? "Unknown",
                Creator = primary.Creator ?? "Unknown",
                BackgroundFile = MapUploadedSrc(uploadedFiles, primary.BackgroundFile),
                AudioFile = MapUploadedSrc(uploadedFiles, primary.AudioFile),
                PreviewTime = primary.PreviewTime,
                CreatedAt = createdAt
            };

            var difficulties = new List<BeatmapDifficulty>();
            foreach (var result in maniaResults)
            {
                var data = new ManiaBeatmapData
                {
                    Columns = result.Columns,
                    AudioLeadIn = result.AudioLeadIn,
                    PreviewTime = result.PreviewTime,
                    TimingPoints = result.TimingPoints,
                    Notes = result.Notes
                };

                var difficulty = new BeatmapDifficulty
                {
                    Version = result.Version ?? "Unknown",
                    Mode = 3,
                    Columns = result.Columns,
                    OverallDifficulty = result.OverallDifficulty,
                    Bpm = result.Bpm,
                    OsuFileName = result.OsuFileName,
                    DataJson = JsonSerializer.Serialize(data),
                    NoteCount = result.Notes.Count,
                    CreatedAt = createdAt
                };

                difficulties.Add(difficulty);
            }

            return new BeatmapSetMappingResult
            {
                BeatmapSet = beatmapSet,
                Difficulties = difficulties
            };
        }

        public string NormalizeRelativePath(string path)
        {
            return path.Replace('\\', '/');
        }

        public string BuildUploadRoot(string? baseFolder, string storageKey)
        {
            var normalizedBase = NormalizeFolderSegment(baseFolder);
            if (string.IsNullOrWhiteSpace(normalizedBase))
            {
                normalizedBase = "beatmaps";
            }

            return $"{normalizedBase}/{storageKey}";
        }

        public string CombineUploadFolder(string root, string relativeDir)
        {
            var normalizedRoot = NormalizeFolderSegment(root);
            var normalizedDir = NormalizeFolderSegment(relativeDir);

            if (string.IsNullOrWhiteSpace(normalizedRoot))
            {
                return normalizedDir;
            }

            if (string.IsNullOrWhiteSpace(normalizedDir))
            {
                return normalizedRoot;
            }

            return $"{normalizedRoot}/{normalizedDir}";
        }

        public string? MapUploadedSrc(IReadOnlyDictionary<string, string> uploaded, string? relativePath)
        {
            if (string.IsNullOrWhiteSpace(relativePath))
            {
                return null;
            }

            var normalized = NormalizeRelativePath(relativePath).TrimStart('/');
            if (uploaded.TryGetValue(normalized, out var src))
            {
                return src;
            }

            return null;
        }

        public string ResolveBeatmapFolderPath(BeatmapSet set, ImagebedConfig config)
        {
            var candidate = !string.IsNullOrWhiteSpace(set.BackgroundFile)
                ? set.BackgroundFile
                : set.AudioFile;

            var normalized = NormalizeAssetPath(candidate);
            if (!string.IsNullOrWhiteSpace(normalized))
            {
                var root = ExtractRootByStorageKey(normalized, set.StorageKey);
                if (!string.IsNullOrWhiteSpace(root))
                {
                    return root;
                }

                var dir = GetDirectoryPath(normalized);
                if (!string.IsNullOrWhiteSpace(dir))
                {
                    return dir;
                }
            }

            return BuildUploadRoot(config.UploadFolder, set.StorageKey);
        }

        private static string NormalizeFolderSegment(string? folder)
        {
            if (string.IsNullOrWhiteSpace(folder))
            {
                return string.Empty;
            }

            return folder.Replace('\\', '/').Trim().Trim('/');
        }

        private static string NormalizeAssetPath(string? src)
        {
            if (string.IsNullOrWhiteSpace(src))
            {
                return string.Empty;
            }

            var trimmed = src.Trim();
            if (Uri.TryCreate(trimmed, UriKind.Absolute, out var uri))
            {
                trimmed = uri.AbsolutePath;
            }

            var normalized = trimmed.Replace('\\', '/').TrimStart('/');
            if (normalized.StartsWith("file/", StringComparison.OrdinalIgnoreCase))
            {
                normalized = normalized.Substring("file/".Length);
            }

            return normalized;
        }

        private static string? ExtractRootByStorageKey(string normalizedPath, string storageKey)
        {
            if (string.IsNullOrWhiteSpace(normalizedPath) || string.IsNullOrWhiteSpace(storageKey))
            {
                return null;
            }

            var segments = normalizedPath
                .Split('/', StringSplitOptions.RemoveEmptyEntries);

            for (var i = 0; i < segments.Length; i++)
            {
                if (string.Equals(segments[i], storageKey, StringComparison.OrdinalIgnoreCase))
                {
                    return string.Join('/', segments.Take(i + 1));
                }
            }

            return null;
        }

        private static string? GetDirectoryPath(string normalizedPath)
        {
            var index = normalizedPath.LastIndexOf('/');
            if (index <= 0)
            {
                return null;
            }

            return normalizedPath.Substring(0, index);
        }

        private static OszFileNameInfo ParseOszFileName(string fileName)
        {
            var info = new OszFileNameInfo();
            var baseName = Path.GetFileNameWithoutExtension(fileName) ?? string.Empty;
            if (string.IsNullOrWhiteSpace(baseName))
            {
                return info;
            }

            var trimmed = baseName.Trim();
            var index = 0;
            while (index < trimmed.Length && char.IsDigit(trimmed[index]))
            {
                index++;
            }

            if (index == 0)
            {
                return info;
            }

            var digits = trimmed.Substring(0, index);
            info.CreatedAt = TryParseCreatedAtFromDigits(digits);

            var rest = trimmed.Substring(index).Trim();
            if (string.IsNullOrWhiteSpace(rest))
            {
                return info;
            }

            rest = rest.TrimStart('-', '_').Trim();
            if (string.IsNullOrWhiteSpace(rest))
            {
                return info;
            }

            var parts = rest.Split(new[] { " - " }, 2, StringSplitOptions.None);
            if (parts.Length == 2)
            {
                info.Artist = parts[0].Trim();
                info.Title = parts[1].Trim();
                return info;
            }

            var dashIndex = rest.IndexOf('-', StringComparison.Ordinal);
            if (dashIndex > 0 && dashIndex < rest.Length - 1)
            {
                info.Artist = rest.Substring(0, dashIndex).Trim();
                info.Title = rest.Substring(dashIndex + 1).Trim();
            }

            return info;
        }

        private static DateTime? TryParseCreatedAtFromDigits(string digits)
        {
            if (string.IsNullOrWhiteSpace(digits) || !digits.All(char.IsDigit))
            {
                return null;
            }

            if (digits.Length == 13 && long.TryParse(digits, out var milliseconds))
            {
                return DateTimeOffset.FromUnixTimeMilliseconds(milliseconds).UtcDateTime;
            }

            if (digits.Length == 10 && long.TryParse(digits, out var seconds))
            {
                return DateTimeOffset.FromUnixTimeSeconds(seconds).UtcDateTime;
            }

            var format = digits.Length switch
            {
                8 => "yyyyMMdd",
                7 => "yyMMddH",
                6 => "yyMMdd",
                _ => null
            };

            if (format == null)
            {
                return null;
            }

            if (!DateTime.TryParseExact(digits, format, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
            {
                return null;
            }

            return DateTime.SpecifyKind(parsed, DateTimeKind.Utc);
        }
    }
}
