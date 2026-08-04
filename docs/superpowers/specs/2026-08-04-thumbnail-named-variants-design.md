# 缩略图命名变体设计

> 日期：2026-08-04
> 状态：已确认（用户 2026-08-04 批准）

## 1. 背景与目标

当前博客的图片缩略图链路使用 Cloudflare Images 绑定做固定变换，参数按素材类型（`kind`）区分两套：文章封面 `640px / q75`、画廊及 `other` `960px / q85`。URL 固定为 `/images/thumb/{publicId}.webp`，客户端不能指定尺寸。

用户希望**精细化控制不同展示场景的缩放比例和分辨率**。经确认，采用**按展示场景命名变体**的方案：

- 文章卡片/相关文章：小图缩略图
- 画廊网格/手风琴/封面流：中图缩略图
- 画廊灯箱/首屏/游戏大图：大图缩略图
- **文章详情封面：直接用原生原图**，不经过缩略图变换

本设计把变换参数的「控制轴」从素材类型（`kind`）改为**展示场景（命名变体）**，并让文章详情回到原生图。

## 2. 当前设计（改造前）

- 已提交基线（commit `71e65b1`）：`/images/thumb/{publicId}.webp` → D1 解析 `image_assets` → Images 绑定固定变换（单 `640px / q72`）→ WebP + 一年 immutable 缓存。
- 工作区存在一笔**未提交**的改动，把参数按素材类型（`kind`）拆为两套：`article_cover` → `{ width: 640, quality: 75 }`；`gallery`/`other` → `{ width: 960, quality: 85 }`。本设计**取代**这笔改动（参数值保留，控制轴从 `kind` 改为展示场景变体）。
- 路由：`nuxt-admin/server/routes/images/[...path].get.ts`
  - `/images/thumb/{publicId}.webp` → 变换缩略图
  - `/images/{publicId}` → 302 重定向到源图（源 URL 稳定、无签名）
- 前台 DTO：
  - 画廊 item：`thumbnailUrl`（`/images/thumb/{pid}.webp`）
  - 文章 summary/detail：`thumbnailUrl`（`/images/thumb/{pid}.webp`），公共响应 `coverImage` 为 `null`
- 配额：Images Free 每月 5000 次唯一变换；当前素材注册表 361 个（19 封面 + 342 画廊）

## 3. 方案：命名变体

### 3.1 变体预设（代码常量，白名单）

| 变体 | 展示场景 | 宽度 | 质量 |
| --- | --- | --- | --- |
| `card` | 文章卡片、相关文章 | 640 | 75 |
| `grid` | 画廊网格/手风琴/封面流（旧格式默认） | 960 | 85 |
| `lightbox` | 画廊灯箱/首屏/游戏大图 | 1920 | 85 |

- 所有变体沿用 `fit: scale-down`（保持宽高比、不放大），输出 `image/webp`。
- 变体名白名单 `fail-closed`：未知变体返回 `400`，客户端不能指定任意尺寸/质量/格式。
- 三个变体为全局预设，不做逐图覆盖（用户已选择「按展示场景命名变体」，排除「按图片逐张设置」）。

### 3.2 URL 与路由

```
/images/thumb/{variant}/{publicId}.webp   → Images 绑定按预设变换（variant ∈ card|grid|lightbox）
/images/thumb/{publicId}.webp             → 旧格式保留，等价 grid（向后兼容）
/images/{publicId}                        → 302 重定向到原生源图（文章详情封面）
```

- `{variant}` 为可选段；缺省时等价 `grid`。
- `publicId` 仍需满足 `^i_[A-Za-z0-9_-]{8,48}$`，路径结构校验 fail-closed。
- 原生图经 `/images/{publicId}` 302 重定向，浏览器直接向白名单图床 `cfimg.wasd09090030.top` 拉取原图；源 URL 稳定无签名，不会过期。

### 3.3 数据模型

**无 schema 变更。** 变体参数是代码常量，不落入 D1。`image_assets`、`galleries`、`articles` 表结构不变。

### 3.4 后台 DTO 变更（nuxt-admin）

