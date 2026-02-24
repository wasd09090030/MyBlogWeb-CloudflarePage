using System.Collections.Generic;
using System.Threading.Tasks;
using BlogApi.Models;

namespace BlogApi.Services.Beatmaps
{
    /// <summary>
    /// 负责 Beatmap 领域数据的持久化与查询。
    /// </summary>
    public interface IBeatmapPersistenceService
    {
        Task<BeatmapSet> SaveBeatmapSetAsync(BeatmapSet beatmapSet, IReadOnlyCollection<BeatmapDifficulty> difficulties);
        Task<List<BeatmapSet>> GetAllSetsAsync();
        Task<BeatmapSet?> GetSetByIdAsync(int id);
        Task<BeatmapDifficulty?> GetDifficultyByIdAsync(int id);
        Task<BeatmapSet?> GetSetWithDifficultiesForDeletionAsync(int id);
        Task DeleteSetAsync(BeatmapSet set);
    }
}
