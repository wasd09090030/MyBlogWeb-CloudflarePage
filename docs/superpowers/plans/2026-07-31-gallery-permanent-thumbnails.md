# Gallery Permanent Thumbnails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every public gallery image use the stable, immutable `/images/thumb/i_<publicId>.webp` path already used by article covers.

**Architecture:** Persist an optional `ImageAsset` relationship on each gallery record and use that relationship to generate permanent thumbnail URLs. The public gallery endpoint exposes only a public DTO with `thumbnailUrl`; the admin endpoint retains the source `imageUrl`. A protected backfill operation binds legacy `cfimg.../file/...` gallery records before regenerating the static site.

**Tech Stack:** .NET 8, Entity Framework Core with SQLite, ASP.NET Core controllers, Nuxt 4/Vue 3, Cloudflare Worker image route, xUnit.

---

## File Structure

- `backend-dotnet/BlogApi/Models/Gallery.cs`: gallery-to-image-asset foreign key and navigation.
- `backend-dotnet/BlogApi/Data/BlogDbContext.cs`: EF column and optional relationship mapping.
- `backend-dotnet/BlogApi/Services/DatabaseSchemaService.cs`: live SQLite schema upgrade for `galleries.imageAssetId`.
- `backend-dotnet/BlogApi/Services/ImageAssetBackfillService.cs`: shared controlled-origin asset resolver plus gallery backfill.
- `backend-dotnet/BlogApi/Services/GalleryService.cs`: asset binding on mutations and permanent thumbnail assignment.
- `backend-dotnet/BlogApi/DTOs/GalleryDto.cs`: public response model and backfill result model.
- `backend-dotnet/BlogApi/Controllers/GalleryController.cs`: public DTO projection and authorized backfill route.
- `backend-dotnet/BlogApi.Tests/GalleryPermanentThumbnailTests.cs`: isolated SQLite coverage of the new contract.
- `nuxt-admin/server/routes/admin/api/[...path].ts`: allow the new authorized BFF endpoint.
- `nuxt-admin/app/pages/admin/gallery/index.vue`: one-click backfill control for operators.
- `nuxt-public/app/features/gallery-public/services/gallery.repository.ts`: public gallery payload type without source URLs.
- `nuxt-public/app/features/gallery-public/containers/GalleryPageContainer.vue`: remove expiration probing and client refresh.
- `nuxt-public/app/features/gallery-public/utils/imageLoader.ts`: preload permanent URLs only.
- `nuxt-public/app/features/gallery-public/utils/masonryLayout.ts`: use permanent URL as the stable image key fallback.
- `nuxt-public/app/features/gallery-public/components/{AccordionGallery,CoverflowGallery,FadeSlideshow,GalleryContent,GalleryHeroSection,GalleryMasonryList,GameGallerySection}.vue`: render permanent URLs only and never retry source URLs.

### Task 1: Define and Test the Persistent Asset Contract

**Files:**
- Create: `backend-dotnet/BlogApi.Tests/GalleryPermanentThumbnailTests.cs`
- Modify: `backend-dotnet/BlogApi/Models/Gallery.cs`
- Modify: `backend-dotnet/BlogApi/Data/BlogDbContext.cs`
- Modify: `backend-dotnet/BlogApi/Services/DatabaseSchemaService.cs`

- [ ] **Step 1: Write the failing EF relationship test.**

```csharp
[Fact]
public void BlogDbContext_MapsOptionalGalleryImageAssetRelationship()
{
    using var context = CreateContext();
    var galleryType = context.Model.FindEntityType(typeof(Gallery));
    var navigation = galleryType!.FindNavigation(nameof(Gallery.ImageAsset));

    Assert.NotNull(navigation);
    Assert.False(navigation!.ForeignKey.IsRequired);
    Assert.Equal(DeleteBehavior.SetNull, navigation.ForeignKey.DeleteBehavior);
}
```

- [ ] **Step 2: Run the single test to verify it fails.**

Run: `dotnet test backend-dotnet/BlogApi.Tests --filter FullyQualifiedName~GalleryPermanentThumbnailTests.BlogDbContext_MapsOptionalGalleryImageAssetRelationship`

Expected: FAIL because `Gallery.ImageAsset` and `Gallery.ImageAssetId` do not exist.

- [ ] **Step 3: Add the nullable model property and explicit EF mapping.**

