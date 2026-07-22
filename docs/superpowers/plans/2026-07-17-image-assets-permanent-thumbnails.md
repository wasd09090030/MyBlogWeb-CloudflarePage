# ImageAssets Permanent Thumbnails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build permanent, non-expiring article thumbnail URLs backed by an `ImageAssets` registry, so SSG payloads never contain short-lived signed thumbnail URLs and clients do not receive original R2 image URLs.

**Architecture:** The backend owns image metadata in a new `image_assets` table and returns stable thumbnail URLs such as `/images/thumb/i_abcd1234.webp`. The Worker handles `/images/thumb/*` before the existing `/images` proxy rule, resolves the opaque `publicId` through a backend-only endpoint protected by a service token, fetches the R2-backed source internally, applies fixed Cloudflare image transformation options, and returns long-lived cache headers. Existing article `coverImage` values remain usable during migration, but new list responses prefer `thumbnailUrl` generated from `ImageAsset.PublicId`.

**Tech Stack:** .NET 8 Web API, EF Core SQLite, Cloudflare Worker JavaScript, Cloudflare Image Transformations via Worker `cf.image`, Cloudflare R2-backed image origin.

---

## Scope Decisions

- This plan does not redesign the admin editor upload UI.
- This plan does not introduce a public endpoint that reveals R2 object keys.
- This plan does not allow client-controlled width, quality, format, fit, or source URL parameters.
- If the current R2 image-bed origin is publicly reachable, this plan hides the original URL from API responses but cannot make already-public originals private. True origin secrecy requires the source bucket/origin to be private or accessible only through a trusted Worker/origin-auth path.
- Keep `Article.CoverImage` for compatibility and migration. Add an asset association instead of deleting the old field.

## File Structure

- Create `backend-dotnet/BlogApi/Models/ImageAsset.cs`
  - Entity for opaque public image ids and internal R2/image-bed source metadata.
- Modify `backend-dotnet/BlogApi/Models/Article.cs`
  - Add nullable `CoverImageAssetId` navigation.
- Modify `backend-dotnet/BlogApi/Data/BlogDbContext.cs`
  - Add `DbSet<ImageAsset>`, table mapping, and article foreign key.
- Create `backend-dotnet/BlogApi/Services/ImageAssetUrlService.cs`
  - Builds stable public thumbnail URLs and validates public ids.
- Create `backend-dotnet/BlogApi/Services/ImageAssetResolveService.cs`
  - Resolves `publicId` to internal source metadata for the Worker.
- Create `backend-dotnet/BlogApi/Controllers/ImageAssetsController.cs`
  - Internal resolve endpoint protected by a Worker service token.
- Create `backend-dotnet/BlogApi/Services/DatabaseSchemaService.cs`
  - Applies minimal SQLite schema upgrades because the project currently uses `EnsureCreated()` and has no EF migrations.
- Modify `backend-dotnet/BlogApi/Program.cs`
  - Register new services and call schema upgrade after `EnsureCreated()`.
- Modify `backend-dotnet/BlogApi/DTOs/ArticleDto.cs`
  - Add `CoverImageAssetId`, `CoverImageAssetPublicId`, and keep `ThumbnailUrl`.
- Modify `backend-dotnet/BlogApi/Services/ArticleService.cs`
  - Include `ImageAsset` when building summaries and prefer stable asset thumbnails.
- Modify `backend-dotnet/BlogApi/Services/ThumbnailUrlBuilder.cs`
  - Stop producing expiring Worker URLs for article summaries once an `ImageAsset` exists.
- Modify `cloudflare-worker/router.js`
  - Handle `/images/thumb/*` in the Worker before the generic `/images` server proxy.
- Modify `cloudflare-worker/wrangler.toml`
  - Document required Worker vars and optional R2/image origin binding.
- Test with local shell commands because this repository currently has no backend or Worker test project.

## Public API Shape

Article summary response should become:

```json
{
  "id": 42,
  "title": "Example",
  "coverImage": null,
  "coverImageAssetPublicId": "i_7Kx29pQw3",
  "thumbnailUrl": "/images/thumb/i_7Kx29pQw3.webp",
  "category": "study",
  "createdAt": "2026-07-17T00:00:00Z"
}
```