- `server/domain/assets.ts`：
  - 新增变体 URL 构造 helper，例如 `thumbnailVariantUrl(event, variant, publicId)` → `/images/thumb/{variant}/{publicId}.webp`。
  - 保留 `thumbnailUrl()`（旧格式，等价 grid）。
- `server/domain/gallery.ts`：
  - 画廊 item 新增 `lightboxUrl`（`/images/thumb/lightbox/{pid}.webp`）。
- `server/domain/articles.ts`：
  - article `summary`：`thumbnailUrl` 改为 `card` 变体 URL。
  - article `detail`：新增 `coverImageUrl` = `/images/{publicId}`（原生图）；`thumbnailUrl` 保留 `card`（供可能的小图使用）。

### 3.5 前台变更（nuxt-public）

按展示场景选择变体 URL：

- 画廊网格/手风琴/封面流：`thumbnailUrl`（grid）
- 画廊灯箱/首屏/游戏大图：`lightboxUrl`
- 文章卡片/相关文章：`thumbnailUrl`（card）
- 文章详情封面：`coverImageUrl`（原生图）

静态站需重新生成并部署（URL 从 `/images/thumb/{pid}.webp` 变为 `/images/thumb/{variant}/{pid}.webp`，且详情封面改为原生 URL）。

## 4. 配额与缓存

- 配额估算：19 封面 × 1(card) + 342 画廊 × 2(grid + lightbox) ≈ **703 唯一变换/月 < 5000**。
- 灯箱变体按需生成（用户点开才触发），不点开不计；同一（源+参数）当月只计一次。
- 缓存：每个变体 URL 独立，`Cache-Control: public, max-age=31536000, immutable`，启用 Worker Cache（`[cache] enabled = true`）。
- 配额耗尽时沿用现有逻辑：返回非泄漏 `503`，不计费，已缓存变体继续服务。

## 5. 安全

- 变体名白名单 + `publicId` 格式校验 + 源主机白名单（`cfimg.wasd09090030.top`）三重防线。
- 客户端不能指定任意变换参数。
- 公共 payload 仍不泄漏图床源主机；文章详情原生图经 `/images/{publicId}` 重定向暴露，浏览器网络面板可见源主机属预期行为。

## 6. 兼容性

- 旧格式 `/images/thumb/{publicId}.webp` 继续可用，等价 `grid`，旧静态站/历史链接不失效。
- 旧画廊 URL（等价 grid）仍按 960/q85 服务。
- 文章详情封面从 640px 缩略图切到原生图：视觉更清晰，但首屏下载量变大（源图分辨率）。属用户明确选择。

## 7. 验证

- `npm run check:image-transform`：契约检查更新为校验三个变体白名单（card 640/q75、grid 960/q85、lightbox 1920/q85）与旧格式默认 grid。
- `nuxt typecheck`：DTO 变更后类型检查通过。
- 前台 `npm run generate`：静态站生成成功，payload 中出现 `card`/`grid`/`lightbox` 变体 URL 与 `coverImageUrl`。
- 部署后线上抽查：
  - `/images/thumb/card/i_*.webp`、`/images/thumb/grid/i_*.webp`、`/images/thumb/lightbox/i_*.webp` 分别返回对应尺寸的 WebP + immutable 缓存头。
  - `/images/thumb/i_*.webp`（旧格式）仍返回 960px。
  - 未知变体 `/images/thumb/bad/i_*.webp` 返回 `400`。
  - 文章详情封面经 `coverImageUrl` 拉取到原生图。

## 8. 回滚

- 回退路由代码到旧版（`kind` 双变体或单 640/q72 版本），重新部署 blog-api Worker。
- 旧格式 URL 始终可用，前台可切回 `thumbnailUrl`（grid）不重建静态站；`lightboxUrl`/`coverImageUrl` 字段缺失时前台有兜底（沿用 `thumbnailUrl`）。
- D1 无 schema 变更，无数据回滚。

## 9. 非本次范围

- 不引入逐图参数覆盖（用户已排除）。
- 不引入客户端 URL 任意参数（配额/安全风险）。
- 不动 `kind` 字段语义，仍用于统计/分类。
- 不处理历史缩略图缓存清理（部署新参数后旧 immutable 缓存需按需 purge）。