```csharp
// Gallery.cs
public int? ImageAssetId { get; set; }
public ImageAsset? ImageAsset { get; set; }

// BlogDbContext.cs, Gallery configuration
entity.Property(e => e.ImageAssetId).HasColumnName("imageAssetId");
entity.HasOne(e => e.ImageAsset)
    .WithMany()
    .HasForeignKey(e => e.ImageAssetId)
    .OnDelete(DeleteBehavior.SetNull);
```

- [ ] **Step 4: Extend the startup schema upgrade idempotently.**

```csharp
if (!await TableExistsAsync("galleries", cancellationToken))
{
    throw new InvalidOperationException("Cannot apply gallery image asset schema upgrade because required table 'galleries' does not exist.");
}

if (!await ColumnExistsAsync("galleries", "imageAssetId", cancellationToken))
{
    await ExecuteNonQueryAsync(
        "ALTER TABLE galleries ADD COLUMN imageAssetId INTEGER NULL;",
        cancellationToken);
}
```

- [ ] **Step 5: Run the test and the backend build.**

Run: `dotnet test backend-dotnet/BlogApi.Tests --filter FullyQualifiedName~GalleryPermanentThumbnailTests.BlogDbContext_MapsOptionalGalleryImageAssetRelationship`

Expected: PASS.

Run: `dotnet build backend-dotnet/BlogApi/BlogApi.csproj`

Expected: Build succeeded with no errors.

- [ ] **Step 6: Commit the schema contract.**

```powershell
git add backend-dotnet/BlogApi/Models/Gallery.cs backend-dotnet/BlogApi/Data/BlogDbContext.cs backend-dotnet/BlogApi/Services/DatabaseSchemaService.cs backend-dotnet/BlogApi.Tests/GalleryPermanentThumbnailTests.cs
git commit -m "feat: 关联画廊与永久图片素材"
```

### Task 2: Create and Backfill Controlled-Origin Gallery Assets

**Files:**
- Modify: `backend-dotnet/BlogApi/Services/ImageAssetBackfillService.cs`
- Modify: `backend-dotnet/BlogApi.Tests/GalleryPermanentThumbnailTests.cs`

- [ ] **Step 1: Write failing tests for controlled-origin creation and gallery backfill.**

```csharp
[Fact]
public async Task BackfillGalleriesAsync_BindsCfimgFileSourceToGalleryAsset()
{
    using var context = CreateContext();
    context.Galleries.Add(new Gallery { ImageUrl = "https://cfimg.example.com/file/gallery/a.webp" });
    await context.SaveChangesAsync();

    var result = await CreateBackfillService(context).BackfillGalleriesAsync();
    var gallery = await context.Galleries.SingleAsync();

    Assert.Equal(1, result.Updated);
    Assert.NotNull(gallery.ImageAssetId);
    Assert.Equal(ImageAssetKind.Gallery, (await context.ImageAssets.SingleAsync()).Kind);
}

[Fact]
public async Task BackfillGalleriesAsync_SkipsSourceOutsideAllowedOrigin()
{
    using var context = CreateContext();
    context.Galleries.Add(new Gallery { ImageUrl = "https://other.example.com/file/gallery/a.webp" });
    await context.SaveChangesAsync();

    var result = await CreateBackfillService(context).BackfillGalleriesAsync();

    Assert.Equal(0, result.Updated);
    Assert.Equal(1, result.Skipped);
    Assert.Null((await context.Galleries.SingleAsync()).ImageAssetId);
}
```

- [ ] **Step 2: Run the two tests to verify they fail.**

Run: `dotnet test backend-dotnet/BlogApi.Tests --filter FullyQualifiedName~GalleryPermanentThumbnailTests.BackfillGalleriesAsync`

Expected: FAIL because `BackfillGalleriesAsync` and its result type do not exist.

- [ ] **Step 3: Generalize the existing article-only resolver without changing its accepted-origin rule.**

```csharp
public async Task<int?> GetOrCreateImageAssetIdAsync(string? imageUrl, ImageAssetKind kind)
{
    if (string.IsNullOrWhiteSpace(imageUrl)) return null;
    var normalizedUrl = imageUrl.Trim();
    var storageKey = ExtractStorageKey(normalizedUrl);
    if (string.IsNullOrWhiteSpace(storageKey) || !IsAllowedImageSource(normalizedUrl, storageKey)) return null;

    var publicId = BuildPublicId(storageKey);
    var asset = await _context.ImageAssets.FirstOrDefaultAsync(a => a.PublicId == publicId);
    if (asset == null)
    {
        asset = new ImageAsset { PublicId = publicId, StorageKey = storageKey, SourceUrl = normalizedUrl, Kind = kind, ContentType = GuessContentType(storageKey), Version = 1, IsActive = true };
        _context.ImageAssets.Add(asset);
        await _context.SaveChangesAsync();
    }
    return asset.Id;
}

public Task<int?> GetOrCreateArticleCoverAssetIdAsync(string? coverImage) =>
    GetOrCreateImageAssetIdAsync(coverImage, ImageAssetKind.ArticleCover);
```