Worker resolve endpoint response should be backend-only:

```json
{
  "publicId": "i_7Kx29pQw3",
  "storageKey": "articles/2026/07/cover.webp",
  "sourceUrl": "https://cfimg.example.com/file/articles/2026/07/cover.webp",
  "contentType": "image/webp",
  "version": 3
}
```

The browser must never call this resolve endpoint directly. The Worker calls it with `Authorization: Bearer <IMAGE_ASSET_RESOLVE_TOKEN>`.

---

### Task 1: Add Backend ImageAsset Model And Schema Mapping

**Files:**
- Create: `backend-dotnet/BlogApi/Models/ImageAsset.cs`
- Modify: `backend-dotnet/BlogApi/Models/Article.cs`
- Modify: `backend-dotnet/BlogApi/Data/BlogDbContext.cs`

- [x] **Step 1: Add `ImageAsset` entity**

Create `backend-dotnet/BlogApi/Models/ImageAsset.cs`:

```csharp
namespace BlogApi.Models
{
    public enum ImageAssetKind
    {
        ArticleCover,
        Gallery,
        Beatmap,
        Other
    }

    public class ImageAsset
    {
        public int Id { get; set; }
        public string PublicId { get; set; } = string.Empty;
        public string StorageKey { get; set; } = string.Empty;
        public string? SourceUrl { get; set; }
        public string? ContentType { get; set; }
        public int Version { get; set; } = 1;
        public ImageAssetKind Kind { get; set; } = ImageAssetKind.Other;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
```

- [x] **Step 2: Add article association**

Modify `backend-dotnet/BlogApi/Models/Article.cs`:

```csharp
public int? CoverImageAssetId { get; set; }
public ImageAsset? CoverImageAsset { get; set; }
```

Place these properties immediately after `public string? CoverImage { get; set; }`.

- [x] **Step 3: Map tables and relationships**

Modify `backend-dotnet/BlogApi/Data/BlogDbContext.cs`:

```csharp
public DbSet<ImageAsset> ImageAssets { get; set; }
```

Add this after `public DbSet<CfImageConfig> CfImageConfigs { get; set; }`.

Inside `Article` mapping, add:

```csharp
entity.Property(e => e.CoverImageAssetId).HasColumnName("coverImageAssetId");
entity.HasOne(e => e.CoverImageAsset)
    .WithMany()
    .HasForeignKey(e => e.CoverImageAssetId)
    .OnDelete(DeleteBehavior.SetNull);
```

Add an `ImageAsset` mapping block after the `CfImageConfig` block:

```csharp
modelBuilder.Entity<ImageAsset>(entity =>
{
    entity.ToTable("image_assets");
    entity.HasKey(e => e.Id);
    entity.Property(e => e.PublicId).HasColumnName("publicId").HasMaxLength(64).IsRequired();
    entity.Property(e => e.StorageKey).HasColumnName("storageKey").HasMaxLength(1024).IsRequired();
    entity.Property(e => e.SourceUrl).HasColumnName("sourceUrl").HasMaxLength(2048);
    entity.Property(e => e.ContentType).HasColumnName("contentType").HasMaxLength(128);
    entity.Property(e => e.Version).HasColumnName("version").HasDefaultValue(1);
    entity.Property(e => e.Kind)
        .HasColumnName("kind")
        .HasConversion(
            v => v.ToString().ToLowerInvariant(),
            v => string.IsNullOrEmpty(v)
                ? ImageAssetKind.Other
                : Enum.Parse<ImageAssetKind>(char.ToUpperInvariant(v[0]) + (v.Length > 1 ? v.Substring(1) : ""), true)
        )
        .HasDefaultValue(ImageAssetKind.Other);
    entity.Property(e => e.IsActive).HasColumnName("isActive").HasDefaultValue(true);
    entity.Property(e => e.CreatedAt).HasColumnName("createdAt").HasDefaultValueSql("CURRENT_TIMESTAMP");
    entity.Property(e => e.UpdatedAt).HasColumnName("updatedAt").HasDefaultValueSql("CURRENT_TIMESTAMP");
    entity.HasIndex(e => e.PublicId).IsUnique();
    entity.HasIndex(e => e.StorageKey);
});
```

