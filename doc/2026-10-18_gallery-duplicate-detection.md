# 画廊内容查重实施记录

## 日期与目标

- 日期：2026-10-18，UTC+8。
- 用户已确认实施：解决同一张图重复导入，地址变化、压缩或等比缩放后仍能提示疑似重复。
- OpenSpec：`add-gallery-duplicate-detection`，沿用最小可回滚方案，不自动删除任何图片。

## 最终设计

浏览器将图片解码为白底 32×32 像素，使用低频 DCT 的 63 个 AC 系数生成 64 位填充指纹。排除 DC 亮度分量，采用噪声底线稳定平滑图案；结合宽高比、颜色均值、亮度标准差和随信息量收紧的汉明距离判断疑似重复。最高距离为 8，稀疏指纹采用更小距离；低细节图片使用颜色近似判断。算法标记为 `phash-dct32-ac63-rgb-v1`。

同源受保护接口读取原图，逐次校验图床主机及重定向，不转发 Cookie、Authorization 或图床密钥。只接受 JPEG/PNG/WebP/GIF/AVIF，限制 20 MB、20 秒及三次重定向，实际按流累计字节，不能靠 Content-Length 绕过。浏览器拒绝解码后超过 4000 万像素的图片，动画取首帧。没有增加运行时依赖、AI 服务或图像转换请求。

D1 新增缓存表，键为规范化地址及算法版本，有效期 30 天。首次检查补齐指纹，强制刷新忽略旧缓存；强制刷新失败后的重试也不会重新采用旧指纹。算法变更应递增版本。

目录独立按 id 游标分页，固定扫描开始时的最大 id，包含隐藏项，不受原管理列表 2000 条限制。新增、改地址和批量导入默认不查重；管理员可选择对单张保存或批量导入进行预检。预检会检查完整目录，编辑排除自身；批量同时对照更早的候选。计算最多两个图片请求并发，阶段间及比较期间主动让出浏览器线程，支持取消。目录失败不报告完成。

## 阶段与审查

1. 指纹、接口与迁移：独立共享模块、领域逻辑及读取工具，复用原路由的会话与请求来源校验。发现迁移 0005 已被日记占用，顺延为 0006，无现有数据变更。
2. 管理端接入：组合式函数承载调度，独立 Nuxt UI 组件承载复核，页面只调用预检与最终保存。保存和导入默认关闭查重；勾选后才运行预检。疑似重复和失败候选默认跳过；目录中存在失败时全部候选默认跳过。接受不完整结果与保留图片需要明确操作。
3. 测试复核：平滑图案压缩测试发现近零系数抖动，增加噪声底线；不同平滑图案的反例促使收紧稀疏指纹阈值。修复强制刷新失败后重试可能复用旧缓存的问题。浏览器验证实际交互与异步按钮状态。
4. 最终一致性：未改公开站、路由 Worker、图床删除逻辑或非任务文件。原先未跟踪的 `docs/mdc-style-showcase.html` 保持不动。实现阶段没有运行远端迁移、发布、提交或推送；后续上线见独立发布记录。

## 文件

新增或修改职责详见根目录 `PROJECT_STRUCTURE.md` 的“Admin 画廊查重”。主要涉及：

- `nuxt-admin/shared/gallery-duplicates.ts`：指纹、比较和共享契约。
- `nuxt-admin/server/domain/gallery-duplicates.ts`、`server/utils/gallery-image-source.ts`、受保护 API 路由：读取、分页与缓存。
- `nuxt-admin/migrations/0006_gallery_image_fingerprints.sql`：独立缓存表。
- `nuxt-admin/app/features/gallery-duplicates/fingerprint.ts`、`app/composables/useGalleryDuplicates.ts`、`app/components/GalleryDuplicateReview.vue`：浏览器计算与复核。
- `nuxt-admin/app/pages/admin/gallery/index.vue`、`app/composables/useAdminApi.ts`：接入入口与继承会话处理的 Blob 请求。
- `nuxt-admin/scripts/check-gallery-duplicates*.mjs`、`package.json`：核心与浏览器验证命令。
- `nuxt-admin/DEPLOYMENT.md`、本文件及 OpenSpec：发布、回滚、限制与实施记录。

