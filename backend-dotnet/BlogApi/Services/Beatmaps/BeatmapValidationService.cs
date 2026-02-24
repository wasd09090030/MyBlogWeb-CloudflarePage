using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using BlogApi.DTOs;
using BlogApi.Models;
using Microsoft.AspNetCore.Http;

namespace BlogApi.Services.Beatmaps
{
    /// <summary>
    /// Beatmap 业务校验实现：
    /// - 上传/导入入参校验
    /// - 图床配置校验
    /// - 存储键生成与清洗
    /// </summary>
    public class BeatmapValidationService : IBeatmapValidationService
    {
        public void EnsureValidOszUpload(IFormFile oszFile)
        {
            if (oszFile == null || oszFile.Length == 0)
            {
                throw new InvalidOperationException("上传文件为空");
            }

            var ext = Path.GetExtension(oszFile.FileName);
            if (!string.Equals(ext, ".osz", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("仅支持 .osz 文件");
            }
        }

        public void EnsureValidImportRequest(BeatmapImportRequestDto dto)
        {
            if (dto == null)
            {
                throw new InvalidOperationException("导入数据不能为空");
            }

            if (dto.OsuFiles == null || dto.OsuFiles.Count == 0)
            {
                throw new InvalidOperationException("未找到 .osu 文件");
            }
        }

        public void EnsureImagebedConfigReady(ImagebedConfig? config)
        {
            if (config == null || string.IsNullOrWhiteSpace(config.Domain) || string.IsNullOrWhiteSpace(config.ApiToken))
            {
                throw new InvalidOperationException("图床配置未设置");
            }
        }

        public void EnsureHasManiaBeatmaps(IReadOnlyCollection<BeatmapParseResult> maniaResults)
        {
            if (maniaResults == null || maniaResults.Count == 0)
            {
                throw new InvalidOperationException("未找到 osu!mania 谱面");
            }
        }

        public string BuildStorageKey(string? fileName)
        {
            var baseName = Path.GetFileNameWithoutExtension(fileName ?? string.Empty) ?? string.Empty;
            var sanitized = SanitizeFolderName(baseName);
            if (!string.IsNullOrWhiteSpace(sanitized))
            {
                return sanitized;
            }

            return $"set-{Guid.NewGuid():N}";
        }

        private static string SanitizeFolderName(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return string.Empty;
            }

            var invalidChars = Path.GetInvalidFileNameChars();
            var builder = new StringBuilder(value.Length);
            var previousDash = false;

            foreach (var ch in value.Trim())
            {
                char output;
                if (ch == '/' || ch == '\\' || invalidChars.Contains(ch) || char.IsControl(ch))
                {
                    output = '-';
                }
                else if (char.IsWhiteSpace(ch))
                {
                    output = '-';
                }
                else
                {
                    output = ch;
                }

                if (output == '-')
                {
                    if (previousDash)
                    {
                        continue;
                    }

                    previousDash = true;
                    builder.Append(output);
                }
                else
                {
                    previousDash = false;
                    builder.Append(output);
                }
            }

            var result = builder.ToString().Trim('-', '.');
            if (result.Length > 64)
            {
                result = result.Substring(0, 64).Trim('-', '.');
            }

            return result;
        }
    }
}
