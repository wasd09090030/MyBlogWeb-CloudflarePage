# 画廊与图床联动删除

## 日期与目标

- 日期：2026-10-20，UTC+8。
- 用户已确认方案：查重弹窗和画廊列表删除图片时，同时删除图床原文件；图床失败保留记录，共享文件阻止删除，支持数据库清理失败后的重试。
- 在现有未提交的画廊查重实现上增量补充，保留其他工作区修改。

## 实现与决策

`DELETE /admin/api/gallery/:id` 继续使用原有 Cookie 会话和请求来源校验。服务端读取画廊记录，解析关联素材或旧式图床地址中的真实 storage key。支持配置图床的原地址、相对文件路径、原图短链及缩略图短链；未知外部源、无素材映射的短链和非法存储键拒绝删除。

删除前检查其他画廊记录（含隐藏项）、文章封面与 Hero。按实际 storage key 比较，同时覆盖素材关联、同键的不同素材记录、旧地址、查询参数以及短链，避免删除保留项所依赖的文件。关联素材状态为停用时仍参与解析与检查，便于处理已删除文件的残留记录。

在图床业务模块提取 `deleteMediaFile()`，原有图床 CRUD 和画廊删除共用它及 `deleteFromImageApi()`。传递已解析的 storage key 时不再重复 URL 解码，保留中文、空格和百分号文件名。图床 Token 仍仅由 Worker Secret 提供。根据官方图床实现，删除单个不存在的文件返回成功，可用于重试；不把任意 HTTP 404 当成功。删除适配器仅接受 HTTP 成功且 JSON 明确包含 `success: true` 的响应，防止上游错误页被误判为成功。

远端文件成功删除后，以一个 D1 `batch()` 事务停用同键素材、删除画廊记录及同文件的指纹缓存。缓存清理覆盖地址别名、短链、查询参数及所有算法版本，每条 DELETE 最多绑定 50 个地址。图床失败时不执行数据库清理；D1 失败时整批回滚，页面提示再次删除以完成清理。

查重弹窗按钮改为“删除图片及记录”，两处入口均明确提示原文件永久删除。共享引用、未知来源、图床失败和数据库清理失败展示具体中文原因。成功后刷新列表与查重结果，并清除本地对应指纹。

## 阶段与一致性审查

1. 服务端：复用图床删除职责；通过一次 D1 事务收尾。没有新增依赖、迁移、绑定或 Secret。
2. 管理端：复核组件和画廊列表保持相同接口与删除语义，修正原列表把所有删除错误当成“可能已删除”的提示。
3. 验证：使用内存 SQLite 和模拟图床验证实际领域代码；使用本机无头 Edge 验证生成的管理端。原浏览器脚本让恢复后的失败样本与唯一图片共用内容，导致编辑排除自身的测试发生真实匹配；本次将两组样本隔离，全部回归通过。
4. 最终审查：当前 OpenSpec、结构说明及部署说明已同步到新删除语义。历史 2026-10-18 的实施记录保留当时行为。未改公开站和路由 Worker，未提交、推送、远端迁移或部署，也未删除生产图床文件。

## 文件

- `nuxt-admin/server/domain/gallery.ts`：存储键解析、共享引用检查、指纹清理与事务删除。
- `nuxt-admin/server/domain/media.ts`：提取可复用的原文件删除函数。
- `nuxt-admin/server/utils/image-api.ts`：要求图床明确确认删除成功。
- `nuxt-admin/app/composables/useGalleryDuplicates.ts`：确认文案、错误原因及本地缓存清理。
- `nuxt-admin/app/components/GalleryDuplicateReview.vue`：按钮与永久删除说明。
- `nuxt-admin/app/pages/admin/gallery/index.vue`：列表删除确认及准确的成功/失败反馈。
- `nuxt-admin/scripts/check-gallery-duplicates.mjs`：实际删除逻辑、上游响应、共享引用、指纹分批清理与事务重试回归。
- `nuxt-admin/scripts/check-gallery-duplicates-browser.mjs`：两处删除反馈、失败保留结果及浏览器回归样本隔离。
- `PROJECT_STRUCTURE.md`、`nuxt-admin/DEPLOYMENT.md`、`openspec/changes/add-gallery-duplicate-detection/`：职责、操作、需求和任务同步。

