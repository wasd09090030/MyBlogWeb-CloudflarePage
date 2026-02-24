using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using BlogApi.DTOs;

namespace BlogApi.Services.Beatmaps
{
    /// <summary>
    /// 解析服务：
    /// - 从解压目录读取 .osu 并提取 mania 谱面
    /// - 从导入 DTO 文本解析 mania 谱面
    /// </summary>
    public class BeatmapParsingService : IBeatmapParsingService
    {
        /// <summary>
        /// 从已解压目录中读取所有 .osu，仅保留 mode=3(Mania) 的解析结果。
        /// </summary>
        public IReadOnlyList<BeatmapParseResult> ParseManiaFromExtractedDirectory(string setRoot)
        {
            var osuFiles = Directory.GetFiles(setRoot, "*.osu", SearchOption.AllDirectories);
            if (osuFiles.Length == 0)
            {
                throw new InvalidOperationException("未找到 .osu 文件");
            }

            var maniaResults = new List<BeatmapParseResult>();
            foreach (var osuPath in osuFiles)
            {
                var relativePath = NormalizeRelativePath(Path.GetRelativePath(setRoot, osuPath));
                var result = ParseOsuFile(setRoot, osuPath, relativePath);
                if (result.IsMania)
                {
                    maniaResults.Add(result);
                }
            }

            return maniaResults;
        }

        /// <summary>
        /// 从前端导入文本中解析 Mania 谱面；上传资源路径通过 uploadedFiles 映射补全。
        /// </summary>
        public IReadOnlyList<BeatmapParseResult> ParseManiaFromImport(IEnumerable<BeatmapOsuFileDto> osuFiles, IReadOnlyDictionary<string, string> uploadedFiles)
        {
            var maniaResults = new List<BeatmapParseResult>();
            foreach (var osuFile in osuFiles)
            {
                if (string.IsNullOrWhiteSpace(osuFile?.Content))
                {
                    continue;
                }

                var relativePath = NormalizeRelativePath(osuFile.Path ?? string.Empty).TrimStart('/');
                var result = ParseOsuContent(osuFile.Content, relativePath, uploadedFiles);
                if (result.IsMania)
                {
                    maniaResults.Add(result);
                }
            }

            return maniaResults;
        }

        private static BeatmapParseResult ParseOsuFile(string setRoot, string osuPath, string osuRelativePath)
        {
            var result = new BeatmapParseResult
            {
                OsuFileName = osuRelativePath
            };

            string? section = null;
            foreach (var rawLine in File.ReadLines(osuPath, Encoding.UTF8))
            {
                var line = rawLine.Trim();
                if (string.IsNullOrWhiteSpace(line) || line.StartsWith("//", StringComparison.Ordinal))
                {
                    continue;
                }

                if (line.StartsWith("[", StringComparison.Ordinal) && line.EndsWith("]", StringComparison.Ordinal))
                {
                    // .osu 使用 section 分段，后续按当前 section 路由到对应解析器。
                    section = line.Substring(1, line.Length - 2);
                    continue;
                }

                switch (section)
                {
                    case "General":
                        ParseKeyValue(line, result.General);
                        break;
                    case "Metadata":
                        ParseKeyValue(line, result.Metadata);
                        break;
                    case "Difficulty":
                        ParseKeyValue(line, result.Difficulty);
                        break;
                    case "Events":
                        if (string.IsNullOrWhiteSpace(result.BackgroundFile))
                        {
                            var background = TryParseBackground(line);
                            if (!string.IsNullOrWhiteSpace(background))
                            {
                                result.BackgroundFile = ResolveAssetRelativePath(setRoot, osuRelativePath, background);
                            }
                        }
                        break;
                    case "TimingPoints":
                        var timingPoint = TryParseTimingPoint(line);
                        if (timingPoint != null)
                        {
                            result.TimingPoints.Add(timingPoint);
                        }
                        break;
                    case "HitObjects":
                        var note = TryParseManiaNote(line, result.Columns);
                        if (note != null)
                        {
                            result.Notes.Add(note);
                        }
                        break;
                }
            }

            FillDerivedFields(result, osuRelativePath, uploadedFiles: null, setRoot);
            return result;
        }