- [x] **Step 4: Build backend**

Run:

```powershell
dotnet build .\backend-dotnet\BlogApi\BlogApi.csproj
```

Expected: build succeeds. If it fails, fix compile errors before proceeding.

---

### Task 2: Add Minimal SQLite Schema Upgrade Service

**Files:**
- Create: `backend-dotnet/BlogApi/Services/DatabaseSchemaService.cs`
- Modify: `backend-dotnet/BlogApi/Program.cs`

- [x] **Step 1: Add schema service**

Create `backend-dotnet/BlogApi/Services/DatabaseSchemaService.cs`:

```csharp
using Microsoft.EntityFrameworkCore;
using BlogApi.Data;

namespace BlogApi.Services
{
    public class DatabaseSchemaService
    {
        private readonly BlogDbContext _context;

        public DatabaseSchemaService(BlogDbContext context)
        {
            _context = context;
        }

        public async Task ApplyAsync()
        {
            await _context.Database.ExecuteSqlRawAsync("""
                CREATE TABLE IF NOT EXISTS image_assets (
                    Id INTEGER NOT NULL CONSTRAINT PK_image_assets PRIMARY KEY AUTOINCREMENT,
                    publicId TEXT NOT NULL,
                    storageKey TEXT NOT NULL,
                    sourceUrl TEXT NULL,
                    contentType TEXT NULL,
                    version INTEGER NOT NULL DEFAULT 1,
                    kind TEXT NOT NULL DEFAULT 'other',
                    isActive INTEGER NOT NULL DEFAULT 1,
                    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                """);

            await _context.Database.ExecuteSqlRawAsync("""
                CREATE UNIQUE INDEX IF NOT EXISTS IX_image_assets_publicId
                ON image_assets(publicId);
                """);

            await _context.Database.ExecuteSqlRawAsync("""
                CREATE INDEX IF NOT EXISTS IX_image_assets_storageKey
                ON image_assets(storageKey);
                """);

            var hasCoverImageAssetId = await ColumnExistsAsync("articles", "coverImageAssetId");
            if (!hasCoverImageAssetId)
            {
                await _context.Database.ExecuteSqlRawAsync("""
                    ALTER TABLE articles ADD COLUMN coverImageAssetId INTEGER NULL;
                    """);
            }
        }

        private async Task<bool> ColumnExistsAsync(string tableName, string columnName)
        {
            var connection = _context.Database.GetDbConnection();
            await using var command = connection.CreateCommand();
            command.CommandText = $"PRAGMA table_info({tableName});";

            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            await using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                if (string.Equals(reader["name"]?.ToString(), columnName, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        }
    }
}
```

- [x] **Step 2: Register and run schema service**

Modify `backend-dotnet/BlogApi/Program.cs` service registration:

```csharp
builder.Services.AddScoped<DatabaseSchemaService>();
```

Place it near the other scoped services.

Modify the startup database block:

```csharp
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<BlogDbContext>();
    dbContext.Database.EnsureCreated();
    var schemaService = scope.ServiceProvider.GetRequiredService<DatabaseSchemaService>();
    await schemaService.ApplyAsync();
}
```

- [x] **Step 3: Run backend once**

Run:

```powershell
dotnet run --project .\backend-dotnet\BlogApi\BlogApi.csproj
```

Expected: API starts without schema errors. Stop it after startup.

- [x] **Step 4: Verify SQLite schema**

Run:

```powershell
sqlite3 .\backend-dotnet\BlogApi\blog.sqlite "PRAGMA table_info(image_assets); PRAGMA table_info(articles);"
```

Expected: `image_assets` exists and `articles` includes `coverImageAssetId`.

---

### Task 3: Add Stable Thumbnail URL Service

**Files:**
- Create: `backend-dotnet/BlogApi/Services/ImageAssetUrlService.cs`
- Modify: `backend-dotnet/BlogApi/Program.cs`

- [x] **Step 1: Add URL service**

Create `backend-dotnet/BlogApi/Services/ImageAssetUrlService.cs`:

