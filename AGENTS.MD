## 开发环境

Windows powershell

## 1. 项目概览
本仓库是全栈博客系统：
- 前端：`nuxt/`（Nuxt 3，现已进入 feature-first 结构迁移阶段后期）
- 后端：`backend-dotnet/BlogApi/`（.NET 8 Web API）

## 核心行为
1. 你的每一步操作，都需要调用 Sequential thinking mcp 服务思考问题。并反思自己上下文是否一致，如果发现冲突，立刻停止工作，向用户报告情况，等待反馈
2. 记得调用 mcp router 的 fetch、context7 mcp等服务，你必须搜索最新的知识，禁止直接使用 LLM 内置过时知识库。避免造成时间滞后带来的错误.


## 2. 当前结构（按迁移后状态）

### 2.1 前端（`nuxt/app/`）
- `features/`：业务主层（推荐新增功能优先放这里）
	- `article-list/`
	- `article-detail/`
	- `article-admin/`
	- `gallery-public/`
	- `gallery-admin/`
	- `home/`
	- `tutorials/`
- `shared/`：跨功能共享层
	- `api/` `cache/` `errors/` `types/` `ui/`
- `layouts/`：布局层（`default.vue` / `admin.vue` / `blank.vue`）
- `pages/`：路由入口层（保持轻量，尽量转发到 features 容器）
- `components/`：仍在使用的通用组件（逐步收敛）
- `stores/`：Pinia 状态管理
- `utils/`：通用工具与 worker 相关逻辑

### 2.2 已完成的迁移收敛（重要）
- 旧薄封装已移除：`app/composables/useArticles*`、`useGallery*`、`useAdmin*`、`useArticleCache`
- 旧目录已清理：`app/functions/`（含 `Tutorials/*`）
- 教程相关工具迁移到：`features/tutorials/utils/*`

### 2.3 后端（`backend-dotnet/BlogApi/`）
- `Controllers/`、`Services/`、`Models/`、`DTOs/`、`Data/`
- 单体服务中体量较大文件集中在 `Services/BeatmapService.cs`

## 3. 开发命令

### 3.1 前端（在 `nuxt/`）
- 安装依赖：`npm install`
- 本地开发：`npm run dev`
- 生产构建：`npm run build`
- 产物预览：`npm run preview`

### 3.2 后端（在 `backend-dotnet/BlogApi/`）
- 运行：`dotnet run`
- 构建：`dotnet build`
- 发布：`dotnet publish -c Release`

## 4. 编码与风格约定
- Vue/Nuxt：2 空格缩进，组件 PascalCase，组合式函数 `useXxx`
- C#：4 空格缩进，类型/公开成员 PascalCase，局部变量 camelCase
- 样式：Tailwind + 组件样式文件（`nuxt/assets/css/components/*.styles.css`）
- 新增前端业务代码优先进入 `features/*`，避免继续堆积在 `pages/*` 或全局 `components/*`

## 5. 配置与样式注意事项（迁移后）
- Tailwind 扫描需覆盖：`app/features/**/*.{js,vue,ts}`（已纳入）
- `NuxtLoadingIndicator` 已全局启用，避免在业务跳转里重复手动 `start/finish`
- `nuxt-vitalizer` 当前保留入口样式（`disableStylesheets: false`），避免 admin 样式缺失

## 6. 测试与验证策略
- 当前无完整自动化测试套件
- 变更后优先做“局部静态检查 + 关键路径手工回归”
- 前端验证以功能页面回归为主，不强制每次执行完整构建

## 7. 提交与 PR 规范
- Commit 信息简短、单一目的、中文可接受
- PR 建议包含：
	- 背景/问题描述
	- 复现与修复点
	- 验证步骤与结果
	- 风险评估与回滚方式
	- UI 变更截图（如有）

## 8. 安全与配置
- 前端环境变量：`NUXT_PUBLIC_API_BASE_URL`、`NUXT_PUBLIC_SITE_URL`
- 后端默认数据库：`blog.sqlite`
- 首次部署后务必修改管理员默认密码（历史默认值：`admin123`）

## 9. AI Agent 执行约束
1. 操作前先进行步骤化思考，并检查上下文一致性；如发现冲突，暂停并向用户报告。
2. 涉及框架行为判断时，优先检索官方文档或仓库文档，不依赖过时记忆。
3. 项目内改动优先“小步、可回滚、可验证”，避免一次性大范围重构。
4. 前端改动后优先做定点验证（目标页面回归），避免无关的全量验证开销。
5. 非任务范围文件不改动；如发现潜在问题，在 PR 说明中列为后续项。