        private static BeatmapParseResult ParseOsuContent(string content, string osuRelativePath, IReadOnlyDictionary<string, string> uploadedFiles)
        {
            var result = new BeatmapParseResult
            {
                OsuFileName = osuRelativePath
            };

            string? section = null;
            using var reader = new StringReader(content);
            string? rawLine;
            while ((rawLine = reader.ReadLine()) != null)
            {
                var line = rawLine.Trim();
                if (string.IsNullOrWhiteSpace(line) || line.StartsWith("//", StringComparison.Ordinal))
                {
                    continue;
                }

                if (line.StartsWith("[", StringComparison.Ordinal) && line.EndsWith("]", StringComparison.Ordinal))
                {
                    // 与目录解析保持同一状态机，确保导入与上传流程行为一致。
                    section = line.Substring(1, line.Length - 2);
                    continue;
                }

                switch (section)
                {
                    case "General":
                        ParseKeyValue(line, result.General);
                        break;
                    case "Metadata":
                        ParseKeyValue(line, result.Metadata);
                        break;
                    case "Difficulty":
                        ParseKeyValue(line, result.Difficulty);
                        break;
                    case "Events":
                        if (string.IsNullOrWhiteSpace(result.BackgroundFile))
                        {
                            var background = TryParseBackground(line);
                            if (!string.IsNullOrWhiteSpace(background))
                            {
                                result.BackgroundFile = ResolveAssetFromMap(osuRelativePath, background, uploadedFiles);
                            }
                        }
                        break;
                    case "TimingPoints":
                        var timingPoint = TryParseTimingPoint(line);
                        if (timingPoint != null)
                        {
                            result.TimingPoints.Add(timingPoint);
                        }
                        break;
                    case "HitObjects":
                        var note = TryParseManiaNote(line, result.Columns);
                        if (note != null)
                        {
                            result.Notes.Add(note);
                        }
                        break;
                }
            }

            FillDerivedFields(result, osuRelativePath, uploadedFiles, setRoot: null);
            return result;
        }

        /// <summary>
        /// 统一填充解析后的派生字段，保证目录解析与导入解析逻辑一致。
        /// </summary>
        private static void FillDerivedFields(
            BeatmapParseResult result,
            string osuRelativePath,
            IReadOnlyDictionary<string, string>? uploadedFiles,
            string? setRoot)
        {
            result.Mode = ParseInt(result.General, "Mode", 0);
            result.IsMania = result.Mode == 3;

            result.Title = GetValue(result.Metadata, "Title") ?? GetValue(result.Metadata, "TitleUnicode");
            result.Artist = GetValue(result.Metadata, "Artist") ?? GetValue(result.Metadata, "ArtistUnicode");
            result.Creator = GetValue(result.Metadata, "Creator");
            result.Version = GetValue(result.Metadata, "Version");

            result.AudioLeadIn = ParseInt(result.General, "AudioLeadIn", null);
            result.PreviewTime = ParseInt(result.General, "PreviewTime", null);

            var audioFilename = GetValue(result.General, "AudioFilename");
            if (!string.IsNullOrWhiteSpace(audioFilename))
            {
                result.AudioFile = uploadedFiles != null
                    ? ResolveAssetFromMap(osuRelativePath, audioFilename, uploadedFiles)
                    : ResolveAssetRelativePath(setRoot ?? string.Empty, osuRelativePath, audioFilename);
            }

            var circleSize = ParseDouble(result.Difficulty, "CircleSize", 4d);
            // Mania 下 CircleSize 实际表示列数（keys）。
            result.Columns = Math.Max(1, (int)Math.Round(circleSize));
            result.OverallDifficulty = ParseDouble(result.Difficulty, "OverallDifficulty", 5d);

            var firstTiming = result.TimingPoints.FirstOrDefault(tp => tp.Uninherited && tp.BeatLength > 0);
            if (firstTiming != null)
            {
                result.Bpm = 60000d / firstTiming.BeatLength;
            }

            if (!result.IsMania)
            {
                // 非 Mania 谱面不保留 HitObjects，避免误入后续持久化和前端渲染。
                result.Notes.Clear();
            }
        }

        private static void ParseKeyValue(string line, Dictionary<string, string> target)
        {
            var index = line.IndexOf(':');
            if (index <= 0) return;
            var key = line.Substring(0, index).Trim();
            var value = line.Substring(index + 1).Trim();
            if (!string.IsNullOrWhiteSpace(key))
            {
                target[key] = value;
            }
        }

        private static string? GetValue(Dictionary<string, string> source, string key)
        {
            return source.TryGetValue(key, out var value) ? value : null;
        }

        private static int ParseInt(Dictionary<string, string> source, string key, int? defaultValue)
        {
            if (source.TryGetValue(key, out var value) && int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var result))
            {
                return result;
            }

            return defaultValue ?? 0;
        }

        private static double ParseDouble(Dictionary<string, string> source, string key, double defaultValue)
        {
            if (source.TryGetValue(key, out var value) && double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var result))
            {
                return result;
            }

