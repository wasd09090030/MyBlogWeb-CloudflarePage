## 开发环境

Windows WSL2，Node.js 20.19+，.NET 8 SDK，VS Code
## 1. 项目概览
本仓库是全栈博客系统，采用混合架构：
- 静态博客前端：`nuxt-public/`（Nuxt 4，SSG 静态生成，部署到 Cloudflare Pages；组件库：**Nuxt UI v4 ✅ 已从 NaiveUI 迁移完成**——见 `openspec/changes/nuxt-ui-migration/`）
- 管理后台前端：`nuxt-admin/`（Nuxt 4 SPA，部署到 Cloudflare Pages；组件库：**Nuxt UI v4**；负责 `/admin/*`）
- 旧动态 SSR 项目：`nuxt/`（冻结，仅作回滚与历史参考；禁止新增功能）
- 运行时 API：`nuxt-admin/server/` 构建为 `blog-api` Cloudflare Worker，使用 D1；`backend-dotnet/BlogApi/` 仅保留为历史迁移和回滚参考
- 路由分发：`cloudflare-worker/`（Cloudflare Worker，统一域名路由）

### 两个前端项目职责划分

| | nuxt-public/（静态站） | nuxt-admin/（管理后台 SPA） |
|---|---|---|
| 部署位置 | Cloudflare Pages（CDN） | Cloudflare Pages + `blog-api` Worker |
| 负责页面 | `/` 首页、`/article/*` 文章、`/gallery` 画廊、`/tutorials` 教程、`/about` 关于 | `/admin/*` 管理后台（仅此） |
| 渲染方式 | 构建时静态生成（SSG） | 构建时静态生成的 SPA 壳 + 浏览器端路由 |
| 资源路径 | `/_nuxt/`（默认） | `/admin/_nuxt/`（与公开站隔离） |
| SEO | sitemap.xml + robots.txt | sitemap 禁用，robots Disallow: / |

### 跨项目导航规则
- 跳转到另一个项目的页面：使用 `<a>` 标签（全页面跳转）
- 同项目内部导航：使用 `NuxtLink`（SPA 路由）

## 核心行为
1. 如果发现冲突，立刻停止工作，向用户报告情况，等待反馈
2. 记得调用 mcp router 的 fetch、context7 mcp等服务，你必须搜索最新的知识，禁止直接使用 LLM 内置过时知识库。避免造成时间滞后带来的错误.

## 2. 当前结构（按迁移后状态）

### 2.1 静态博客前端（`nuxt-public/app/`）
- `features/`：业务主层
	- `article-list/`、`article-detail/`、`gallery-public/`、`home/`、`tutorials/`
- `shared/`：跨功能共享层（`api/` `cache/` `errors/` `types/` `ui/`）
- `layouts/`：布局层（`default.vue` / `blank.vue`）
- `pages/`：路由入口层
- `components/`：通用组件（MarkdownRenderer、CommentSection 等）

### 2.2 管理后台 SPA 与 API Worker（`nuxt-admin/`）
- `app/pages/admin/`：管理后台路由入口
- `app/components/`：布局、编辑器、预览与本地 MDC 组件
- `app/composables/`：浏览器端认证、同源 API 请求和业务状态
- `server/routes/admin/api/`：由 `blog-api` Worker 处理的受保护 API
- `server/utils/`：D1、Cookie 会话与 Cloudflare 运行时工具

### 2.3 历史后端（`backend-dotnet/BlogApi/`）
- `Controllers/`、`Services/`、`Models/`、`DTOs/`、`Data/`
- 仅用于数据迁移和回滚参考，不参与生产请求路径

### 2.4 路由分发（`cloudflare-worker/`）
- `router.js`：根据路径前缀分发到 Pages 或 `blog-api` Service Binding
- `/admin/*` 到 `myblog-admin` Pages；`/admin/api/*`、`/api/*`、`/images/*` 到 `blog-api`

## 3. 开发命令

### 3.1 静态博客前端（在 `nuxt-public/`）
- 安装依赖：`npm install`
- 本地开发：`npm run dev`
- 静态生成：`npm run generate`

### 3.2 管理后台与 API（在 `nuxt-admin/`）
- 安装依赖：`npm install`
- 本地开发：`npm run dev`
- API Worker 构建：`npm run build:api`
- Admin Pages 生成：`npm run generate`
- 部署：`npm run deploy:api`、`npm run deploy:pages`

