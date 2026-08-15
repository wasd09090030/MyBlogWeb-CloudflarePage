# ImageAssets 永久缩略图部署注意事项（已归档）

> ⚠️ 已归档（2026-08-15）：本文档描述的 `backend-dotnet` 后端、云服务器 Worker 与 `server.wasd09090030.top` 均已下线删除，仅作历史参考。

本文记录文章封面永久缩略图链路的部署步骤、配置项、验证清单和回滚方式。部署时不要只看构建是否成功，这条链路涉及后端、Worker、数据回填和静态站重新生成。

## 目标

- 公共端和 SSG payload 不再包含短期签名缩略图 URL。
- 公共端不再接收原始 R2/image-bed `coverImage` URL。
- 公共端图片统一使用稳定 URL：`/images/thumb/{publicId}.webp`。
- 后台管理仍保留原始 `coverImage`，用于编辑和历史兼容。

## 必需配置

### 后端环境变量

生产环境必须设置：

```powershell
ImageAssets__ResolveToken=<long-random-secret>
ImageAssets__AllowedSourceOrigin=https://cfimg.wasd09090030.top
```

说明：

- `ImageAssets__ResolveToken` 只给 Worker 调内部解析接口使用，不能提交到 Git。
- `ImageAssets__AllowedSourceOrigin` 限制 backfill 可接受的历史封面来源。绝对 URL 必须来自该 origin 且路径为 `/file/*`，否则不会创建 `ImageAsset`。
- `appsettings.json` 里只能保留空 token 或非敏感默认值。

### Worker 变量和 Secret

普通变量：

```toml
IMAGE_ASSET_RESOLVE_URL = "https://server.wasd09090030.top/api/internal/image-assets"
IMAGE_ORIGIN_BASE = "https://cfimg.wasd09090030.top/file"
```

Secret：

```powershell
cd cloudflare-worker
npx wrangler secret put IMAGE_ASSET_RESOLVE_TOKEN
```

要求：

- `IMAGE_ASSET_RESOLVE_TOKEN` 必须和后端 `ImageAssets__ResolveToken` 完全一致。
- 不要把 `IMAGE_ASSET_RESOLVE_TOKEN` 写入 `wrangler.toml`。
- `IMAGE_ORIGIN_BASE` 要和后端允许的图床源保持同一来源，否则 backfill 成功的资产也可能在 Worker 侧 502。

## 推荐部署顺序

1. 备份生产 `blog.sqlite`。
2. 部署后端。
3. 设置后端 `ImageAssets__ResolveToken` 和 `ImageAssets__AllowedSourceOrigin`。
4. 启动后端，让启动 schema patch 创建 `image_assets` 和 `articles.coverImageAssetId`。
5. 配置并部署 Cloudflare Worker。
6. 设置 Worker vars 和 secret。
7. 用 admin JWT 执行一次文章封面回填。
8. 重新生成并部署 `nuxt-public` 静态站。
9. 做线上端到端验证。

## 数据回填

回填入口：

```http
POST /api/internal/image-assets/backfill/article-covers
Authorization: Bearer <admin JWT>
```

返回示例：

```json
{ "updated": 12 }
```

注意：

- 回填不会在后端启动时自动执行，这是刻意设计，避免每次部署都修改数据。
- 回填前必须备份数据库。
- 如果 `updated` 明显小于预期，优先检查历史 `coverImage` 是否来自 `ImageAssets__AllowedSourceOrigin`。
- 未回填文章在公共端不会显示缩略图，也不会回退到短期签名 URL 或原始 URL。

## 线上验证清单

后端接口：

```powershell
Invoke-RestMethod "https://server.wasd09090030.top/api/articles?summary=true&page=1&limit=8"
```

检查：

- 有资产的文章返回 `coverImageAssetPublicId`。
- 有资产的文章返回 `thumbnailUrl`，格式为 `/images/thumb/i_*.webp`。
- 公共响应中的 `coverImage` 应为 `null`。
- 响应体不应包含 `cfimg.wasd09090030.top/file` 或其他原图 URL。

内部解析接口：

```powershell
Invoke-WebRequest "https://server.wasd09090030.top/api/internal/image-assets/i_xxx" -SkipHttpErrorCheck
```

预期：无 token 返回 `401`，缺少后端 token 配置返回 `503`。

带 Worker token 验证：

```powershell
Invoke-RestMethod "https://server.wasd09090030.top/api/internal/image-assets/i_xxx" -Headers @{ Authorization = "Bearer <IMAGE_ASSET_RESOLVE_TOKEN>" }
```

预期：返回 `publicId`、`storageKey`、`sourceUrl`、`contentType`、`version`。

Worker 图片接口：

```powershell
Invoke-WebRequest "https://wasd09090030.top/images/thumb/i_xxx.webp" -SkipHttpErrorCheck
```

检查：

- 合法缩略图返回 `200`。
- `Content-Type` 为图片类型，通常是 `image/webp`。
- `Cache-Control` 包含 `public, max-age=31536000, immutable`。
- 非法路径如 `/images/thumb/bad.webp` 返回 `400`，不能落到旧 `/images` 代理。

浏览器验证：

- 打开首页和文章详情页，硬刷新。
- Network 中图片请求应为 `/images/thumb/i_*.webp`。
- 页面 payload/HTML 中不应出现原始图床 `/file/*` URL。
- 后台文章编辑页应仍能看到和编辑原始 `coverImage`。

## 回滚方式

后端回滚：

- 保留 `articles.coverImage` 原始字段。
- 如新链路异常，可临时清空或停用 `articles.coverImageAssetId`。
- 公共端不会自动回退到 legacy 缩略图，这是为了避免再次泄漏原图或短期签名 URL。

Worker 回滚：

- 可临时移除 `/images/thumb/*` handler，或让其返回错误。
- 旧 `/images` server proxy 不受影响。

数据回滚：

```sql
UPDATE articles SET coverImageAssetId = NULL;
DELETE FROM image_assets WHERE kind = 'article_cover';
```

执行前必须备份数据库。更稳妥的方式是直接恢复部署前备份。

## 已知验证限制

当前本地已验证：

- `dotnet build .\backend-dotnet\BlogApi\BlogApi.csproj`
- `dotnet test .\backend-dotnet\BlogApi.Tests\BlogApi.Tests.csproj`
- `node --check .\cloudflare-worker\router.js`
- `git diff --check HEAD`

当前前端 typecheck 仍受既有问题阻塞，不作为本次缩略图链路部署阻塞项：

- `#mdc-highlighter` 类型缺失。
- `nuxt-public/app/utils/avatar.ts` 参数顺序类型错误。
- `nuxt-public/app/utils/md5.ts` 的 `js-md5` 调用类型错误。
- `nuxt-public/app/utils/workers/articleSearch.worker.ts` 的 `never.length` 类型错误。
- `nuxt-public/nuxt.config.ts` 中 Nuxt/Vite 类型不匹配项。

这些问题应单独排期清理。部署本链路前，至少必须完成本文的后端、Worker、回填和浏览器验证。