            return defaultValue;
        }

        private static TimingPointDto? TryParseTimingPoint(string line)
        {
            var parts = line.Split(',');
            if (parts.Length < 2) return null;

            if (!int.TryParse(parts[0].Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var time))
            {
                return null;
            }

            if (!double.TryParse(parts[1].Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out var beatLength))
            {
                return null;
            }

            var meter = 4;
            if (parts.Length > 2)
            {
                int.TryParse(parts[2].Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out meter);
            }

            var uninherited = true;
            if (parts.Length > 6)
            {
                uninherited = parts[6].Trim() == "1";
            }

            return new TimingPointDto
            {
                Time = time,
                BeatLength = beatLength,
                Meter = meter,
                Uninherited = uninherited
            };
        }

        private static ManiaNoteDto? TryParseManiaNote(string line, int columns)
        {
            if (columns <= 0)
            {
                columns = 4;
            }

            var parts = line.Split(',');
            if (parts.Length < 5) return null;

            if (!int.TryParse(parts[0].Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var x))
            {
                return null;
            }

            if (!int.TryParse(parts[2].Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var time))
            {
                return null;
            }

            if (!int.TryParse(parts[3].Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var type))
            {
                return null;
            }

            // osu!standard 的 x 坐标范围是 [0,512)，按列数映射到 [0, columns-1]。
            var column = (int)Math.Floor(x * columns / 512d);
            if (column < 0) column = 0;
            if (column >= columns) column = columns - 1;

            int? endTime = null;
            if ((type & 128) != 0 && parts.Length > 5)
            {
                // 长按音符的结束时间位于第 6 段，格式类似 "end:sample:set"。
                var endPart = parts[5].Split(':').FirstOrDefault();
                if (int.TryParse(endPart, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsedEnd))
                {
                    endTime = parsedEnd;
                }
            }

            return new ManiaNoteDto
            {
                Time = time,
                Column = column,
                EndTime = endTime
            };
        }

        private static string? TryParseBackground(string line)
        {
            if (line.StartsWith("//", StringComparison.Ordinal))
            {
                return null;
            }

            var parts = line.Split(',');
            if (parts.Length < 3) return null;

            var eventType = parts[0].Trim();
            if (eventType != "0" && !eventType.Equals("Background", StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            var filename = parts[2].Trim().Trim('"');
            return string.IsNullOrWhiteSpace(filename) ? null : filename;
        }

        private static string? ResolveAssetRelativePath(string setRoot, string osuRelativePath, string assetRelativePath)
        {
            if (string.IsNullOrWhiteSpace(assetRelativePath)) return null;

            var baseDir = Path.GetDirectoryName(osuRelativePath) ?? string.Empty;
            var combined = Path.GetFullPath(Path.Combine(setRoot, baseDir, assetRelativePath));
            var rootFull = Path.GetFullPath(setRoot);
            // 阻断越界路径（Zip Slip / 手工构造 ../）。
            if (!combined.StartsWith(rootFull, StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            if (!File.Exists(combined))
            {
                var dir = Path.GetDirectoryName(combined);
                var fileName = Path.GetFileName(combined);
                if (!string.IsNullOrWhiteSpace(dir) && Directory.Exists(dir))
                {
                    // 文件系统大小写不敏感场景下补一次大小写纠偏匹配。
                    var match = Directory.EnumerateFiles(dir)
                        .FirstOrDefault(path => string.Equals(Path.GetFileName(path), fileName, StringComparison.OrdinalIgnoreCase));
                    if (!string.IsNullOrWhiteSpace(match))
                    {
                        return NormalizeRelativePath(Path.GetRelativePath(rootFull, match));
                    }
                }
                return null;
            }

            return NormalizeRelativePath(Path.GetRelativePath(rootFull, combined));
        }

        private static string? ResolveAssetFromMap(string osuRelativePath, string assetRelativePath, IReadOnlyDictionary<string, string> uploadedFiles)
        {
            if (string.IsNullOrWhiteSpace(assetRelativePath))
            {
                return null;
            }

            var baseDir = Path.GetDirectoryName(osuRelativePath) ?? string.Empty;
            var combined = NormalizeRelativePath(Path.Combine(baseDir, assetRelativePath)).TrimStart('/');
            if (combined.Contains("..", StringComparison.Ordinal))
            {
                // 导入模式下同样拒绝目录穿越。
                return null;
            }

            return uploadedFiles.ContainsKey(combined) ? combined : null;
        }

        private static string NormalizeRelativePath(string path)
        {
            return path.Replace('\\', '/');
        }
    }
}
