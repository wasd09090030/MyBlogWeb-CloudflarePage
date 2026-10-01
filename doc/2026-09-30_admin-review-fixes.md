# 最近三个提交审查与 Admin 修复发布

## 范围与决策

- 审查提交：`2310eda`（公开画廊性能）、`11cb036`（Admin 页面切换性能）、`308ad0e`（图片宽高解析）。
- 用户授权：审查发现问题后直接修复；发布目标为 Admin。
- 保留非阻塞加载、30 秒缓存与前后台资源隔离设计，不回退性能优化。
- 原始 Admin 审查修复仅位于 `nuxt-admin/app/`，另增加本记录；随后同一工作树追加了公开画廊 Hero 性能优化，以及 `blog-api` 的 Hero 图片变体支持。没有修改路由 Worker 或数据库。
- 没有创建 Git 提交或分支。发布包含当前未提交的修复，Cloudflare 显示的源提交仍为 `308ad0e`。

## 审查发现与修复

### 1. Hero 配置尚未加载即可保存

`11cb036` 将配置读取改为 lazy 加载后，页面先显示，而 `heroSections` 初始值是四组空数组。保存按钮原先不检查读取状态，慢网络或读取失败时可能把默认空值作为实际配置提交。

修复：仅在 Hero 配置读取成功后启用保存，并在保存函数入口检查配置是否存在。加载、错误与内容分别渲染。

文件：`nuxt-admin/app/pages/admin/gallery/index.vue`。

### 2. 401 分支在异步请求后调用组合式函数

原有 API 错误处理在 `await` 后调用 `useAdminAuthState()`。组合式函数内部依赖 Nuxt 上下文，不能把异步回调中的上下文可用性当作前提。原有处理也仅清认证标记，没有清业务缓存并跳转登录页。

修复：在组合式函数初始化时捕获 Nuxt 应用、认证状态与路由实例；统一通过 `resetSession()` 清理状态；需要上下文的 `clearNuxtData()` 在 `nuxtApp.runWithContext()` 中调用。401 清理后跳转登录页，已在登录页时不重复跳转，仍向调用者抛出原始错误。

文件：`nuxt-admin/app/composables/useAdminApi.ts`。

### 3. 登录切换后可能继续使用上一会话缓存

原来的登出只清认证状态；API 缓存和 Nuxt async-data 状态可能保留上一会话的数据。此外，仅把缓存对象置空不能阻止已在途的旧请求完成后重新写入缓存。

修复：登录成功、退出登录和 401 统一清理业务缓存、async-data 与认证状态。增加共享缓存版本，缓存失效前启动的请求不再回填缓存；保留普通 mutation 发送前失效缓存的行为。

文件：`nuxt-admin/app/composables/useAdminApi.ts`、`nuxt-admin/app/layouts/admin.vue`、`nuxt-admin/app/pages/admin/login.vue`。

### 4. Lazy 加载期间错误显示空数据或可编辑状态

文章、评论、日记、画廊和图床页面在数据尚未返回时可能展示空列表、默认编辑状态或“尚未配置”。请求错误与真实空数据也缺少明确区分。

修复：区分 idle/pending、error 与成功状态。文章编辑器在读取结束且没有错误后显示；文章表格提供 loading 插槽，避免 Nuxt UI 默认无数据提示；图床配置成功读取后才判断是否未配置，资源列表成功读取后才显示空目录。

文件：`nuxt-admin/app/pages/admin/articles/[id].vue`、`nuxt-admin/app/pages/admin/articles/index.vue`、`nuxt-admin/app/pages/admin/comments/index.vue`、`nuxt-admin/app/pages/admin/diary/index.vue`、`nuxt-admin/app/pages/admin/gallery/index.vue`、`nuxt-admin/app/pages/admin/imagebed/index.vue`。

公开画廊性能与图片宽高解析相关代码已审阅；后续追加了 Hero 专用图片变体、Coverflow rAF 拖拽合帧和 Hero 模糊层移除。这不代表完成了所有生产数据规模下的浏览器回归。

## 验证结果