## 官方资料

检查日期均为 2026-10-18。当前会话没有可调用的 Context7、fetch MCP、Sequential Thinking 工具；已明确告知用户，用步骤化审查和 PowerShell Invoke-WebRequest 直接读取官方网页替代，没有声称使用不可用工具。

- https://www.phash.org/ ：感知哈希的用途及压缩鲁棒性。
- https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image ：跨域图片与受污染 Canvas。
- https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData ：像素读取。
- https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap ：浏览器解码。
- https://developers.cloudflare.com/workers/best-practices/workers-best-practices/ ：Worker 请求、资源及凭据边界。
- https://developers.cloudflare.com/d1/worker-api/prepared-statements/ ：D1 预编译查询。
- https://developers.cloudflare.com/images/transform-images/bindings/ ：图像绑定边界，本实现避免额外转换请求。
- https://ui.nuxt.com/docs/components/modal ：复核弹窗及 dismissible 行为；同时对照仓库已安装 Nuxt UI 的 Modal/Checkbox/Progress 实现。

## 验证

- `npm run check:gallery-duplicates`：通过。验证量化压缩、缩放元数据、宽高比、不同颜色、不同平滑图案、失败默认跳过及同批匹配；拒绝未允许的源地址/重定向、SVG、声明超限和无 Content-Length 的实际超限响应；验证重定向限额、流取消、全部迁移、2005 条含隐藏记录分页、扫描快照、缓存写入/过期及参数边界。
- `npm run check:gallery-duplicates:browser`：本机 Edge 无头浏览器通过。仓库图片以白底转为 JPEG quality 0.4/0.7/0.9 及宽度 320 的缩小版本，全部命中；验证默认单张与批量写入跳过查重、可选批量和单张预检、隐藏项匹配、手动保留、单张失败的明确继续、已有记录扫描与单条删除、强制读取失败后重试、目录失败重试、编辑排除自身。
- `npm run check:free-config`、`check:image-api`、`check:image-transform`：通过。
- `npm run build:api`：通过。
- `npm run generate`：通过，生成正确的 `/admin/_nuxt/` 静态管理端资源。
- `openspec validate add-gallery-duplicate-detection`：通过。
- `npm run typecheck`：存在 11 个既有诊断，均位于未修改的 `app/pages/admin/diary/index.vue`、`server/domain/articles.ts`、`server/domain/assets.ts` 和 `server/domain/diary.ts`；本次查重文件无诊断。未把修复这些错误混入本任务。
- 测试环境：Node 24.19.0。核心测试脚本依赖 Node 22.18+ 的类型剥离及内存 SQLite；浏览器测试依赖已生成的 Admin SPA 和本机 Chromium，API 全部模拟，仅监听 127.0.0.1。

## 发布、回滚与边界

发布顺序为 D1 迁移 → API Worker → Admin Pages。实现阶段未发布；后续用户明确授权上线，已于当日完成，详见 [上线记录](2026-10-18_gallery-duplicate-detection-release.md)。首次使用在后台点“检查重复图片”；地址内容已变化时使用“强制重新读取全部图片”。回滚同时恢复旧 API 与 Admin Pages，新增缓存表可保留。

结果是人工复核建议，非数据库唯一约束；并发管理员和直接 API 调用仍可产生重复。裁剪、水印、透明背景变更、大幅编辑及简单图案可能误报或漏报，不能承诺 100%。未配置的外部图床主机、SVG 或浏览器不支持的格式会明确报告失败。白底 PNG 转成黑底 JPEG 会改变实际画面，不作为“仅压缩”保证。

首轮扫描需要下载原图，比较规模随画廊数量增加；当前方案分批让出线程，没有引入索引服务。浏览器像素限额在解码后检查，不能完全消除极大图片的解码资源成本。后续可根据真实误报样本调校阈值并递增算法版本；不在本次扩大为 AI 或后台队列系统。
