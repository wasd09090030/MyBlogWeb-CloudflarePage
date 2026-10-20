# 项目结构

- `nuxt-public/`：公开博客 Nuxt SSG，部署到 Cloudflare Pages。
- `nuxt-admin/app/`：管理后台 SPA，仅负责 `/admin/*`，使用 Nuxt UI。
- `nuxt-admin/server/`：构建为 `blog-api` Worker，处理公开和受保护 API，使用 D1。
- `cloudflare-worker/`：统一域名路由，分发至两个 Pages 项目及 API Worker。
- `openspec/`：变更设计、需求及实施任务。
- `doc/`：任务实施记录。

## Admin 画廊查重

- `nuxt-admin/app/pages/admin/gallery/index.vue`：原画廊页面，调用新增、编辑、批量导入预检及已有记录扫描。
- `nuxt-admin/app/composables/useGalleryDuplicates.ts`：目录分页、缓存、指纹调度、进度、取消、重试与复核选择。
- `nuxt-admin/app/features/gallery-duplicates/fingerprint.ts`：浏览器图片解码、白底合成与 Canvas 像素读取。
- `nuxt-admin/app/components/GalleryDuplicateReview.vue`：Nuxt UI 并排复核、失败提示与单条记录清理。
- `nuxt-admin/shared/gallery-duplicates.ts`：客户端和服务端共享的版本、类型、地址键；纯指纹与比较逻辑。
- `nuxt-admin/server/domain/gallery-duplicates.ts`：受保护目录、D1 指纹读写及图片源解析。
- `nuxt-admin/server/utils/gallery-image-source.ts`：限制主机、重定向、类型、字节与时限的图片读取。
- `nuxt-admin/server/routes/admin/api/[...path].ts`：统一 Cookie 会话及请求来源校验后的路由分发。
- `nuxt-admin/migrations/0006_gallery_image_fingerprints.sql`：新增独立指纹缓存表。
- `nuxt-admin/scripts/check-gallery-duplicates*.mjs`：核心行为/迁移测试与可选浏览器回归。

- `nuxt-admin/server/domain/gallery.ts`：画廊删除前校验共享文件引用，联动图床删除，并在 D1 事务中清理画廊记录、素材状态和指纹。
- `nuxt-admin/server/domain/media.ts`：复用 `deleteMediaFile` 删除图床原文件，数据库清理由各业务调用方负责。

所有受保护浏览器请求保持同源 `/admin/api/*`；管理后台资源保持 `/admin/_nuxt/`。图片原文件存放于独立图床，画廊删除会同步删除无其他画廊、文章封面或 Hero 引用的文件。
