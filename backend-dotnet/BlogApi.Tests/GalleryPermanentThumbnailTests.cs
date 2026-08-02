using BlogApi.Data;
using BlogApi.DTOs;
using BlogApi.Models;
using BlogApi.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace BlogApi.Tests;

public class GalleryPermanentThumbnailTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<BlogDbContext> _options;

    public GalleryPermanentThumbnailTests()
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
    public void BlogDbContext_MapsOptionalGalleryImageAssetRelationship()
    {
        using var context = CreateContext();
        var galleryType = context.Model.FindEntityType(typeof(Gallery));
        Assert.NotNull(galleryType);

        var navigation = galleryType!.FindNavigation(nameof(Gallery.ImageAsset));
        Assert.NotNull(navigation);
        Assert.False(navigation!.ForeignKey.IsRequired);
        Assert.Equal(DeleteBehavior.SetNull, navigation.ForeignKey.DeleteBehavior);
    }

    [Fact]
    public async Task BackfillGalleriesAsync_BindsCfimgFileSourceToGalleryAsset()
    {
        using var context = CreateContext();
        context.Galleries.Add(new Gallery
        {
            ImageUrl = "https://cfimg.example.com/file/gallery/a.webp"
        });
        await context.SaveChangesAsync();

        var result = await CreateBackfillService(context).BackfillGalleriesAsync();
        var gallery = await context.Galleries.SingleAsync();

        Assert.Equal(1, result.Updated);
        Assert.Equal(0, result.Skipped);
        Assert.NotNull(gallery.ImageAssetId);
        Assert.Equal(ImageAssetKind.Gallery, (await context.ImageAssets.SingleAsync()).Kind);
    }

    [Fact]
    public async Task BackfillGalleriesAsync_SkipsSourceOutsideAllowedOrigin()
    {
        using var context = CreateContext();
        context.Galleries.Add(new Gallery
        {
            ImageUrl = "https://other.example.com/file/gallery/a.webp"
        });
        await context.SaveChangesAsync();

        var result = await CreateBackfillService(context).BackfillGalleriesAsync();

        Assert.Equal(0, result.Updated);
        Assert.Equal(1, result.Skipped);
        Assert.Null((await context.Galleries.SingleAsync()).ImageAssetId);
    }

    [Fact]
    public async Task GetAllActiveAsync_UsesPermanentThumbnailWithoutExpiringFallback()
    {
        using var context = CreateContext();
        var asset = new ImageAsset
        {
            PublicId = "i_galleryAsset01",
            StorageKey = "gallery/a.webp",
            Kind = ImageAssetKind.Gallery,
            IsActive = true
        };
        context.ImageAssets.Add(asset);
        context.Galleries.Add(new Gallery
        {
            ImageUrl = "https://cfimg.example.com/file/gallery/a.webp",
            ImageAsset = asset,
            IsActive = true
        });
        await context.SaveChangesAsync();

        var gallery = Assert.Single(await CreateGalleryService(context).GetAllActiveAsync());

        Assert.Equal("/images/thumb/i_galleryAsset01.webp", gallery.ThumbnailUrl);
    }

    [Fact]
    public async Task UpdateAsync_WhenImageUrlChanges_BindsTheNewGalleryAsset()
    {
        using var context = CreateContext();
        var gallery = new Gallery
        {
            ImageUrl = "https://cfimg.example.com/file/gallery/old.webp"
        };
        context.Galleries.Add(gallery);
        await context.SaveChangesAsync();

        var updated = await CreateGalleryService(context).UpdateAsync(
            gallery.Id,
            new UpdateGalleryDto
            {
                ImageUrl = "https://cfimg.example.com/file/gallery/new.webp"
            });

        Assert.NotNull(updated!.ImageAssetId);
        Assert.Equal(
            "gallery/new.webp",
            (await context.ImageAssets.FindAsync(updated.ImageAssetId))!.StorageKey);
    }

    public void Dispose()
    {
        _connection.Dispose();
    }

    private BlogDbContext CreateContext()
    {
        return new BlogDbContext(_options);
    }

    private static ImageAssetBackfillService CreateBackfillService(BlogDbContext context)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ImageAssets:AllowedSourceOrigin"] = "https://cfimg.example.com"
            })
            .Build();

        return new ImageAssetBackfillService(context, configuration);
    }

    private static GalleryService CreateGalleryService(BlogDbContext context)
    {
        return new GalleryService(
            context,
            new StubHttpClientFactory(),
            NullLogger<GalleryService>.Instance,
            CreateBackfillService(context),
            new ImageAssetUrlService());
    }

    private sealed class StubHttpClientFactory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name)
        {
            return new HttpClient(new NotFoundHttpMessageHandler());
        }
    }

    private sealed class NotFoundHttpMessageHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            return Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.NotFound));
        }
    }
}
