# Spec: tools 公开页（工具箱）— REMOVED

> **状态**: 2026-07-17 由 `remove-mania-and-tools-pages` change 引入。
> 本 spec 在 apply 前定义"此能力 SHALL NOT 存在"的契约；apply 后归档至 `openspec/specs/archive/`。

## REMOVED Requirements

### 概览

`nuxt/`（SSR 后台站）SHALL **NOT** 承载任何公开工具箱页面。所有 tools 相关用户可见入口 SHALL 不可访问或不存在。

### R-TOOLS-1: 公开路由 SHALL NOT 存在（已迁移/移除）

`nuxt/` SHALL **NOT** 包含以下页面：

- `nuxt/app/pages/tools/index.vue`（工具箱索引页）
- `nuxt/app/pages/tools/markdown-converter.vue`
- `nuxt/app/pages/tools/image-processor.vue`
- `nuxt/app/pages/tools/base64-converter.vue`
- `nuxt/app/pages/tools/password-generator.vue`
- `nuxt/app/pages/tools/text-diff.vue`

`wasd09090030.top/tools` 与 `wasd09090030.top/tools/*` 路径 SHALL 返回 HTTP 404。

### R-TOOLS-2: 工具相关组件 SHALL NOT 存在（仅工具专用）

> ℹ️ 本约束**仅针对工具专用组件**。`MarkdownRenderer.vue`（文章详情用）、`MdEditorWrapper.client.vue`（admin 编辑器用）仍可存在，不在本 spec 范围。

`nuxt/` SHALL **NOT** 包含：

- `nuxt/app/components/ImageProcessor.vue`（仅被 `pages/tools/image-processor.vue` 引用）
- `nuxt/app/components/MarkdownConverter.vue`（仅被 `pages/tools/markdown-converter.vue` 引用）

### R-TOOLS-3: 导航 SHALL NOT 引用 tools 入口

- `nuxt/app/layouts/default.vue` SHALL NOT 包含 `<NuxtLink to="/tools">`、`<a href="/tools">` 或 `key: 'tools'` 等引用
- `nuxt/app/layouts/default.vue` SHALL NOT 包含 `isToolsRoute` 计算属性
- `nuxt/app/layouts/default.vue` 的 `mobileMenuOptions` SHALL NOT 包含「工具箱」项
- `nuxt/app/layouts/default.vue` 的 `localRoutes` SHALL NOT 包含 `tools` 键
- `nuxt-public/app/layouts/default.vue` SHALL NOT 包含 `<a href="/tools">` 导航项（含桌面端顶部与移动端抽屉）

### R-TOOLS-4: 路由分发 SHALL NOT 转发 /tools

- `cloudflare-worker/router.js` 的 `SERVER_ROUTES` SHALL NOT 包含 `'/tools'` 前缀
- `nuxt/NuxtNginx.txt` 注释 SHALL NOT 包含 `/tools` 路径示例

### R-TOOLS-5: 工具子页面间导航 SHALL NOT 残留

- `nuxt/app/pages/tools/index.vue` 中的 `navigateTo('/tools/markdown-converter')` 等 5 处内部导航已随文件删除
- 验证：删除 `pages/tools/index.vue` 后，工具子页面间互链为零

## 不变

- 工具实现中使用的第三方库（如有）保留在 `nuxt/package.json` 中；其他页面若未来需要可复用
- Markdown 渲染相关组件（`MarkdownRenderer.vue`、`MdEditorWrapper.client.vue`）保留（被非工具页面使用）
