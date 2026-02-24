using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BlogApi.Data;
using BlogApi.Models;
using Microsoft.EntityFrameworkCore;

namespace BlogApi.Services.Beatmaps
{
    /// <summary>
    /// 持久化服务实现：
    /// - 保存谱面集合及难度
    /// - 提供查询与删除所需的数据访问能力
    /// </summary>
    public class BeatmapPersistenceService : IBeatmapPersistenceService
    {
        private readonly BlogDbContext _context;

        public BeatmapPersistenceService(BlogDbContext context)
        {
            _context = context;
        }

        public async Task<BeatmapSet> SaveBeatmapSetAsync(BeatmapSet beatmapSet, IReadOnlyCollection<BeatmapDifficulty> difficulties)
        {
            _context.BeatmapSets.Add(beatmapSet);
            await _context.SaveChangesAsync();

            foreach (var difficulty in difficulties)
            {
                difficulty.BeatmapSetId = beatmapSet.Id;
                _context.BeatmapDifficulties.Add(difficulty);
                beatmapSet.Difficulties.Add(difficulty);
            }

            await _context.SaveChangesAsync();
            return beatmapSet;
        }

        public async Task<List<BeatmapSet>> GetAllSetsAsync()
        {
            return await _context.BeatmapSets
                .Include(s => s.Difficulties)
                .OrderByDescending(s => s.CreatedAt)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<BeatmapSet?> GetSetByIdAsync(int id)
        {
            return await _context.BeatmapSets
                .Include(s => s.Difficulties)
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == id);
        }

        public async Task<BeatmapDifficulty?> GetDifficultyByIdAsync(int id)
        {
            return await _context.BeatmapDifficulties
                .Include(d => d.BeatmapSet)
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.Id == id);
        }

        public async Task<BeatmapSet?> GetSetWithDifficultiesForDeletionAsync(int id)
        {
            return await _context.BeatmapSets
                .Include(s => s.Difficulties)
                .FirstOrDefaultAsync(s => s.Id == id);
        }

        public async Task DeleteSetAsync(BeatmapSet set)
        {
            _context.BeatmapSets.Remove(set);
            await _context.SaveChangesAsync();
        }
    }
}