```csharp
using System.Text.RegularExpressions;
using BlogApi.Models;

namespace BlogApi.Services
{
    public class ImageAssetUrlService
    {
        private static readonly Regex PublicIdRegex = new(@"^i_[A-Za-z0-9_-]{8,48}$", RegexOptions.Compiled);

        public bool IsValidPublicId(string? publicId)
        {
            return !string.IsNullOrWhiteSpace(publicId) && PublicIdRegex.IsMatch(publicId);
        }

        public string? BuildThumbnailUrl(ImageAsset? asset)
        {
            if (asset == null || !asset.IsActive || !IsValidPublicId(asset.PublicId))
            {
                return null;
            }

            return $"/images/thumb/{asset.PublicId}.webp";
        }
    }
}
```

- [x] **Step 2: Register URL service**

Modify `backend-dotnet/BlogApi/Program.cs`:

```csharp
builder.Services.AddScoped<ImageAssetUrlService>();
```

- [x] **Step 3: Build backend**

Run:

```powershell
dotnet build .\backend-dotnet\BlogApi\BlogApi.csproj
```

Expected: build succeeds.

---

### Task 4: Return Stable Asset Thumbnails From Article Summaries

**Files:**
- Modify: `backend-dotnet/BlogApi/DTOs/ArticleDto.cs`
- Modify: `backend-dotnet/BlogApi/Services/ArticleService.cs`

- [x] **Step 1: Extend article summary DTO**

Modify `backend-dotnet/BlogApi/DTOs/ArticleDto.cs` `ArticleSummaryDto`:

```csharp
public int? CoverImageAssetId { get; set; }
public string? CoverImageAssetPublicId { get; set; }
```

Place these after `public string? CoverImage { get; set; }`.

- [x] **Step 2: Inject URL service into ArticleService**

Modify `backend-dotnet/BlogApi/Services/ArticleService.cs` constructor:

```csharp
private readonly BlogDbContext _context;
private readonly ImageAssetUrlService _imageAssetUrlService;

public ArticleService(BlogDbContext context, ImageAssetUrlService imageAssetUrlService)
{
    _context = context;
    _imageAssetUrlService = imageAssetUrlService;
}
```

- [x] **Step 3: Include asset in summary query**

In `GetAllSummaryAsync`, before `.Select(...)`, include cover assets:

```csharp
query = query.Include(a => a.CoverImageAsset);
```

In the `ArticleSummaryDto` projection, add:

```csharp
CoverImageAssetId = a.CoverImageAssetId,
CoverImageAssetPublicId = a.CoverImageAsset != null ? a.CoverImageAsset.PublicId : null,
ThumbnailUrl = a.CoverImageAsset != null
    ? _imageAssetUrlService.BuildThumbnailUrl(a.CoverImageAsset)
    : null,
```

- [x] **Step 4: Update search summary query**

In `SearchAsync`, include cover assets before `.Select(...)`:

```csharp
query = query.Include(a => a.CoverImageAsset);
```

Add the same `CoverImageAssetId`, `CoverImageAssetPublicId`, and `ThumbnailUrl` assignments to its projection.

- [x] **Step 5: Adjust legacy thumbnail fallback**

Modify `ApplyThumbnailUrlsAsync` loop:

```csharp
foreach (var summary in summaries)
{
    if (!string.IsNullOrWhiteSpace(summary.ThumbnailUrl)) continue;
    if (string.IsNullOrWhiteSpace(summary.CoverImage)) continue;
    summary.ThumbnailUrl = ThumbnailUrlBuilder.BuildThumbnailUrl(summary.CoverImage, config);
}
```

This preserves old articles while ensuring `ImageAsset` articles use permanent URLs.

- [x] **Step 6: Build backend**

Run:

```powershell
dotnet build .\backend-dotnet\BlogApi\BlogApi.csproj
```

Expected: build succeeds.

---

### Task 5: Add Worker Resolve Endpoint

