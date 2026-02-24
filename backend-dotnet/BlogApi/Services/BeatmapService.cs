using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Threading.Tasks;
using BlogApi.DTOs;
using BlogApi.Models;
using BlogApi.Services.Beatmaps;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace BlogApi.Services
{
    /// <summary>
    /// Beatmap 编排服务（Orchestrator）。
    ///
    /// 职责边界：
    /// 1) 协调上传/导入流程；
    /// 2) 管理临时文件与解压；
    /// 3) 调用子服务完成解析、校验、映射、持久化；
    /// 4) 与图床客户端协作完成资源上传/删除。
    ///
    /// 说明：具体业务规则已拆分到 `Services/Beatmaps/*`，此类不再承载大段解析逻辑。
    /// </summary>
    public class BeatmapService
    {
        private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".osu",
            ".ogg",
            ".mp3",
            ".wav",
            ".flac",
            ".png",
            ".jpg",
            ".jpeg",
            ".webp",
            ".bmp",
            ".gif"
        };

        private readonly ImagebedService _imagebedService;
        private readonly CfBedClient _cfBedClient;
        private readonly IBeatmapValidationService _validationService;
        private readonly IBeatmapParsingService _parsingService;
        private readonly IBeatmapMappingService _mappingService;
        private readonly IBeatmapPersistenceService _persistenceService;
        private readonly ILogger<BeatmapService> _logger;

        public BeatmapService(
            ImagebedService imagebedService,
            CfBedClient cfBedClient,
            IBeatmapValidationService validationService,
            IBeatmapParsingService parsingService,
            IBeatmapMappingService mappingService,
            IBeatmapPersistenceService persistenceService,
            ILogger<BeatmapService> logger)
        {
            _imagebedService = imagebedService;
            _cfBedClient = cfBedClient;
            _validationService = validationService;
            _parsingService = parsingService;
            _mappingService = mappingService;
            _persistenceService = persistenceService;
            _logger = logger;
        }

        /// <summary>
        /// 从 .osz 上传创建谱面集合。
        /// 流程：校验 -> 解压 -> 解析 -> 上传资源 -> 映射 -> 落库。
        /// </summary>
        public async Task<BeatmapSet> CreateFromOszAsync(IFormFile oszFile)
        {
            _validationService.EnsureValidOszUpload(oszFile);

            var storageKey = _validationService.BuildStorageKey(oszFile.FileName);
            var tempRoot = Path.Combine(Path.GetTempPath(), $"beatmap-{Guid.NewGuid():N}");
            Directory.CreateDirectory(tempRoot);

            var tempPath = Path.Combine(tempRoot, $"{Guid.NewGuid():N}.osz");
            await using (var stream = File.Create(tempPath))
            {
                await oszFile.CopyToAsync(stream);
            }

            try
            {
                ExtractZipSafe(tempPath, tempRoot);

                var maniaResults = _parsingService.ParseManiaFromExtractedDirectory(tempRoot);
                _validationService.EnsureHasManiaBeatmaps(maniaResults);

                var config = await _imagebedService.GetConfigAsync();
                _validationService.EnsureImagebedConfigReady(config);

                var uploadRoot = _mappingService.BuildUploadRoot(config!.UploadFolder, storageKey);
                var uploadedFiles = await UploadExtractedFilesAsync(tempRoot, uploadRoot, config);

                var mapping = _mappingService.BuildSetAndDifficulties(
                    maniaResults,
                    oszFile.FileName,
                    storageKey,
                    uploadedFiles);

                return await _persistenceService.SaveBeatmapSetAsync(mapping.BeatmapSet, mapping.Difficulties);
            }
            finally
            {
                TryDeleteFile(tempPath);
                TryDeleteDirectory(tempRoot);
            }
        }

        /// <summary>
        /// 从前端导入 DTO 创建谱面集合。
        /// 流程：校验 -> 解析 -> 映射 -> 落库。
        /// </summary>
        public async Task<BeatmapSet> CreateFromImportAsync(BeatmapImportRequestDto dto)
        {
            _validationService.EnsureValidImportRequest(dto);

            var storageKey = string.IsNullOrWhiteSpace(dto.StorageKey)
                ? _validationService.BuildStorageKey(dto.SourceFileName)
                : dto.StorageKey.Trim();

            var uploadedFiles = _mappingService.NormalizeUploadedFileMap(dto.UploadedFiles);
            var maniaResults = _parsingService.ParseManiaFromImport(dto.OsuFiles, uploadedFiles);
            _validationService.EnsureHasManiaBeatmaps(maniaResults);

            var mapping = _mappingService.BuildSetAndDifficulties(
                maniaResults,
                dto.SourceFileName ?? string.Empty,
                storageKey,
                uploadedFiles);

            return await _persistenceService.SaveBeatmapSetAsync(mapping.BeatmapSet, mapping.Difficulties);
        }

        public Task<List<BeatmapSet>> GetAllSetsAsync()
        {
            return _persistenceService.GetAllSetsAsync();
        }

        public Task<BeatmapSet?> GetSetByIdAsync(int id)
        {
            return _persistenceService.GetSetByIdAsync(id);
        }

        public Task<BeatmapDifficulty?> GetDifficultyByIdAsync(int id)
        {
            return _persistenceService.GetDifficultyByIdAsync(id);
        }

        /// <summary>
        /// 删除谱面集合：先删图床目录，再删数据库记录。
        /// </summary>
        public async Task<bool> DeleteSetAsync(int id)
        {
            var set = await _persistenceService.GetSetWithDifficultiesForDeletionAsync(id);
            if (set == null)
            {
                return false;
            }

            var config = await _imagebedService.GetConfigAsync();
            _validationService.EnsureImagebedConfigReady(config);

            var folderPath = _mappingService.ResolveBeatmapFolderPath(set, config!);
            if (!string.IsNullOrWhiteSpace(folderPath))
            {
                await _cfBedClient.DeleteAsync(config!, folderPath, true);
            }

            await _persistenceService.DeleteSetAsync(set);
            return true;
        }

        /// <summary>
        /// 将解压后的可上传资源批量上传到图床，并返回“相对路径 -> 图床 src”映射。
        /// </summary>
        private async Task<Dictionary<string, string>> UploadExtractedFilesAsync(
            string root,
            string uploadRoot,
            ImagebedConfig config)
        {
            var results = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            var files = Directory.GetFiles(root, "*", SearchOption.AllDirectories);

            foreach (var filePath in files)
            {
                var ext = Path.GetExtension(filePath);
                if (string.IsNullOrWhiteSpace(ext) || !AllowedExtensions.Contains(ext))
                {
                    continue;
                }

                var relativePath = _mappingService.NormalizeRelativePath(Path.GetRelativePath(root, filePath)).TrimStart('/');
                var relativeDir = Path.GetDirectoryName(relativePath) ?? string.Empty;
                var uploadFolder = _mappingService.CombineUploadFolder(uploadRoot, relativeDir);

                try
                {
                    var src = await _cfBedClient.UploadAsync(config, filePath, uploadFolder);
                    results[relativePath] = src;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "上传文件失败: {File}", relativePath);
                    throw new InvalidOperationException($"上传文件失败: {relativePath} - {ex.Message}", ex);
                }
            }

            return results;
        }

        /// <summary>
        /// 安全解压：仅放行白名单后缀，并阻断 Zip Slip。
        /// </summary>
        private static void ExtractZipSafe(string zipPath, string destinationDir)
        {
            var rootFullPath = Path.GetFullPath(destinationDir);
            using var archive = ZipFile.OpenRead(zipPath);
            foreach (var entry in archive.Entries)
            {
                if (string.IsNullOrWhiteSpace(entry.FullName))
                {
                    continue;
                }

                if (entry.FullName.EndsWith("/", StringComparison.Ordinal))
                {
                    continue;
                }

                var ext = Path.GetExtension(entry.FullName);
                if (string.IsNullOrWhiteSpace(ext) || !AllowedExtensions.Contains(ext))
                {
                    continue;
                }

                var destinationPath = Path.GetFullPath(Path.Combine(destinationDir, entry.FullName));
                if (!destinationPath.StartsWith(rootFullPath, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var directory = Path.GetDirectoryName(destinationPath);
                if (!string.IsNullOrWhiteSpace(directory))
                {
                    Directory.CreateDirectory(directory);
                }

                entry.ExtractToFile(destinationPath, true);
            }
        }

        private static void TryDeleteFile(string path)
        {
            try
            {
                if (File.Exists(path))
                {
                    File.Delete(path);
                }
            }
            catch
            {
                // 清理失败不影响主流程
            }
        }

        private static void TryDeleteDirectory(string path)
        {
            try
            {
                if (Directory.Exists(path))
                {
                    Directory.Delete(path, true);
                }
            }
            catch
            {
                // 清理失败不影响主流程
            }
        }
    }
}