- [ ] **Step 4: Add a result model and gallery backfill implementation.**

```csharp
public async Task<GalleryImageAssetBackfillResultDto> BackfillGalleriesAsync()
{
    var galleries = await _context.Galleries.Where(g => g.ImageAssetId == null).ToListAsync();
    var result = new GalleryImageAssetBackfillResultDto { Total = galleries.Count };
    foreach (var gallery in galleries)
    {
        var assetId = await GetOrCreateImageAssetIdAsync(gallery.ImageUrl, ImageAssetKind.Gallery);
        if (!assetId.HasValue) { result.Skipped++; continue; }
        gallery.ImageAssetId = assetId;
        gallery.UpdatedAt = DateTime.UtcNow;
        result.Updated++;
    }
    await _context.SaveChangesAsync();
    return result;
}
```

- [ ] **Step 5: Run the focused tests and article thumbnail regression tests.**

Run: `dotnet test backend-dotnet/BlogApi.Tests --filter "FullyQualifiedName~GalleryPermanentThumbnailTests|FullyQualifiedName~ArticleServiceThumbnailTests"`

Expected: PASS.

- [ ] **Step 6: Commit asset creation and backfill.**

```powershell
git add backend-dotnet/BlogApi/Services/ImageAssetBackfillService.cs backend-dotnet/BlogApi/DTOs/GalleryDto.cs backend-dotnet/BlogApi.Tests/GalleryPermanentThumbnailTests.cs
git commit -m "feat: 支持画廊永久素材回填"
```

### Task 3: Serve Permanent Thumbnails and Bind Them on Gallery Mutations

**Files:**
- Modify: `backend-dotnet/BlogApi/Services/GalleryService.cs`
- Modify: `backend-dotnet/BlogApi/DTOs/GalleryDto.cs`
- Modify: `backend-dotnet/BlogApi/Controllers/GalleryController.cs`
- Modify: `backend-dotnet/BlogApi.Tests/GalleryPermanentThumbnailTests.cs`

- [ ] **Step 1: Write failing public-contract tests.**

```csharp
[Fact]
public async Task GetAllActiveAsync_UsesPermanentThumbnailWithoutExpiringFallback()
{
    using var context = CreateContext();
    var asset = new ImageAsset { PublicId = "i_galleryAsset01", StorageKey = "gallery/a.webp", IsActive = true };
    context.ImageAssets.Add(asset);
    context.Galleries.Add(new Gallery { ImageUrl = "https://cfimg.example.com/file/gallery/a.webp", ImageAsset = asset, IsActive = true });
    await context.SaveChangesAsync();

    var gallery = Assert.Single(await CreateGalleryService(context).GetAllActiveAsync());
    Assert.Equal("/images/thumb/i_galleryAsset01.webp", gallery.ThumbnailUrl);
}

[Fact]
public async Task UpdateAsync_WhenImageUrlChanges_BindsTheNewGalleryAsset()
{
    using var context = CreateContext();
    var gallery = new Gallery { ImageUrl = "https://cfimg.example.com/file/gallery/old.webp" };
    context.Galleries.Add(gallery);
    await context.SaveChangesAsync();

    var updated = await CreateGalleryService(context).UpdateAsync(gallery.Id, new UpdateGalleryDto { ImageUrl = "https://cfimg.example.com/file/gallery/new.webp" });
    Assert.NotNull(updated!.ImageAssetId);
    Assert.Equal("gallery/new.webp", (await context.ImageAssets.FindAsync(updated.ImageAssetId))!.StorageKey);
}
```

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `dotnet test backend-dotnet/BlogApi.Tests --filter "FullyQualifiedName~GalleryPermanentThumbnailTests.GetAllActiveAsync|FullyQualifiedName~GalleryPermanentThumbnailTests.UpdateAsync"`

Expected: FAIL because the gallery service still calls `ThumbnailUrlBuilder` and does not bind `ImageAssetId`.

- [ ] **Step 3: Replace expiring thumbnail construction with navigation-based permanent paths.**