**Files:**
- Create: `backend-dotnet/BlogApi/DTOs/ImageAssetDto.cs`
- Create: `backend-dotnet/BlogApi/Services/ImageAssetResolveService.cs`
- Create: `backend-dotnet/BlogApi/Controllers/ImageAssetsController.cs`
- Modify: `backend-dotnet/BlogApi/Program.cs`
- Modify: `backend-dotnet/BlogApi/appsettings.json`

- [x] **Step 1: Add resolve DTO**

Create `backend-dotnet/BlogApi/DTOs/ImageAssetDto.cs`:

```csharp
namespace BlogApi.DTOs
{
    public class ImageAssetResolveDto
    {
        public string PublicId { get; set; } = string.Empty;
        public string StorageKey { get; set; } = string.Empty;
        public string? SourceUrl { get; set; }
        public string? ContentType { get; set; }
        public int Version { get; set; }
    }
}
```

- [x] **Step 2: Add resolve service**

Create `backend-dotnet/BlogApi/Services/ImageAssetResolveService.cs`:

```csharp
using Microsoft.EntityFrameworkCore;
using BlogApi.Data;
using BlogApi.DTOs;

namespace BlogApi.Services
{
    public class ImageAssetResolveService
    {
        private readonly BlogDbContext _context;
        private readonly ImageAssetUrlService _urlService;

        public ImageAssetResolveService(BlogDbContext context, ImageAssetUrlService urlService)
        {
            _context = context;
            _urlService = urlService;
        }

        public async Task<ImageAssetResolveDto?> ResolveAsync(string publicId)
        {
            if (!_urlService.IsValidPublicId(publicId)) return null;

            var asset = await _context.ImageAssets
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.PublicId == publicId && a.IsActive);

            if (asset == null) return null;

            return new ImageAssetResolveDto
            {
                PublicId = asset.PublicId,
                StorageKey = asset.StorageKey,
                SourceUrl = asset.SourceUrl,
                ContentType = asset.ContentType,
                Version = asset.Version
            };
        }
    }
}
```

- [x] **Step 3: Add internal controller**

Create `backend-dotnet/BlogApi/Controllers/ImageAssetsController.cs`:

```csharp
using Microsoft.AspNetCore.Mvc;
using BlogApi.Services;

namespace BlogApi.Controllers
{
    [ApiController]
    [Route("api/internal/image-assets")]
    public class ImageAssetsController : ControllerBase
    {
        private readonly ImageAssetResolveService _resolveService;
        private readonly IConfiguration _configuration;

        public ImageAssetsController(ImageAssetResolveService resolveService, IConfiguration configuration)
        {
            _resolveService = resolveService;
            _configuration = configuration;
        }

        [HttpGet("{publicId}")]
        public async Task<IActionResult> Resolve(string publicId)
        {
            var expectedToken = _configuration["ImageAssets:ResolveToken"];
            if (string.IsNullOrWhiteSpace(expectedToken))
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, "Image asset resolve token is not configured");
            }

            var authorization = Request.Headers.Authorization.ToString();
            var actualToken = authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                ? authorization.Substring("Bearer ".Length).Trim()
                : string.Empty;

            if (!string.Equals(actualToken, expectedToken, StringComparison.Ordinal))
            {
                return Unauthorized();
            }

            var result = await _resolveService.ResolveAsync(publicId);
            return result == null ? NotFound() : Ok(result);
        }
    }
}
```

- [x] **Step 4: Register resolve service**

Modify `backend-dotnet/BlogApi/Program.cs`:

```csharp
builder.Services.AddScoped<ImageAssetResolveService>();
```

- [x] **Step 5: Add config key placeholder with empty value**

Modify `backend-dotnet/BlogApi/appsettings.json`:

```json
"ImageAssets": {
  "ResolveToken": ""
}
```

Production must set a non-empty secret via environment or server config.

- [x] **Step 6: Build backend**

Run:

```powershell
dotnet build .\backend-dotnet\BlogApi\BlogApi.csproj
```

Expected: build succeeds.

---

### Task 6: Add Worker Permanent Thumbnail Route

**Files:**
- Modify: `cloudflare-worker/router.js`
- Modify: `cloudflare-worker/wrangler.toml`

- [x] **Step 1: Add thumbnail route before generic server route**