## 官方资料

查询日期为 2026-10-20。当前会话无可调用的 Context7、fetch MCP、Sequential Thinking 工具，已告知用户；使用步骤化审查和 PowerShell `Invoke-WebRequest` 直接读取官方来源，未声称调用不可用的工具。

- https://developers.cloudflare.com/d1/worker-api/d1-database/ ：确认 `batch()` 顺序执行并在失败时回滚整个事务。
- https://developers.cloudflare.com/workers/best-practices/workers-best-practices/ ：Worker Secret、请求作用域与等待异步操作的边界。
- https://raw.githubusercontent.com/MarSeventh/CloudFlare-ImgBed/master/functions/api/manage/delete/[[path]].js ：确认单文件删除响应为 `success: true`，R2 删除由图床执行，不存在的文件记录按幂等删除处理。
- https://cfbed.sanyue.de/ ：图床官方站点。
- 首次尝试 `/d1/worker-api/batch/` 和 `https://cfbed.sanyue.de/api/file-management.html` 返回 404，随后改用以上成功读取的来源。
- 本地检查已安装 `@cloudflare/workers-types` 的 D1 `batch()` 类型；没有调整框架配置或依赖版本。

## 验证结果

- `npm run check:gallery-duplicates`：通过。覆盖独立文件远端删除、中文/空格/百分号键、关联与无关联的旧路径和短链、超过 50 条同文件指纹、图床 HTTP 失败/业务失败/网络失败/无效成功页、隐藏记录/封面/Hero/不同素材行共享引用、外部源/非法键/缺失记录，以及远端文件已删、D1 回滚后再次清理。
- `npm run check:image-api`：通过，图床凭据保持在 Worker 侧。
- `npm run check:gallery-duplicates:browser`：通过，生成的 SPA 在无头 Edge 中验证两处删除入口的具体错误提示、永久删除确认、成功后结果刷新，以及原有查重、默认写入、显式保留、读取失败重试和编辑预检流程。API 均为本地模拟。
- `npm run build:api`：通过。
- `npm run generate`：通过，管理端静态资源保持 `/admin/_nuxt/`。存在依赖工具的 sourcemap、分块及构建警告，但退出码为 0。
- `openspec validate add-gallery-duplicate-detection`：通过。
- `git diff --check`：通过，仅有现有 CRLF 转 LF 提示。
- `npm run typecheck`：仍有 11 个既有错误，位于未修改的 `app/pages/admin/diary/index.vue`、`server/domain/articles.ts`、`server/domain/assets.ts` 和 `server/domain/diary.ts`，与 2026-10-18 实施记录相同；本次修改文件无新增诊断。

## 部署、回滚与边界

上线时依次发布 API Worker 和 Admin Pages，使确认文案与服务端行为一致。既有指纹迁移 0006 必须已经应用，本次无需新迁移。画廊内容变化后需要重建公开 SSG。恢复旧 API/Admin Pages 可回滚代码，但无法恢复已删除的图床文件。

图床请求和 D1 不能共用事务；网络失败可能发生在图床实际删除之后，保留记录并重试可收尾。本次没有新增分布式锁，引用检查之后的并发写入仍有竞态，清理时应避免同时编辑相关图片。

共享引用检查覆盖画廊、文章封面和 Hero 的结构化字段，不解析文章/日记正文中的任意图片链接，也无法追踪外部站点或历史静态页面的链接。检查按现有素材、结构化引用及指纹缓存线性遍历，没有新增引用索引服务。正式发布后如观察到大规模数据下的耗时，应另行评估索引优化。
