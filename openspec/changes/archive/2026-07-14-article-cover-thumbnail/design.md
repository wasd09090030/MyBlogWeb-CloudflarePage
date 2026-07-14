## Context

画廊模块（`Gallery`/`GalleryService`）已经实现了一套完整的缩略图生成管线：`Gallery.ThumbnailUrl` 是 `[NotMapped]` 运行时字段，由 `GalleryService` 在查询时读取全局唯一的 `CfImageConfig` 配置，调用 `BuildThumbnailUrl` → `BuildCdnThumbnailUrl`（Cloudflare `cdn-cgi/image` 风格）或 `BuildWorkerThumbnailUrl`（自建 Worker 签名地址）生成。`Article` 目前完全没有接入这套机制，`ArticleSummaryDto`/`ArticleWithCommentsDto` 只有 `CoverImage` 一个图片字段。前端 `ArticleCard.vue`（列表）和 `CoverImage.vue`（详情）都直接绑定 `coverImage` 原图。

`CfImageConfig` 是全局单例配置（`_context.CfImageConfigs.AsNoTracking().FirstOrDefaultAsync()`），并非"画廊专属"，语义上是"站点统一的图片缩放配置"，因此可以直接被 Article 场景复用，无需新建配置表或区分业务线。

## Goals / Non-Goals

**Goals:**
- 文章列表/搜索摘要接口返回 `thumbnailUrl`，生成逻辑与画廊完全一致（同一份 `CfImageConfig`，同一套 URL 构造规则）
- ArticleCard.vue 优先使用 `thumbnailUrl`，缺失时回退 `coverImage`，不破坏现有加载态/错误态逻辑
- 详情页与非摘要接口不受影响，继续只暴露/使用原图

**Non-Goals:**
- 不新增独立的“文章图片配置”表，不做业务线隔离（画廊和文章共用同一份 `CfImageConfig`）
- 不改变图片存储/上传链路（仍是 Cloudflare R2 图床）
- 不给 `Article` 实体本身新增持久化字段，`ThumbnailUrl` 只在 DTO 层动态计算，不影响 `Article.cs` 或数据库迁移
- 不处理 `GetAllAsync`/`GetByCategoryAsync`/`GetFeaturedAsync`/`GetByIdAsync`/`GetWithPaginationAsync` 返回的完整 `Article` 实体（这些路径继续只有 `CoverImage`，不追加缩略图字段）

## Decisions

**1. 缩略图字段只加在 `ArticleSummaryDto`，不加在 `Article` 实体或 `ArticleWithCommentsDto`。**
理由：列表/卡片场景消费的是 `ArticleSummaryDto`（`GetAllSummaryAsync`、`SearchAsync`），详情场景消费的是完整 `Article` 实体或 `ArticleWithCommentsDto`。把字段限定在摘要 DTO，天然保证“列表用缩略图、详情用原图”的边界，不需要额外的前端字段过滤或后端参数控制。

备选方案 A（在 `Article` 实体上加 `[NotMapped] ThumbnailUrl`，像 `Gallery` 一样）：会导致详情接口 `GetById` 返回的完整实体也带上该字段，前端若不小心用错字段容易在详情页产生非预期的缩放图，且需要给所有返回 `Article` 实体的路径（`GetAllAsync`、`GetByCategoryAsync`、`GetFeaturedAsync`）都补齐赋值逻辑，改动面明显更大。放弃。

**2. 复用 `GalleryService` 里的 URL 构造逻辑，而非抽成公共 Service。**
理由：`BuildThumbnailUrl`/`BuildCdnThumbnailUrl`/`BuildWorkerThumbnailUrl`/`BuildSignature`/`BuildHmacSignature` 一组方法目前是 `GalleryService` 的 `private` 方法。按最小改动原则，将这组方法提取为独立的 `ThumbnailUrlBuilder`（静态类或轻量 service），供 `GalleryService` 和 `ArticleService` 共同调用，避免复制粘贴两份几乎相同的逻辑。

备选方案 B（直接复制一份到 `ArticleService`）：两处维护同一套签名算法和 URL 拼接规则，未来 `CfImageConfig` 格式调整时容易漏改一处。放弃，改为提取共享方法。

**3. `ArticleService` 读取 `CfImageConfig` 的方式与 `GalleryService` 保持一致（每次查询时 `AsNoTracking().FirstOrDefaultAsync()`）。**
理由：`CfImageConfig` 是极少变更的全局配置，直接查表足够，不引入缓存层，避免过度设计；与现有画廊代码风格一致。

**4. 前端只改 `ArticleCard.vue` 的 `:src` 表达式为 `article.thumbnailUrl || article.coverImage`，不新增 composable/utility。**
理由：画廊侧 `GalleryMasonryList.vue` 就是这样写的（`item.thumbnailUrl || item.imageUrl`），保持前端两处图片回退逻辑风格一致，改动量最小。

**5. `ArticleLike` 类型（`nuxt-public/app/utils/workers/types.ts`）补充可选字段 `thumbnailUrl?: string | null`。**
理由：`ArticleCard.vue`、缓存层、搜索 worker 都共享这一个类型，缺失字段会导致 TS 报错或静默使用 `any`。

## Risks / Trade-offs

- [风险] 提取 `ThumbnailUrlBuilder` 涉及改动 `GalleryService.cs` 现有代码（把 private 方法移出去），存在改动现有画廊功能的回归风险 → 缓解：提取时保持方法签名和逻辑完全不变，仅做“移动+改可见性”，不修改任何分支逻辑；提取后手动验证画廊列表缩略图仍正常显示。
- [风险] `SearchAsync` 目前一次查最多 50 条摘要，补齐缩略图需要多一次 `CfImageConfig` 查询（每次请求一次，而非每条文章一次）→ 影响极小，可接受，且与 `GalleryService.ApplyThumbnailUrlsAsync` 的批量模式一致（一次查询配置，循环内直接用内存中的 config 对象）。
- [权衡] `ArticleSummaryDto.ThumbnailUrl` 与 `Gallery.ThumbnailUrl` 不同的是它不是 `[NotMapped]` 实体属性而是纯 DTO 字段——因为 `Article` 实体本身不需要暴露这个字段，两者的实现位置不同但效果一致，需要在代码注释或 PR 描述中说明差异，避免后续维护者疑惑“为什么 Article 没有和 Gallery 一样的 NotMapped 属性”。

## Migration Plan

无需数据库迁移（`ThumbnailUrl` 是 DTO 计算字段，不持久化）。部署顺序：
1. 后端先部署（新增字段是纯增量，向后兼容，旧前端忽略未知字段不受影响）
2. 前端随后部署，切换 `ArticleCard.vue` 的 `src` 绑定
3. 无需数据回填、无需 feature flag，可直接一次性发布

回滚：若发现缩略图链路异常（如 Worker 签名失效导致 403），可直接将全局 `CfImageConfig.IsEnabled` 置为 false，`BuildThumbnailUrl` 会自动回退返回原图地址，前后端都无需回滚代码。

## Open Questions

无。