Modify `cloudflare-worker/router.js` so `/images/thumb/{publicId}.webp` is handled before `SERVER_ROUTES`:

```js
const THUMB_ROUTE = /^\/images\/thumb\/(i_[A-Za-z0-9_-]{8,48})\.webp$/

async function handleThumbnail(request, env) {
  const url = new URL(request.url)
  const match = url.pathname.match(THUMB_ROUTE)
  if (!match) {
    return new Response('Invalid thumbnail path', { status: 400 })
  }

  const publicId = match[1]
  const resolveBaseUrl = env.IMAGE_ASSET_RESOLVE_URL
  const resolveToken = env.IMAGE_ASSET_RESOLVE_TOKEN
  const imageOriginBase = env.IMAGE_ORIGIN_BASE

  if (!resolveBaseUrl || !resolveToken || !imageOriginBase) {
    return new Response('Thumbnail service is not configured', { status: 503 })
  }

  const resolveResponse = await fetch(`${resolveBaseUrl.replace(/\/$/, '')}/${publicId}`, {
    headers: {
      Authorization: `Bearer ${resolveToken}`,
      Accept: 'application/json'
    },
    cf: {
      cacheTtl: 300,
      cacheEverything: true
    }
  })

  if (resolveResponse.status === 404) {
    return new Response('Thumbnail not found', { status: 404 })
  }

  if (!resolveResponse.ok) {
    return new Response('Thumbnail resolve failed', { status: 502 })
  }

  const asset = await resolveResponse.json()
  if (!asset || typeof asset.storageKey !== 'string' || !asset.storageKey) {
    return new Response('Invalid thumbnail asset', { status: 502 })
  }

  const sourceUrl = asset.sourceUrl || `${imageOriginBase.replace(/\/$/, '')}/${asset.storageKey.replace(/^\/+/, '')}`
  const sourceRequest = new Request(sourceUrl, {
    headers: {
      Accept: request.headers.get('Accept') || 'image/avif,image/webp,image/*,*/*'
    }
  })

  const imageResponse = await fetch(sourceRequest, {
    cf: {
      image: {
        fit: 'scale-down',
        width: 640,
        quality: 72,
        format: 'webp'
      },
      cacheTtl: 31536000,
      cacheEverything: true
    }
  })

  if (!imageResponse.ok) {
    return new Response('Thumbnail source failed', { status: 502 })
  }

  const response = new Response(imageResponse.body, imageResponse)
  response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  response.headers.set('Content-Type', imageResponse.headers.get('Content-Type') || 'image/webp')
  response.headers.delete('Set-Cookie')
  return response
}
```

Inside `fetch(request, env)`, before `const isServerRoute = ...`, add:

```js
if (THUMB_ROUTE.test(path)) {
  return handleThumbnail(request, env)
}
```

- [x] **Step 2: Document Worker vars**

Modify `cloudflare-worker/wrangler.toml`:

```toml
# Required production vars:
# IMAGE_ASSET_RESOLVE_URL = "https://server.wasd09090030.top/api/internal/image-assets"
# IMAGE_ASSET_RESOLVE_TOKEN = "set as Worker secret, not plain var"
# IMAGE_ORIGIN_BASE = "https://cfimg.wasd09090030.top/file"
```

- [x] **Step 3: Validate Worker syntax**

Run:

```powershell
node --check .\cloudflare-worker\router.js
```

Expected: no syntax errors.

---

### Task 7: Add Migration Path For Existing Article Covers

**Files:**
- Create: `backend-dotnet/BlogApi/Services/ImageAssetBackfillService.cs`
- Modify: `backend-dotnet/BlogApi/Program.cs`

- [x] **Step 1: Add backfill service**

Create `backend-dotnet/BlogApi/Services/ImageAssetBackfillService.cs`:

