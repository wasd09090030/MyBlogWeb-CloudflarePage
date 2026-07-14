## Why

文章列表页（ArticleList）的封面图当前直接加载原图（`article.coverImage`），仅靠 CSS `object-fit: cover` 做视觉裁切，图片实际传输体积并未缩减。画廊模块已经有一套成熟的缩略图管线（`GalleryService` + `CfImageConfig`，基于 Cloudflare Image Resizing / Worker 生成小图），但 Article 从未接入，导致列表页在图片较多时加载慢、带宽浪费。详情页（ArticleDetail）需要展示原图以保证画质，不应受影响。

## What Changes

- 后端 `Article` 复用 `Gallery` 已有的缩略图生成模式：为文章摘要类 DTO（`ArticleSummaryDto`）追加 `ThumbnailUrl` 字段，由 `ArticleService` 结合 `CfImageConfig` 动态生成（不落库，运行时计算），生成逻辑与 `GalleryService.BuildThumbnailUrl` 系列方法一致。
- 完整文章 DTO（`ArticleWithCommentsDto`、详情接口返回的 `Article` 实体）**不**追加缩略图字段，保持只暴露原图 `CoverImage`。
- 前端 `ArticleCard.vue`（文章列表卡片）封面图 `src` 改为优先使用 `thumbnailUrl`，缺失时回退 `coverImage`，与 `GalleryMasonryList.vue` 的 `item.thumbnailUrl || item.imageUrl` 写法保持一致。
- 前端 `CoverImage.vue`（文章详情封面）保持使用 `article.coverImage`，不做改动。
- `CfImageConfig` 配置表复用画廊现有的同一份全局配置（不新增独立的文章图片配置），改动范围仅限于"新增消费方"。

## Capabilities

### New Capabilities
- `article-cover-image`: 文章封面图在列表场景返回并使用缩略图、详情场景使用原图的行为规范

### Modified Capabilities
（无：本次未修改现有 capability 的既有需求，仅新增文章封面图相关的行为规范）

## Impact

- 后端：`BlogApi/DTOs/ArticleDto.cs`（`ArticleSummaryDto` 新增字段）、`BlogApi/Services/ArticleService.cs`（`GetAllSummaryAsync`/`SearchAsync` 补齐缩略图 URL，需要注入 `CfImageConfig` 读取逻辑）
- 前端：`nuxt-public/app/features/article-list/components/ArticleCard.vue`（`src` 绑定调整）、`nuxt-public/app/features/article-list/types/article.ts` 或 `~/utils/workers/types` 中的 `ArticleLike` 类型（补充 `thumbnailUrl` 字段，若存在集中类型定义）
- 依赖：复用现有 `CfImageConfig` 表与 `CfImageConfigService`，不新增数据库表或配置项
- 不涉及 ArticleDetail / CoverImage.vue 改动