```csharp
private readonly ImageAssetBackfillService _imageAssetBackfillService;
private readonly ImageAssetUrlService _imageAssetUrlService;

private void ApplyThumbnailUrls(IEnumerable<Gallery> galleries)
{
    foreach (var gallery in galleries)
    {
        gallery.ThumbnailUrl = _imageAssetUrlService.BuildThumbnailUrl(gallery.ImageAsset);
    }
}
```

Load collections and single records with `.Include(g => g.ImageAsset)`. On `CreateAsync`, image URL replacement in `UpdateAsync`, and `BatchImportAsync`, assign the result of `GetOrCreateImageAssetIdAsync(url, ImageAssetKind.Gallery)` before saving. Do not alter `ImageAssetId` for metadata-only updates.

- [ ] **Step 4: Define a public response DTO and authorized backfill route.**

```csharp
public class PublicGalleryDto
{
    public int Id { get; set; }
    public string? ThumbnailUrl { get; set; }
    public int? ImageWidth { get; set; }
    public int? ImageHeight { get; set; }
    public string Tag { get; set; } = "artwork";
    public DateTime CreatedAt { get; set; }
}

[HttpPost("backfill-image-assets")]
[Authorize]
public async Task<ActionResult<GalleryImageAssetBackfillResultDto>> BackfillImageAssets() =>
    Ok(await _imageAssetBackfillService.BackfillGalleriesAsync());
```

Inject `ImageAssetBackfillService` into `GalleryController`. Map `GetAllActive` to `PublicGalleryDto`, omitting `ImageUrl`; leave `/api/gallery/admin` unchanged so the admin retains source URLs.

- [ ] **Step 5: Run service tests and build.**

Run: `dotnet test backend-dotnet/BlogApi.Tests --filter FullyQualifiedName~GalleryPermanentThumbnailTests`

Expected: PASS, including no `exp` or `sig` in returned thumbnails.

Run: `dotnet build backend-dotnet/BlogApi/BlogApi.csproj`

Expected: Build succeeded with no errors.

- [ ] **Step 6: Commit public contract and mutation behavior.**

```powershell
git add backend-dotnet/BlogApi/Services/GalleryService.cs backend-dotnet/BlogApi/DTOs/GalleryDto.cs backend-dotnet/BlogApi/Controllers/GalleryController.cs backend-dotnet/BlogApi.Tests/GalleryPermanentThumbnailTests.cs
git commit -m "feat: 画廊改用永久缩略图路径"
```

### Task 4: Switch Public Gallery Rendering to Permanent URLs

**Files:**
- Modify: `nuxt-public/app/features/gallery-public/services/gallery.repository.ts`
- Modify: `nuxt-public/app/features/gallery-public/containers/GalleryPageContainer.vue`
- Modify: `nuxt-public/app/features/gallery-public/utils/imageLoader.ts`
- Modify: `nuxt-public/app/features/gallery-public/utils/masonryLayout.ts`
- Modify: `nuxt-public/app/features/gallery-public/components/AccordionGallery.vue`
- Modify: `nuxt-public/app/features/gallery-public/components/CoverflowGallery.vue`
- Modify: `nuxt-public/app/features/gallery-public/components/FadeSlideshow.vue`
- Modify: `nuxt-public/app/features/gallery-public/components/GalleryContent.vue`
- Modify: `nuxt-public/app/features/gallery-public/components/GalleryHeroSection.vue`
- Modify: `nuxt-public/app/features/gallery-public/components/GalleryMasonryList.vue`
- Modify: `nuxt-public/app/features/gallery-public/components/GameGallerySection.vue`

- [ ] **Step 1: Update the public payload type before changing templates.**

```ts
export type GalleryItem = {
  id: number
  thumbnailUrl?: string | null
  imageWidth?: number | null
  imageHeight?: number | null
  tag?: string
  createdAt?: string
}
```

- [ ] **Step 2: Remove expiration refresh and preload only stable URLs.**

```ts
// GalleryPageContainer.vue: remove galleryClient, THUMB_EXP_REFRESH_BUFFER_SECONDS,
// readThumbnailExp, hasExpiredThumbnailUrls, refreshGalleriesIfThumbnailExpired,
// and the refresh call from onMounted.

const urls = imagesToPreload
  .map((gallery) => gallery.thumbnailUrl)
  .filter((url): url is string => Boolean(url))
```

Set preloading counts from the filtered URL list and keep `previewImages` as the selected gallery records so existing layout components retain their inputs.

- [ ] **Step 3: Remove every raw-URL fallback from public image components.**

```vue
<img :src="item.thumbnailUrl || ''" ... />
```