```csharp
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using BlogApi.Data;
using BlogApi.Models;

namespace BlogApi.Services
{
    public class ImageAssetBackfillService
    {
        private readonly BlogDbContext _context;

        public ImageAssetBackfillService(BlogDbContext context)
        {
            _context = context;
        }

        public async Task<int> BackfillArticleCoversAsync()
        {
            var articles = await _context.Articles
                .Where(a => a.CoverImageAssetId == null && a.CoverImage != null && a.CoverImage != "")
                .ToListAsync();

            var count = 0;
            foreach (var article in articles)
            {
                var coverImage = article.CoverImage!.Trim();
                var storageKey = ExtractStorageKey(coverImage);
                if (string.IsNullOrWhiteSpace(storageKey)) continue;

                var publicId = BuildPublicId(storageKey);
                var asset = await _context.ImageAssets.FirstOrDefaultAsync(a => a.PublicId == publicId);
                if (asset == null)
                {
                    asset = new ImageAsset
                    {
                        PublicId = publicId,
                        StorageKey = storageKey,
                        SourceUrl = coverImage.StartsWith("http", StringComparison.OrdinalIgnoreCase) ? coverImage : null,
                        Kind = ImageAssetKind.ArticleCover,
                        ContentType = GuessContentType(storageKey),
                        Version = 1,
                        IsActive = true
                    };
                    _context.ImageAssets.Add(asset);
                    await _context.SaveChangesAsync();
                }

                article.CoverImageAssetId = asset.Id;
                article.UpdatedAt = DateTime.UtcNow;
                count++;
            }

            await _context.SaveChangesAsync();
            return count;
        }

        private static string ExtractStorageKey(string coverImage)
        {
            if (Uri.TryCreate(coverImage, UriKind.Absolute, out var uri))
            {
                var path = uri.AbsolutePath.TrimStart('/');
                return path.StartsWith("file/", StringComparison.OrdinalIgnoreCase)
                    ? path.Substring("file/".Length)
                    : path;
            }

            return coverImage.TrimStart('/');
        }

        private static string BuildPublicId(string storageKey)
        {
            var hash = SHA256.HashData(Encoding.UTF8.GetBytes(storageKey));
            var token = Convert.ToBase64String(hash)
                .Replace("+", "-")
                .Replace("/", "_")
                .TrimEnd('=');
            return $"i_{token.Substring(0, 16)}";
        }

        private static string? GuessContentType(string storageKey)
        {
            var ext = Path.GetExtension(storageKey).ToLowerInvariant();
            return ext switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".webp" => "image/webp",
                ".gif" => "image/gif",
                ".avif" => "image/avif",
                _ => null
            };
        }
    }
}
```

- [x] **Step 2: Register service**

Modify `backend-dotnet/BlogApi/Program.cs`:

```csharp
builder.Services.AddScoped<ImageAssetBackfillService>();
```

- [x] **Step 3: Do not auto-run backfill in production startup**

Keep this service callable from a controlled one-off console/debug endpoint if needed. Do not call it automatically on every production startup because it mutates article rows.

Implemented controlled endpoint:

```http
POST /api/internal/image-assets/backfill/article-covers
Authorization: Bearer <admin JWT>
```

Response:

```json
{ "updated": 12 }
```

Implementation guardrail: backfill only creates assets for relative storage keys or absolute URLs matching `ImageAssets:AllowedSourceOrigin` and `/file/*`. This keeps Worker source resolution aligned with `IMAGE_ORIGIN_BASE + storageKey` and avoids creating permanent thumbnail records that would 502 after deployment.

- [x] **Step 4: Build backend**

Run:

```powershell
dotnet build .\backend-dotnet\BlogApi\BlogApi.csproj
```

Expected: build succeeds.

---

### Task 8: Verify End-To-End Manually

**Files:**
- No source changes.

**Current implementation note (2026-07-20):**

- Backend behavior is covered by `backend-dotnet/BlogApi.Tests` for public summaries, public detail DTOs, featured summaries, non-migrated fallback suppression, and EF relationship mapping.
- Local destructive/manual SQLite mutation against the production-like `blog.sqlite` was intentionally not performed in this workspace.
- Deployment-only steps remain for the operator: set production Worker vars/secrets, deploy, hard refresh the deployed site, and inspect real `/images/thumb/i_*.webp` network responses.

- [ ] **Step 1: Insert a test asset and link it to an article**

Run against a local copy of `blog.sqlite`:

