using BlogApi.Data;
using BlogApi.DTOs;
using BlogApi.Models;
using BlogApi.Services;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace BlogApi.Tests;

public class ArticleServiceThumbnailTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<BlogDbContext> _options;

    public ArticleServiceThumbnailTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        _options = new DbContextOptionsBuilder<BlogDbContext>()
            .UseSqlite(_connection)
            .Options;

        using var context = CreateContext();
        context.Database.EnsureCreated();
    }

    [Fact]
    public async Task GetAllSummaryAsync_UsesPermanentThumbnailAndHidesLegacyCoverImage()
    {
        using var context = CreateContext();
        var asset = new ImageAsset
        {
            PublicId = "i_testAsset01",
            StorageKey = "articles/cover.webp",
            SourceUrl = "https://cfimg.example.com/file/articles/cover.webp",
            Kind = ImageAssetKind.ArticleCover,
            IsActive = true
        };
        context.ImageAssets.Add(asset);
        await context.SaveChangesAsync();

        context.Articles.Add(CreateArticle(
            "Asset article",
            "https://cfimg.example.com/file/articles/cover.webp",
            asset.Id));
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var summaries = await GetSummaryDataAsync(service);
        var summary = Assert.Single(summaries);

        Assert.Null(summary.CoverImage);
        Assert.Equal(asset.Id, summary.CoverImageAssetId);
        Assert.Equal("i_testAsset01", summary.CoverImageAssetPublicId);
        Assert.Equal("/images/thumb/i_testAsset01.webp", summary.ThumbnailUrl);
    }

    [Fact]
    public async Task GetAllSummaryAsync_DoesNotGenerateExpiringOrOriginalFallbackForUnbackfilledArticle()
    {
        using var context = CreateContext();
        context.CfImageConfigs.Add(new CfImageConfig
        {
            IsEnabled = true,
            UseWorker = true,
            WorkerBaseUrl = "https://images.example.com/thumb",
            SignatureSecret = "secret",
            TokenTtlSeconds = 3600
        });
        context.Articles.Add(CreateArticle(
            "Legacy article",
            "https://cfimg.example.com/file/articles/legacy.webp",
            null));
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var summaries = await GetSummaryDataAsync(service);
        var summary = Assert.Single(summaries);

        Assert.Null(summary.CoverImage);
        Assert.Null(summary.CoverImageAssetId);
        Assert.Null(summary.CoverImageAssetPublicId);
        Assert.Null(summary.ThumbnailUrl);
    }

    [Fact]
    public async Task GetFeaturedSummaryAsync_ReturnsPublicSummaryShape()
    {
        using var context = CreateContext();
        var asset = new ImageAsset
        {
            PublicId = "i_featured01",
            StorageKey = "articles/featured.webp",
            Kind = ImageAssetKind.ArticleCover,
            IsActive = true
        };
        context.ImageAssets.Add(asset);
        await context.SaveChangesAsync();

        context.Articles.Add(CreateArticle(
            "Featured article",
            "https://cfimg.example.com/file/articles/featured.webp",
            asset.Id));
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var summaries = await service.GetFeaturedSummaryAsync(1);
        var summary = Assert.Single(summaries);

        Assert.Null(summary.CoverImage);
        Assert.Equal("i_featured01", summary.CoverImageAssetPublicId);
        Assert.Equal("/images/thumb/i_featured01.webp", summary.ThumbnailUrl);
    }

    [Fact]
    public async Task GetPublicDetailByIdAsync_ReturnsFullContentWithPermanentThumbnail()
    {
        using var context = CreateContext();
        var asset = new ImageAsset
        {
            PublicId = "i_detail0001",
            StorageKey = "articles/detail.webp",
            Kind = ImageAssetKind.ArticleCover,
            IsActive = true
        };
        context.ImageAssets.Add(asset);
        await context.SaveChangesAsync();

        var article = CreateArticle(
            "Detail article",
            "https://cfimg.example.com/file/articles/detail.webp",
            asset.Id);
        article.Content = new string('x', 320);
        context.Articles.Add(article);
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var detail = await service.GetPublicDetailByIdAsync(article.Id);

        Assert.NotNull(detail);
        Assert.Null(detail.CoverImage);
        Assert.Equal(new string('x', 320), detail.Content);
        Assert.Equal("i_detail0001", detail.CoverImageAssetPublicId);
        Assert.Equal("/images/thumb/i_detail0001.webp", detail.ThumbnailUrl);
    }

    [Fact]
    public void BlogDbContext_MapsOptionalCoverImageAssetRelationship()
    {
        using var context = CreateContext();
        var articleType = context.Model.FindEntityType(typeof(Article));
        Assert.NotNull(articleType);

        var navigation = articleType.FindNavigation(nameof(Article.CoverImageAsset));
        Assert.NotNull(navigation);

        var foreignKey = navigation.ForeignKey;
        Assert.False(foreignKey.IsRequired);
        Assert.Equal(DeleteBehavior.SetNull, foreignKey.DeleteBehavior);
    }

    [Fact]
    public async Task Backfill_SkipsAbsoluteCoverOutsideAllowedSourceOrigin()
    {
        using var context = CreateContext();
        context.Articles.Add(CreateArticle(
            "Foreign cover",
            "https://other.example.com/file/articles/foreign.webp",
            null));
        await context.SaveChangesAsync();

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ImageAssets:AllowedSourceOrigin"] = "https://cfimg.example.com"
            })
            .Build();
        var backfill = new ImageAssetBackfillService(context, configuration);

        var updated = await backfill.BackfillArticleCoversAsync();

        Assert.Equal(0, updated);
        Assert.Empty(await context.ImageAssets.ToListAsync());
    }

    public void Dispose()
    {
        _connection.Dispose();
    }

    private BlogDbContext CreateContext()
    {
        return new BlogDbContext(_options);
    }

    private static ArticleService CreateService(BlogDbContext context)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ImageAssets:AllowedSourceOrigin"] = "https://cfimg.example.com"
            })
            .Build();

        return new ArticleService(
            context,
            new ImageAssetUrlService(),
            new ImageAssetBackfillService(context, configuration));
    }

    private static Article CreateArticle(string title, string? coverImage, int? coverImageAssetId)
    {
        return new Article
        {
            Title = title,
            Slug = title.ToLowerInvariant().Replace(' ', '-'),
            Content = "<p>body</p>",
            ContentMarkdown = "body",
            CoverImage = coverImage,
            CoverImageAssetId = coverImageAssetId,
            Category = ArticleCategory.Study,
            Tags = new List<string>(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private static async Task<List<ArticleSummaryDto>> GetSummaryDataAsync(ArticleService service)
    {
        var result = await service.GetAllSummaryAsync();
        var data = result.GetType().GetProperty("data")?.GetValue(result);
        return Assert.IsType<List<ArticleSummaryDto>>(data);
    }
}