### 3.3 后端（在 `backend-dotnet/BlogApi/`）
- 运行：`dotnet run`
- 构建：`dotnet build`
- 发布：`dotnet publish -c Release`

## 4. 编码与风格约定
- Vue/Nuxt：2 空格缩进，组件 PascalCase，组合式函数 `useXxx`
- C#：4 空格缩进，类型/公开成员 PascalCase，局部变量 camelCase
- 样式：Tailwind + 组件样式文件（`nuxt-public/app/assets/css/components/*.{desktop,mobile}.css`）
- 新增前端业务代码优先进入 `features/*`，避免继续堆积在 `pages/*` 或全局 `components/*`
- 所有的非naiveui的自行设计的部分应该封装成vue组件放在nuxt-public\app\shared\ui下

### 4.1 响应式样式分离约定（nuxt-public，自 2026-06 起生效）

桌面端与移动端样式**必须**物理分离到成对文件中：

- `<Name>.desktop.css` — 仅含桌面基线规则（不包 `@media (max-width: ...)`）
- `<Name>.mobile.css` — 全部规则包在 `@media (max-width: 576/768/992px)` 块内
- 加载顺序：desktop 先于 mobile（保证 mobile 可覆盖）
- 允许的断点仅 `576px`、`768px`、`992px`
- 新增组件**禁止**使用混写的 `.styles.css` 命名
- 全局工具类（`hide-mobile` / `hide-tablet` / `hide-desktop`）位于 `responsive-utilities.{desktop,mobile}.css`，通过 `nuxt.config.ts` 的 `css: []` 数组全局加载
- 全局 prose 样式位于 `prose-custom.{desktop,mobile}.css`，加载方式同上
- 受 change `extract-mobile-styles` 约束（详见 `openspec/changes/archive/2026-06-.../`）

## 5. 配置与样式注意事项
- Nuxt Admin 使用 Nuxt UI v4 与 Tailwind CSS v4；不要引入 Naive UI。
- Admin SPA 的资源路径为 `/admin/_nuxt/`，与公开站的 `/_nuxt/` 隔离。
- 浏览器到受保护接口必须使用同源 `/admin/api/*`；Cookie 会话由 `blog-api` Worker 验证。

## 6. 关键配置文件
- `nuxt-public/nuxt.config.ts`：静态生成配置，含 `prerender:routes` hook
- `nuxt-admin/nuxt.config.ts`：Admin SPA 与 Cloudflare Worker 构建配置
- `nuxt-admin/DEPLOYMENT.md`：D1、Worker、Pages 的发布和回滚说明
- `cloudflare-worker/router.js`：Worker 路由分发
- `CLAUDE.md`：部署方式与后台 trigger 按钮重建说明（不依赖 GitHub Actions，本地 Wrangler 手动发布）

## 7. 测试与验证策略
- 当前无完整自动化测试套件
- 变更后优先做"局部静态检查 + 关键路径手工回归"
- 前端验证以功能页面回归为主，不强制每次执行完整构建

## 8. 提交与 PR 规范
- Commit 信息简短、单一目的、中文可接受
- PR 建议包含：
	- 背景/问题描述
	- 复现与修复点
	- 验证步骤与结果
	- 风险评估与回滚方式
	- UI 变更截图（如有）

## 9. 安全与配置
- 前端环境变量：`NUXT_PUBLIC_API_BASE_URL`、`NUXT_PUBLIC_SITE_URL`
- 生产数据库：Cloudflare D1 `blog-db`
- 首次部署后务必修改管理员默认密码（历史默认值：`admin123`）

## 10. AI Agent 执行约束
1. 操作前先进行步骤化思考，并检查上下文一致性；如发现冲突，暂停并向用户报告。
2. 涉及框架行为判断时，优先检索官方文档或仓库文档，不依赖过时记忆。
3. 项目内改动优先"小步、可回滚、可验证"，避免一次性大范围重构。
4. 前端改动后优先做定点验证（目标页面回归），避免无关的全量验证开销。
5. 非任务范围文件不改动；如发现潜在问题，在 PR 说明中列为后续项。
6. 修改 nuxt-public/ 时注意：这是静态站，不支持运行时 API 调用（客户端 fetch 除外）。
7. 修改 nuxt-admin/ 时注意：Admin Pages 资源路径为 `/admin/_nuxt/`；受保护请求保持同源 `/admin/api/*`；`nuxt/` 不得新增功能。