```powershell
sqlite3 .\backend-dotnet\BlogApi\blog.sqlite "INSERT INTO image_assets(publicId, storageKey, sourceUrl, contentType, version, kind, isActive) VALUES('i_testAsset01','articles/test-cover.webp','https://cfimg.wasd09090030.top/file/articles/test-cover.webp','image/webp',1,'articlecover',1);"
sqlite3 .\backend-dotnet\BlogApi\blog.sqlite "UPDATE articles SET coverImageAssetId=(SELECT Id FROM image_assets WHERE publicId='i_testAsset01') WHERE id=(SELECT id FROM articles ORDER BY id DESC LIMIT 1);"
```

- [ ] **Step 2: Run backend with a local resolve token**

Run:

```powershell
$env:ImageAssets__ResolveToken='local-dev-token'
dotnet run --project .\backend-dotnet\BlogApi\BlogApi.csproj
```

Expected: API starts.

- [ ] **Step 3: Verify article summary returns permanent thumbnail**

Open in browser or use PowerShell:

```powershell
Invoke-RestMethod 'http://localhost:5000/api/articles?summary=true&page=1&limit=8'
```

Expected: the linked article includes:

```json
"coverImageAssetPublicId": "i_testAsset01",
"thumbnailUrl": "/images/thumb/i_testAsset01.webp"
```

- [ ] **Step 4: Verify internal resolve rejects unauthenticated calls**

Run:

```powershell
Invoke-WebRequest 'http://localhost:5000/api/internal/image-assets/i_testAsset01' -SkipHttpErrorCheck
```

Expected: HTTP 401.

- [ ] **Step 5: Verify internal resolve accepts Worker token**

Run:

```powershell
Invoke-RestMethod 'http://localhost:5000/api/internal/image-assets/i_testAsset01' -Headers @{ Authorization = 'Bearer local-dev-token' }
```

Expected: JSON includes `storageKey` and `sourceUrl`.

- [ ] **Step 6: Validate Worker syntax**

Run:

```powershell
node --check .\cloudflare-worker\router.js
```

Expected: no syntax errors.

Implementation note: the Worker now claims every `/images/thumb/*` path. Valid `/images/thumb/{publicId}.webp` requests are resolved; malformed thumbnail paths fail closed with HTTP 400 instead of falling through to the generic `/images` server proxy.

- [ ] **Step 7: Deploy/stage Worker vars**

Set production Worker secret:

```powershell
cd .\cloudflare-worker
npx wrangler secret put IMAGE_ASSET_RESOLVE_TOKEN
```

Set non-secret vars through Cloudflare dashboard or wrangler configuration:

```text
IMAGE_ASSET_RESOLVE_URL=https://server.wasd09090030.top/api/internal/image-assets
IMAGE_ORIGIN_BASE=https://cfimg.wasd09090030.top/file
```

- [ ] **Step 8: Verify browser behavior**

Open the deployed homepage, hard refresh, inspect Network:

```text
/images/thumb/i_*.webp -> 200
Cache-Control -> public, max-age=31536000, immutable
No response URL or JSON exposes the original R2 object URL in the article list payload.
```

---

## Risk And Rollback

- Backend rollback: keep `CoverImage` unchanged for admin/editing. Public summaries/details intentionally do not fall back to legacy thumbnail generation; unbackfilled articles show no public thumbnail rather than leaking original or expiring URLs.
- Worker rollback: remove the `/images/thumb/*` handler or route it to a static fallback. Existing `/images` server proxy remains unchanged.
- Data rollback: unset `articles.coverImageAssetId`; old `coverImage` values continue to work.
- Security risk: if `IMAGE_ASSET_RESOLVE_TOKEN` is empty in production, the resolve endpoint returns 503 and thumbnails fail closed.

## Self-Review

- Spec coverage: covers permanent URLs, no expiring SSG thumbnails, source URL hiding from API responses, Worker proxy, and cache invalidation via new public ids or asset versioning.
- Placeholder scan: no task depends on an unspecified path or undefined service.
- Type consistency: `ImageAsset.PublicId`, `Article.CoverImageAssetId`, `ArticleSummaryDto.CoverImageAssetPublicId`, and `/images/thumb/{publicId}.webp` are used consistently.
