# tools 公开页（工具箱）— REMOVED 规格增量

> **状态**: 2026-07-17 由 `remove-mania-and-tools-pages` change 引入并完成。
> 本 spec 在 apply 前定义"此能力 SHALL NOT 存在"的契约；apply 后归档至 `openspec/specs/archive/`。

## REMOVED Requirements

### Requirement: tools 公开路由 SHALL NOT 存在

`nuxt/` SSR 后台站 SHALL **NOT** 包含以下页面文件，且 `wasd09090030.top/tools` 与 `wasd09090030.top/tools/*` 路径 SHALL 返回 HTTP 404（由 Cloudflare Pages 在 SSR 不再处理的情况下处理）：

- `nuxt/app/pages/tools/index.vue`（工具箱索引页）
- `nuxt/app/pages/tools/markdown-converter.vue`
- `nuxt/app/pages/tools/image-processor.vue`
- `nuxt/app/pages/tools/base64-converter.vue`
- `nuxt/app/pages/tools/password-generator.vue`
- `nuxt/app/pages/tools/text-diff.vue`

#### Scenario: 公开路由文件不存在

- **WHEN** 检查 `nuxt/app/pages/`
- **THEN** 该目录 SHALL NOT 包含 `tools/` 子目录

#### Scenario: HTTP 404 行为

- **WHEN** 浏览器访问 `wasd09090030.top/tools` 或 `wasd09090030.top/tools/*`
- **THEN** 响应 SHALL 为 HTTP 404（由 Cloudflare Pages 处理，因 Worker 已不转发）

### Requirement: 工具专用组件 SHALL NOT 存在

> 本约束**仅针对工具专用组件**。`MarkdownRenderer.vue`（被 `nuxt-public/app/features/article-detail/` 引用）与 `MdEditorWrapper.client.vue`（被 admin 文章编辑器使用）仍 SHALL 存在，不在本 spec 范围。

`nuxt/` SHALL **NOT** 包含以下工具专用组件：

- `nuxt/app/components/ImageProcessor.vue`（仅被 `pages/tools/image-processor.vue` 引用，删除该页后整组件失用）
- `nuxt/app/components/MarkdownConverter.vue`（仅被 `pages/tools/markdown-converter.vue` 引用，删除该页后整组件失用）

`nuxt/` SHALL **NOT** 包含以下孤儿 composable 与 worker（仅被上述工具组件引用）：

- `nuxt/app/composables/useImageProcessorWorker.ts`
- `nuxt/app/utils/workers/imageProcessor.worker.ts`

#### Scenario: 工具组件与孤儿链不存在

- **WHEN** 检查 `nuxt/app/components/ImageProcessor.vue`、`MarkdownConverter.vue`、`composables/useImageProcessorWorker.ts`、`utils/workers/imageProcessor.worker.ts`
- **THEN** 这 4 个文件 SHALL NOT 存在

#### Scenario: 其他 Markdown 组件保留

- **WHEN** 检查 `nuxt/app/components/MarkdownRenderer.vue` 与 `MdEditorWrapper.client.vue`
- **THEN** 这 2 个文件 SHALL 仍存在（被其他页面使用，不在工具范围）

### Requirement: 导航 SHALL NOT 引用 tools 入口

前端 layout 布局 SHALL NOT 包含指向 `/tools` 的导航项：

- `nuxt/app/layouts/default.vue` SHALL NOT 包含 `<NuxtLink to="/tools">`、`<a href="/tools">` 或 `key: 'tools'` 等引用
- `nuxt/app/layouts/default.vue` SHALL NOT 包含 `isToolsRoute` 计算属性
- `nuxt/app/layouts/default.vue` 的 `mobileMenuOptions` 数组 SHALL NOT 包含「工具箱」菜单项
- `nuxt/app/layouts/default.vue` 的 `localRoutes` 映射 SHALL NOT 包含 `tools` 键
- `nuxt-public/app/layouts/default.vue` SHALL NOT 包含 `<a href="/tools">` 导航项（桌面端顶部与移动端抽屉均 SHALL NOT）

#### Scenario: nuxt 布局无 tools 引用

- **WHEN** 在 `nuxt/app/layouts/default.vue` 中 grep `tools`
- **THEN** 命中数 SHALL 为 0

#### Scenario: nuxt-public 布局无 tools 引用

- **WHEN** 在 `nuxt-public/app/layouts/default.vue` 中 grep `tools`
- **THEN** 命中数 SHALL 为 0

### Requirement: 路由分发 SHALL NOT 转发 /tools

部署配置 SHALL NOT 将 `/tools` 路径转发到云服务器 SSR：

- `cloudflare-worker/router.js` 的 `SERVER_ROUTES` 数组 SHALL NOT 包含 `'/tools'` 前缀
- `nuxt/NuxtNginx.txt` 注释 SHALL NOT 包含 `/tools` 路径示例
- `.github/workflows/release.yml` 注释与 release notes SHALL NOT 提及 `/tools` 路由

#### Scenario: Worker SERVER_ROUTES 配置

- **WHEN** 检查 `cloudflare-worker/router.js` 的 `SERVER_ROUTES` 常量
- **THEN** 该数组 SHALL NOT 包含字符串 `'/tools'`

#### Scenario: CI/CD 与部署文档无 tools 路径

- **WHEN** 在 `.github/workflows/release.yml` 与 `nuxt/NuxtNginx.txt` 中 grep `tools`
- **THEN** 命中数 SHALL 为 0

### Requirement: 工具子页面间导航 SHALL NOT 残留

`pages/tools/index.vue` 中的 `navigateTo('/tools/markdown-converter')` 等 5 处内部导航已随该索引页文件删除而消失。删除 `pages/tools/index.vue` 后，工具子页面间互链 SHALL 为 0。

#### Scenario: 工具索引页不存在

- **WHEN** 检查 `nuxt/app/pages/tools/`
- **THEN** 整个 `tools/` 目录 SHALL NOT 存在（包含 6 个子页面）

## 不变

- 工具实现中使用的第三方库（如有）保留在 `nuxt/package.json` 中；其他页面若未来需要可复用
- Markdown 渲染相关组件（`MarkdownRenderer.vue`、`MdEditorWrapper.client.vue`）保留（被非工具页面使用）
