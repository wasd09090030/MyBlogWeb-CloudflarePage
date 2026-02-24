using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using BlogApi.Models;
using System.Text.Json;

namespace BlogApi.Data
{
    public class BlogDbContext : DbContext
    {
        public BlogDbContext(DbContextOptions<BlogDbContext> options) : base(options)
        {
        }

        public DbSet<Article> Articles { get; set; }
        public DbSet<Comment> Comments { get; set; }
        public DbSet<Like> Likes { get; set; }
        public DbSet<Gallery> Galleries { get; set; }
        public DbSet<ImagebedConfig> ImagebedConfigs { get; set; }
        public DbSet<CfImageConfig> CfImageConfigs { get; set; }
        public DbSet<BeatmapSet> BeatmapSets { get; set; }
        public DbSet<BeatmapDifficulty> BeatmapDifficulties { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Article configuration
            modelBuilder.Entity<Article>(entity =>
            {
                entity.ToTable("articles");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Title).HasColumnName("title").IsRequired();
                entity.Property(e => e.Slug).HasColumnName("slug").HasMaxLength(200).IsRequired();
                entity.Property(e => e.Content).HasColumnName("content").IsRequired();
                entity.Property(e => e.ContentMarkdown).HasColumnName("contentMarkdown");
                entity.Property(e => e.CoverImage).HasColumnName("coverImage");
                entity.Property(e => e.Category)
                    .HasColumnName("category")
                    .HasConversion(
                        v => v.ToString().ToLower(),  // 存储时转为小写
                        v => string.IsNullOrEmpty(v) ? ArticleCategory.Other : 
                             Enum.Parse<ArticleCategory>(char.ToUpper(v[0]) + (v.Length > 1 ? v.Substring(1).ToLower() : ""), true) // 读取时首字母大写
                    )
                    .HasDefaultValue(ArticleCategory.Other);
                
                // Tags 字段配置 - 存储为 JSON 字符串
                entity.Property(e => e.Tags)
                    .HasColumnName("tags")
                    .HasConversion(
                        v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                        v => string.IsNullOrEmpty(v) 
                            ? new List<string>() 
                            : JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>()
                    )
                    .Metadata.SetValueComparer(new ValueComparer<List<string>>(
                        (c1, c2) => c1 != null && c2 != null && c1.SequenceEqual(c2),
                        c => c.Aggregate(0, (a, v) => HashCode.Combine(a, v.GetHashCode())),
                        c => c.ToList()
                    ));
                
                // AiSummary 字段配置
                entity.Property(e => e.AiSummary)
                    .HasColumnName("aiSummary")
                    .HasMaxLength(2000);
                
                entity.Property(e => e.CreatedAt).HasColumnName("createdAt");
                entity.Property(e => e.UpdatedAt).HasColumnName("updatedAt");
                entity.HasIndex(e => e.Slug).IsUnique();
                entity.HasMany(e => e.Comments)
                    .WithOne(c => c.Article)
                    .HasForeignKey(c => c.ArticleId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Comment configuration
            modelBuilder.Entity<Comment>(entity =>
            {
                entity.ToTable("Comment");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Content).IsRequired();
                entity.Property(e => e.Author).IsRequired();
                entity.Property(e => e.Status).HasDefaultValue("pending");
                entity.Property(e => e.Likes).HasDefaultValue(0);
            });

            // Like configuration
            modelBuilder.Entity<Like>(entity =>
            {
                entity.ToTable("Like");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Type).HasDefaultValue("article");
            });

            // Gallery configuration
            modelBuilder.Entity<Gallery>(entity =>
            {
                entity.ToTable("galleries");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ImageUrl).IsRequired();
                entity.Property(e => e.ImageWidth);
                entity.Property(e => e.ImageHeight);
                entity.Property(e => e.SortOrder).HasDefaultValue(0);
                entity.Property(e => e.IsActive).HasDefaultValue(true);
                entity.Property(e => e.Tag).HasColumnName("tag").HasMaxLength(32).HasDefaultValue("artwork");
            });

            // ImagebedConfig configuration
            modelBuilder.Entity<ImagebedConfig>(entity =>
            {
                entity.ToTable("imagebed_configs");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Domain).IsRequired();
                entity.Property(e => e.ApiToken).IsRequired();
                entity.Property(e => e.UploadFolder);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            });

            // CfImageConfig configuration
            modelBuilder.Entity<CfImageConfig>(entity =>
            {
                entity.ToTable("cf_image_configs");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.IsEnabled).HasDefaultValue(true);
                entity.Property(e => e.ZoneDomain);
                entity.Property(e => e.UseHttps).HasDefaultValue(true);
                entity.Property(e => e.Fit).HasDefaultValue("scale-down");
                entity.Property(e => e.Width).HasDefaultValue(300);
                entity.Property(e => e.Quality).HasDefaultValue(50);
                entity.Property(e => e.Format).HasDefaultValue("webp");
                entity.Property(e => e.SignatureParam).HasDefaultValue("sig");
                entity.Property(e => e.UseWorker).HasDefaultValue(false);
                entity.Property(e => e.WorkerBaseUrl);
                entity.Property(e => e.TokenTtlSeconds).HasDefaultValue(3600);
                entity.Property(e => e.SignatureToken);
                entity.Property(e => e.SignatureSecret);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            });

            modelBuilder.Entity<BeatmapSet>(entity =>
            {
                entity.ToTable("beatmap_sets");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.StorageKey).HasColumnName("storageKey").HasMaxLength(64).IsRequired();
                entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
                entity.Property(e => e.Artist).HasColumnName("artist").HasMaxLength(200).IsRequired();
                entity.Property(e => e.Creator).HasColumnName("creator").HasMaxLength(200).IsRequired();
                entity.Property(e => e.BackgroundFile).HasColumnName("backgroundFile");
                entity.Property(e => e.AudioFile).HasColumnName("audioFile");
                entity.Property(e => e.PreviewTime).HasColumnName("previewTime");
                entity.Property(e => e.CreatedAt).HasColumnName("createdAt");
                entity.HasMany(e => e.Difficulties)
                    .WithOne(d => d.BeatmapSet)
                    .HasForeignKey(d => d.BeatmapSetId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<BeatmapDifficulty>(entity =>
            {
                entity.ToTable("beatmap_difficulties");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.BeatmapSetId).HasColumnName("beatmapSetId");
                entity.Property(e => e.Version).HasColumnName("version").HasMaxLength(200).IsRequired();
                entity.Property(e => e.Mode).HasColumnName("mode");
                entity.Property(e => e.Columns).HasColumnName("columns");
                entity.Property(e => e.OverallDifficulty).HasColumnName("overallDifficulty");
                entity.Property(e => e.Bpm).HasColumnName("bpm");
                entity.Property(e => e.OsuFileName).HasColumnName("osuFileName").HasMaxLength(512).IsRequired();
                entity.Property(e => e.DataJson).HasColumnName("dataJson").IsRequired();
                entity.Property(e => e.NoteCount).HasColumnName("noteCount");
                entity.Property(e => e.CreatedAt).HasColumnName("createdAt");
                entity.HasIndex(e => e.BeatmapSetId);
            });
        }
    }
}
