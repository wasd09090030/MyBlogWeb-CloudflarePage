## 开发环境

Windows WSL2，Node.js 18+，.NET 8 SDK，VS Code
## 1. 项目概览
本仓库是全栈博客系统，采用混合架构：
- 静态博客前端：`nuxt-public/`（Nuxt 3，SSG 静态生成，部署到 Cloudflare Pages）
- 动态 SSR 前端：`nuxt/`（Nuxt 3，SSR 服务端渲染，部署到云服务器）
- 后端：`backend-dotnet/BlogApi/`（.NET 8 Web API）
- 路由分发：`cloudflare-worker/`（Cloudflare Worker，统一域名路由）

### 两个前端项目职责划分

| | nuxt-public/（静态站） | nuxt/（SSR 动态站） |
|---|---|---|
| 部署位置 | Cloudflare Pages（CDN） | 云服务器（PM2 + Nginx） |
| 负责页面 | `/` 首页、`/article/*` 文章、`/gallery` 画廊、`/tutorials` 教程、`/about` 关于 | `/admin/*` 管理后台、`/tools/*` 工具箱、`/mania/*` 音游 |
| 渲染方式 | 构建时静态生成（SSG） | 运行时服务端渲染（SSR） |
| 资源路径 | `/_nuxt/`（默认） | `/_ssr/`（避免冲突） |
| SEO | sitemap.xml + robots.txt | sitemap 禁用，robots Disallow: / |

### 跨项目导航规则
- 跳转到另一个项目的页面：使用 `<a>` 标签（全页面跳转）
- 同项目内部导航：使用 `NuxtLink`（SPA 路由）

## 核心行为
1. 你的每一步操作，都需要调用 Sequential thinking mcp 服务思考问题。并反思自己上下文是否一致，如果发现冲突，立刻停止工作，向用户报告情况，等待反馈
2. 记得调用 mcp router 的 fetch、context7 mcp等服务，你必须搜索最新的知识，禁止直接使用 LLM 内置过时知识库。避免造成时间滞后带来的错误.

## 2. 当前结构（按迁移后状态）

### 2.1 静态博客前端（`nuxt-public/app/`）
- `features/`：业务主层
	- `article-list/`、`article-detail/`、`gallery-public/`、`home/`、`tutorials/`
- `shared/`：跨功能共享层（`api/` `cache/` `errors/` `types/` `ui/`）
- `layouts/`：布局层（`default.vue` / `blank.vue`）
- `pages/`：路由入口层
- `components/`：通用组件（MarkdownRenderer、CommentSection 等）

### 2.2 动态 SSR 前端（`nuxt/app/`）
- `features/`：业务主层（推荐新增功能优先放这里）
	- `article-list/`、`article-detail/`、`article-admin/`
	- `gallery-public/`、`gallery-admin/`
	- `home/`、`tutorials/`
- `shared/`：跨功能共享层（`api/` `cache/` `errors/` `types/` `ui/`）
- `layouts/`：布局层（`default.vue` / `admin.vue` / `blank.vue`）
- `pages/`：路由入口层（admin/tools/mania + 公共页面）
- `components/`：通用组件（逐步收敛）
- `stores/`：Pinia 状态管理
- `middleware/`：路由中间件（认证等）
- `utils/`：通用工具与 worker 相关逻辑

### 2.3 后端（`backend-dotnet/BlogApi/`）
- `Controllers/`、`Services/`、`Models/`、`DTOs/`、`Data/`
- 单体服务中体量较大文件集中在 `Services/BeatmapService.cs`

### 2.4 路由分发（`cloudflare-worker/`）
- `router.js`：根据路径前缀分发请求到 Pages 或云服务器
- `SERVER_ROUTES`: `/admin`, `/tools`, `/mania`, `/api`, `/images`, `/_ssr`

## 3. 开发命令

### 3.1 静态博客前端（在 `nuxt-public/`）
- 安装依赖：`npm install`
- 本地开发：`npm run dev`
- 静态生成：`npm run generate`

### 3.2 动态 SSR 前端（在 `nuxt/`）
- 安装依赖：`npm install`
- 本地开发：`npm run dev`
- 生产构建：`npm run build`
- 产物预览：`npm run preview`

### 3.3 后端（在 `backend-dotnet/BlogApi/`）
- 运行：`dotnet run`
- 构建：`dotnet build`
- 发布：`dotnet publish -c Release`

## 4. 编码与风格约定
- Vue/Nuxt：2 空格缩进，组件 PascalCase，组合式函数 `useXxx`
- C#：4 空格缩进，类型/公开成员 PascalCase，局部变量 camelCase
- 样式：Tailwind + 组件样式文件（`nuxt/assets/css/components/*.styles.css`）
- 新增前端业务代码优先进入 `features/*`，避免继续堆积在 `pages/*` 或全局 `components/*`
- 所有的非naiveui的自行设计的部分应该封装成vue组件放在nuxt-public\app\shared\ui下

## 5. 配置与样式注意事项
- Tailwind 扫描需覆盖：`app/features/**/*.{js,vue,ts}`（已纳入）
- `NuxtLoadingIndicator` 已全局启用，避免在业务跳转里重复手动 `start/finish`
- `nuxt-vitalizer` 当前保留入口样式（`disableStylesheets: false`），避免 admin 样式缺失
- SSR 项目 `buildAssetsDir` 为 `/_ssr/`，与 Pages 的 `/_nuxt/` 隔离

## 6. 关键配置文件
- `nuxt-public/nuxt.config.ts`：静态生成配置，含 `prerender:routes` hook
- `nuxt/nuxt.config.ts`：SSR 配置，含 `buildAssetsDir: '/_ssr/'`
- `nuxt/NuxtNginx.txt`：Nginx 配置参考（server.wasd09090030.top）
- `cloudflare-worker/router.js`：Worker 路由分发
- `.github/workflows/release.yml`：CI/CD 双目标构建

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
- 后端默认数据库：`blog.sqlite`
- 首次部署后务必修改管理员默认密码（历史默认值：`admin123`）

## 10. AI Agent 执行约束
1. 操作前先进行步骤化思考，并检查上下文一致性；如发现冲突，暂停并向用户报告。
2. 涉及框架行为判断时，优先检索官方文档或仓库文档，不依赖过时记忆。
3. 项目内改动优先"小步、可回滚、可验证"，避免一次性大范围重构。
4. 前端改动后优先做定点验证（目标页面回归），避免无关的全量验证开销。
5. 非任务范围文件不改动；如发现潜在问题，在 PR 说明中列为后续项。
6. 修改 nuxt-public/ 时注意：这是静态站，不支持运行时 API 调用（客户端 fetch 除外）。
7. 修改 nuxt/ 时注意：资源路径为 `/_ssr/`，不是默认的 `/_nuxt/`。
