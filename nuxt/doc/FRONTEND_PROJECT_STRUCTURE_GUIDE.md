# Nuxt 前端项目结构详解（MyBlogWeb）

本文档用于说明 `nuxt/` 前端工程中各目录与关键文件的职责，帮助快速定位代码位置、理解分层边界。

## 1. 顶层目录（`nuxt/`）

### 1.1 核心配置文件
- `nuxt.config.ts`
  - Nuxt 主配置入口。
  - 负责模块注册（如 `@nuxtjs/mdc`）、运行时配置、构建选项、路由/渲染行为等。
- `tailwind.config.js`
  - Tailwind 扫描路径与主题扩展配置。
- `tsconfig.json`
  - TypeScript 基础配置。
- `tsconfig.strict.phase*.json`
  - 分阶段严格模式迁移配置。
- `app.vue`
  - 应用根组件（全局入口壳层）。

### 1.2 运行与部署相关
- `package.json`
  - 前端依赖、脚本命令（`dev/build/preview`）定义。
- `ecosystem.config.js`
  - 进程管理（常见于 PM2）配置。
- `build-production.ps1`
  - 生产构建脚本（Windows）。

### 1.3 文档与公共资源
- `doc/`
  - 前端内部技术文档（CSS 架构、MDC、SEO、安全等）。
- `public/`
  - 静态资源目录（图片、图标、字体、`robots.txt` 等）。
  - 文件会按原路径直接对外提供（不经打包 hash）。

---

## 2. 应用主目录（`nuxt/app/`）

`app/` 是业务代码核心，采用 feature-first 思路组织。

### 2.1 入口与全局层
- `app/app.config.ts`
  - 应用级配置（如运行时表现、全局参数）。
- `app/app.vue`
  - 渲染根节点，配合布局/路由进行页面装配。

### 2.2 页面与布局
- `app/pages/`
  - 文件系统路由入口层，尽量保持轻量。
  - 常见文件：
    - `index.vue`：首页路由入口。
    - `gallery.vue` / `tutorials.vue` / `about.vue`：对应一级页面。
    - `article/`、`admin/`、`tools/`、`mania/`：分区路由。
- `app/layouts/`
  - 页面布局层。
  - 关键文件：
    - `default.vue`：默认布局（含导航、页脚、通用容器）。
    - `admin.vue`：后台布局。
    - `blank.vue`：极简/空白布局。

### 2.3 功能域（Feature Layer）
- `app/features/`
  - 业务主层，按功能拆分，避免“按技术类型”散落。
  - 当前目录：
    - `article-list/`：文章列表相关 UI、状态与业务。
    - `article-detail/`：文章详情页（内容渲染、TOC、详情请求等）。
    - `article-admin/`：后台文章管理与编辑。
    - `gallery-public/` / `gallery-admin/`：画廊前后台。
    - `home/`：首页特定模块。
    - `tutorials/`：教程页容器与工具函数。

#### 典型 Feature 子结构（示例）
以 `article-detail/`、`article-list/` 为例，常见分层：
- `components/`：该功能私有组件（如详情页 `Toc.vue`、`Content.vue`）。
- `containers/`：页面级容器组件，负责编排子组件与状态流。
- `composables/`：功能专属组合式逻辑（数据请求、状态派生、行为封装）。
- `services/`：API 调用与数据访问适配。
- `types/`：功能域 TS 类型定义。
- `utils/`：功能域工具函数。

### 2.4 共享层（Shared Layer）
- `app/shared/`
  - 跨功能共享能力。
  - 子目录：
    - `api/`：统一请求封装、接口调用基础能力。
    - `cache/`：通用缓存策略与工具。
    - `errors/`：错误归一化、日志与异常处理。
    - `types/`：跨 feature 的公共类型。
    - `ui/`：可复用基础 UI 组件（如状态组件）。

### 2.5 通用组件与历史兼容区
- `app/components/`
  - 全局/跨功能通用组件，以及迁移中仍被复用的组件。
  - 关键文件示例：
    - `MarkdownRenderer.vue`：MDC/Markdown 渲染核心组件。
    - `MdEditorWrapper.client.vue`：编辑器封装组件（客户端）。
    - `WelcomeSection.vue`：首页欢迎区。
    - `SideBar.vue`：站点侧边栏。
    - `CommentSection.vue`：评论模块。

### 2.6 状态、插件与中间件
- `app/stores/`
  - Pinia 状态管理（当前主要为 `auth.ts`）。
- `app/plugins/`
  - Nuxt 插件注入层。
  - 示例：
    - `naive-ui.client.ts`：Naive UI 客户端初始化。
    - `workerPrefetch.client.ts`：路由/数据预取策略。
    - `performanceMonitor.client.ts`：性能监控。
- `app/middleware/`
  - 路由中间件（如鉴权、重定向策略）。

### 2.7 组合式函数与工具
- `app/composables/`
  - 全局可复用 composables（跨 feature）。
- `app/utils/`
  - 工具函数与 Worker 相关逻辑（例如 markdown 预处理、缓存协作）。
- `app/types/`
  - 应用层全局类型定义。

### 2.8 样式层
- `app/assets/`
  - 全局样式、主题变量与组件样式文件。
  - 常见结构：
    - `css/theme-variables.css`：主题 token。
    - `css/app.css`：全局基础样式。
    - `css/components/*.styles.css`：组件样式分文件维护。

---

## 3. 路由入口与 Feature 的协作方式

推荐协作模式：
1. `pages/*.vue` 作为路由入口，仅负责“转发与装配”；
2. 业务逻辑下沉到 `features/<domain>/containers + composables + services`；
3. 共享能力放入 `shared/*`；
4. 纯通用组件放 `components/`，避免业务耦合。

这样可获得：
- 更好的可维护性（按业务定位问题）；
- 更清晰的边界（共享与私有分离）；
- 迁移/重构成本更低（局部 feature 可独立演进）。

---

## 4. 新增代码建议（团队约定）

- 新增业务优先放入 `app/features/*`，避免继续堆积到 `pages/*` 与全局 `components/*`。
- 路由页尽量“薄”，不要把复杂业务直接写在 `pages`。
- 跨功能复用能力（API、错误、类型、UI）统一沉淀到 `shared/*`。
- 样式优先复用主题变量与现有 CSS 架构，避免硬编码。

---

## 5. 快速定位参考

- 导航与整体布局：`app/layouts/default.vue`
- 首页欢迎区：`app/components/WelcomeSection.vue`
- 文章详情 TOC：`app/features/article-detail/components/Toc.vue`
- Markdown/MDC 渲染：`app/components/MarkdownRenderer.vue`
- 后台文章编辑页：`app/pages/admin/articles/[id].vue`
- 全局主题变量：`app/assets/css/theme-variables.css`

> 本文档用于结构说明，不替代具体功能文档；涉及某功能的接口和行为细节，请查看 `nuxt/doc/` 下对应专题文档。