| 验证 | 结果 |
| --- | --- |
| `git diff --check` | 通过 |
| `npm run check:free-config` | 通过 |
| `npm run check:image-api` | 通过 |
| `npm run check:image-transform` | 通过 |
| API 组合式函数定点检查 | 通过：读取缓存、mutation 失效、异步上下文清理、在途旧请求禁止回填、401 跳转、登录页防循环、非 401 原样抛出 |
| `npm run typecheck` | 未通过；仍有 11 条既有诊断，本轮修改没有新增诊断 |
| `npm run deploy:pages` | 构建、静态生成与 Pages 上传成功 |

定点检查用 Node VM 与实际 TypeScript 源码的内存转译执行，模拟了 Nuxt 上下文和网络响应；没有往仓库新增测试套件。它不能替代真实登录后的浏览器回归。

既有类型错误分布：日记页面两条，`server/domain/articles.ts` 一条，`server/domain/assets.ts` 五条，`server/domain/diary.ts` 三条。没有为了让检查变绿而修改无关逻辑。

构建存在大 chunk、sourcemap、依赖注解和 Nitro cache-driver 解析警告；静态生成完成。Wrangler 忽略服务端 `wrangler.toml` 的 Pages 配置警告符合本仓库 API Worker 与静态 Pages 分开发布的方式。

## 最终发布与线上检查

- Pages 项目：`myblog-admin`；环境：Production；分支：`main`。
- 最终部署 ID：`eeab7282-96e5-4deb-9dfa-530bc633eaa7`。
- 最终部署地址：<https://eeab7282.myblog-admin-8n8.pages.dev>。
- 用户入口：<https://wasd09090030.top/admin/login>。
- `/admin/login` 返回 200，HTML 的 `/admin/_nuxt/` 资源引用与最终本地构建产物一致。
- 抽查一个 CSS 和两个 JS 资源均返回 200，内容类型正确。
- `/admin/gallery` 返回 200 SPA 壳。
- `/admin/api/auth/session` 返回 200，未登录状态为 `authenticated: false`。
- 未携带会话的 `/admin/api/articles` 返回预期 401。
- 原始 Admin 发布阶段仅发布 Admin Pages，没有发布 `blog-api`、路由 Worker 或公开站，也没有执行数据库迁移。

没有使用管理员凭据，未完成真实登录后编辑、登出再登录或会话过期的浏览器手工回归。线上 HTTP 检查验证入口、资源与现有 API 的未登录行为，不能证明所有认证后业务正常。

## 官方资料与工具限制

本次通过 HTTP 获取 Nuxt 与 Cloudflare 官方文档，并检查已安装依赖源码，而不是只凭框架记忆判断。检查日期：2026-09-30。

- [Nuxt useNuxtApp / runWithContext](https://nuxt.com/docs/4.x/api/composables/use-nuxt-app)：异步上下文丢失与显式恢复。
- [Nuxt clearNuxtData](https://nuxt.com/docs/4.x/api/utils/clear-nuxt-data)：async-data 状态清理。
- [Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/platform/direct-upload/)：Wrangler 静态目录发布及生产分支行为。
- 本地依赖 `nuxt/dist/app/composables/asyncData.js` 与 `@nuxt/ui/dist/runtime/components/Table.vue`：确认清理函数依赖 Nuxt 上下文，以及表格需要 loading 插槽才能替换默认空提示。

当前环境未暴露项目约定的 MCP router、Context7、fetch 与 Sequential Thinking 工具，未伪称调用；使用 PowerShell HTTP 请求和本地依赖源码代替可执行的资料核验。

## 后续与回滚

- 建议手工验证：慢网下打开文章编辑、Hero 保存禁用、空列表与请求失败提示；退出再登录后不显示旧缓存；会话过期后返回登录页。
- 数据库和路由 Worker 未变；后续追加的 `blog-api` 已于 2026-10-01 部署，版本 ID 为 `8c2a15b0-8b4c-4e0a-9804-1b498b18796c`，回滚 API 时需恢复上一 Worker 版本。
- 上一个修复迭代部署 `11609c57` 已被本次最终部署替代，不应作为本轮最终发布地址。
- 最终复核：改动保持 Admin SPA 边界、同源 `/admin/api/*` 和 `/admin/_nuxt/` 资源隔离，没有发现需要暂停的新架构或需求冲突。
