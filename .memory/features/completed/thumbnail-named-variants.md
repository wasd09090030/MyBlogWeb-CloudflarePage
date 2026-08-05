---
name: thumbnail-named-variants
description: 缩略图从素材类型(kind)双变体改为按展示场景命名的变体白名单（card/grid/lightbox），文章详情封面改用原生原图，2026-08-05 完成
metadata:
  type: features/completed
---

# 缩略图命名变体（已实施）

日期：2026-08-04 设计，2026-08-05 完成（commit `58792fd`）。
设计文档：`docs/superpowers/specs/2026-08-04-thumbnail-named-variants-design.md`

## 目标
把缩略图变换参数的控制轴从**素材类型（kind）**改为**展示场景（命名变体）**，并让文章详情封面直接用原生原图。

## 核心实现
- 变体白名单（代码常量，`nuxt-admin/server/routes/images/[...path].get.ts`）：
  - `card`：文章卡片/相关文章，640px / q75
  - `grid`：画廊网格/手风琴/封面流，960px / q85
  - `lightbox`：画廊灯箱/首屏/游戏大图，1920px / q85
  - 全部 `fit: scale-down`，输出 `image/webp`
- URL：`/images/thumb/{variant}/{publicId}.webp`；旧格式 `/images/thumb/{publicId}.webp` 等价 `grid`（向后兼容）；`/images/{publicId}` 302 重定向到原生图。
- 未知变体返回 400（fail-closed），`publicId` 仍校验 `^i_[A-Za-z0-9_-]{8,48}$`。
- 后台 DTO：gallery item 新增 `lightboxUrl`；article summary `thumbnailUrl` 用 `card`；article detail 新增 `coverImageUrl`（原生图）。
- 前台（nuxt-public）按场景选变体 URL；详情封面用 `coverImageUrl`。
- **无 D1 schema 变更**；变体参数是代码常量。

## 验证
- `npm run check:image-transform` 契约检查（三变体白名单 + 旧格式默认 grid）
- 线上抽查：card/grid/lightbox 返回对应尺寸 WebP + immutable 缓存头；旧格式仍 960px；未知变体 400。

## 配额
- 估算 ≈703 唯一变换/月 < Images Free 5000 限制；灯箱按需生成，不点开不计。

## 相关位置
- 路由：`nuxt-admin/server/routes/images/[...path].get.ts`
- DTO：`nuxt-admin/server/domain/{assets,gallery,articles}.ts`
- 前台消费：`nuxt-public/app/features/{article-detail,gallery-public}/...`
