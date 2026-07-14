## 1. 后端：提取共享缩略图 URL 构造逻辑

- [x] 1.1 新建 `BlogApi/Services/ThumbnailUrlBuilder.cs`，将 `GalleryService.cs` 中的 `BuildThumbnailUrl`、`BuildCdnThumbnailUrl`、`BuildWorkerThumbnailUrl`、`BuildSignature`、`BuildHmacSignature` 方法原样迁移过去（仅调整可见性为 `public static`，不修改任何分支逻辑）
- [x] 1.2 修改 `GalleryService.cs`，将上述方法的调用改为 `ThumbnailUrlBuilder.BuildThumbnailUrl(...)` 等，删除原有 private 方法定义
- [ ] 1.3 验证画廊接口（`GET /api/galleries`）返回的 `thumbnailUrl` 与迁移前一致（本地跑一次现有画廊单测/手动请求对比）

## 2. 后端：Article 摘要接口接入缩略图

- [x] 2.1 在 `BlogApi/DTOs/ArticleDto.cs` 的 `ArticleSummaryDto` 中新增 `public string? ThumbnailUrl { get; set; }` 字段
- [x] 2.2 修改 `ArticleService.cs` 的构造函数，注入 `BlogDbContext`（已有）用于查询 `CfImageConfig`
- [x] 2.3 修改 `ArticleService.GetAllSummaryAsync`：查询结果转换为 `ArticleSummaryDto` 列表后，读取一次 `CfImageConfig`（`AsNoTracking().FirstOrDefaultAsync()`），遍历补齐每条的 `ThumbnailUrl = ThumbnailUrlBuilder.BuildThumbnailUrl(dto.CoverImage, config)`，`CoverImage` 为空时 `ThumbnailUrl` 保持 null
- [x] 2.4 修改 `ArticleService.SearchAsync`：同样在返回前补齐 `ThumbnailUrl`（复用 2.3 的补齐逻辑，避免重复代码可提取为 `ArticleService` 内的私有方法 `ApplyThumbnailUrls(List<ArticleSummaryDto>)`）
- [x] 2.5 确认 `ArticleWithCommentsDto`、`Article` 实体、`GetAllAsync`/`GetByCategoryAsync`/`GetFeaturedAsync`/`GetByIdAsync`/`GetWithPaginationAsync` 均未被修改，不返回 `ThumbnailUrl`

## 3. 前端：类型与列表卡片改造

- [x] 3.1 在 `nuxt-public/app/utils/workers/types.ts` 的 `ArticleLike` 类型中新增可选字段 `thumbnailUrl?: string | null`
- [x] 3.2 修改 `nuxt-public/app/features/article-list/components/ArticleCard.vue` 第 18 行，将 `:src="article.coverImage"` 改为 `:src="article.thumbnailUrl || article.coverImage"`
- [x] 3.3 检查 `hasCoverImage` 计算属性（`ArticleCard.vue` 第 104-107 行）逻辑无需变化（仍基于 `coverImage` 判断是否存在封面图，缩略图仅影响 `src` 取值）

## 4. 验证

- [x] 4.1 启动后端 `backend-dotnet`，请求 `GET /api/articles?summary=true`，确认响应中每篇文章带 `thumbnailUrl` 字段，且在 `CfImageConfig.IsEnabled=true` 时值为缩放后地址、为 false 时回退为 `coverImage`
- [x] 4.2 请求 `GET /api/articles/{id}`，确认响应中**不**包含 `thumbnailUrl` 字段（保持仅有 `coverImage`）
- [x] 4.3 启动前端 `nuxt-public`，打开文章列表页，浏览器 DevTools Network 面板确认封面图请求的是缩略图地址（体积明显小于原图）
- [x] 4.4 打开任意一篇文章详情页，确认封面图请求的是原图地址（`coverImage`），未被替换为缩略图
- [x] 4.5 打开画廊页面，确认缩略图显示与本次改动前一致（回归验证任务 1 的方法迁移未破坏画廊功能）
- [x] 4.6 后端运行 `dotnet build`，前端运行类型检查（如 `pnpm typecheck` / `nuxi typecheck`，视项目现有脚本而定），确认无编译/类型错误