```ts
const getImageUrl = (image: { thumbnailUrl?: string | null }) => image.thumbnailUrl || ''
const hasImage = (image) => Boolean(getImageUrl(image)) && !imageErrorMap.value[getImageKey(image)]
const handleImageError = (image) => {
  imageErrorMap.value[getImageKey(image)] = true
  imageLoadedMap.value[getImageKey(image)] = true
  scheduleLayout()
}
```

Apply this same rule to all files listed in this task, including `FadeSlideshow.vue` and the fullscreen image in `GalleryContent.vue`. Remove retry logic that assigns `target.src = image.imageUrl`. In `masonryLayout.ts`, use `thumbnailUrl` after `id` as the key fallback.

- [ ] **Step 4: Perform static source checks for prohibited behavior.**

Run: `rg -n "refreshGalleriesIfThumbnailExpired|readThumbnailExp|THUMB_EXP_REFRESH_BUFFER_SECONDS|target\.src =.*imageUrl" nuxt-public/app/features/gallery-public`

Expected: no matches.

Run: `rg -n "thumbnailUrl \|\| .*imageUrl|imageUrl \|\| thumbnailUrl" nuxt-public/app/features/gallery-public`

Expected: no matches in public rendering or loading code.

- [ ] **Step 5: Generate the static site against a backend that has completed backfill.**

Run: `npm run generate` from `nuxt-public`

Expected: static generation succeeds and the `/gallery` payload contains `/images/thumb/i_` paths without `exp=`.

- [ ] **Step 6: Commit the public rendering transition.**

```powershell
git add nuxt-public/app/features/gallery-public
git commit -m "feat: 画廊前台只使用永久缩略图"
```

### Task 5: Expose Backfill Through the Admin BFF and Verify the Release Path

**Files:**
- Modify: `nuxt-admin/server/routes/admin/api/[...path].ts`
- Modify: `nuxt-admin/app/pages/admin/gallery/index.vue`

- [ ] **Step 1: Permit the new protected route in the BFF allowlist.**

```ts
/^gallery(?:\/admin|\/backfill-image-assets|\/refresh-dimensions|\/batch\/(sort-order|import)|\/\d+(?:\/(toggle-active|dimensions))?)?$/
```

- [ ] **Step 2: Add a backfill action with success and error feedback.**

```ts
const backfilling = ref(false)
async function backfillImageAssets() {
  backfilling.value = true
  try {
    const result = await api.post<{ updated: number; skipped: number }>('gallery/backfill-image-assets')
    toast.add({ title: `已迁移 ${result.updated} 张，跳过 ${result.skipped} 张`, color: 'success' })
    await refresh()
  } finally {
    backfilling.value = false
  }
}
```

Add a `UButton` using `i-lucide-refresh-cw`, bind `:loading="backfilling"`, and invoke `backfillImageAssets`. Keep the existing raw-source thumbnail in the admin card unchanged.

- [ ] **Step 3: Run local verification.**

Run: `npm run build` from `nuxt-admin`

Expected: SSR build succeeds.

Run: `dotnet test backend-dotnet/BlogApi.Tests`

Expected: PASS.

- [ ] **Step 4: Perform the post-deploy operational sequence.**

1. Deploy backend and Worker-compatible code.
2. Open `/admin/gallery` and run “迁移永久缩略图”; confirm `skipped` is `0`.
3. Trigger the existing Cloudflare Pages deploy hook and wait for the static build to finish.
4. Load `/gallery`, confirm network image paths are `/images/thumb/i_<publicId>.webp`, their responses have `Cache-Control: public, max-age=31536000, immutable`, and no gallery-list refresh request is made after hydration.

- [ ] **Step 5: Commit the admin operation.**

```powershell
git add nuxt-admin/server/routes/admin/api/[...path].ts nuxt-admin/app/pages/admin/gallery/index.vue
git commit -m "feat: 后台支持画廊素材迁移"
```

## Plan Self-Review

- Spec coverage: Tasks 1-3 implement the nullable relation, controlled-origin asset creation, permanent public DTO, mutation binding, and authorized backfill. Task 4 removes expiring frontend behavior and raw fallback. Task 5 enables the required operator action and release verification.
- Placeholder scan: no TBD/TODO/“implement later” markers; commands, expected results, route names, DTO names, and method names are defined in the tasks that introduce them.
- Type consistency: `ImageAssetId`, `ImageAsset`, `PublicGalleryDto`, `GalleryImageAssetBackfillResultDto`, `BackfillGalleriesAsync`, and `backfill-image-assets` are used consistently across the plan.
