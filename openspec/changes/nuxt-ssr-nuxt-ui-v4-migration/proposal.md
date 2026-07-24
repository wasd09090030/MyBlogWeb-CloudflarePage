# nuxt/ 后台 SSR 站 UI 库迁移：NaiveUI → Nuxt UI v4（admin-only）

> **承接关系**：本 change 承接 `openspec/changes/nuxt-shrink-to-pure-admin-and-nuxt-ui-v4/` 的"路径 C：仅范围收缩"（已实施）。原 change 把 UI 迁移延后到 Tailwind v3→v4 升级联动，本 change 即为该 UI 迁移实施。
> **依赖**：Tailwind v3→v4 升级由 OpenSpec change `nuxt-ssr-tailwind-v4-upgrade`（已 archive，2026-07-24, commit `6a9f3e5`）完成；本 change 基于 v4 基础设施。
> **范围**：admin-only。`nuxt/` 仅承载 admin 后台，公开页由 `nuxt-public/` SSG 静态站承载。

## Why

`nuxt/`（NUXTSSR 后台站）当前以 NaiveUI 2.43.2 + `@bg-dev/nuxt-naiveui` 作为 Vue 组件库，仅服务于 **admin 后台**（login、articles、comments、gallery、imagebed、password）。`nuxt-public/` 已是 SSG 静态站且非常成熟，公开页（首页、画廊、文章、教程）由 `nuxt-public/` 承载，`nuxt/` 不再重复实现。

> **2026-07-17 同步**：原 admin 后台 7 个页面包含 `beatmaps`（谱面管理）。该页面已由 change `remove-mania-and-tools-pages` 一并删除（mania 公开页下线后失去 `/mania/{id}` 跳转目标），admin 范围变 6 个页面；后续 `articles/` 子目录新增 `[id].vue` 与 `create.vue`，实际页面文件数 8 个。

NaiveUI 在 admin 后台 8 个页面文件（含 `articles/{index,[id],create}.vue`）与 `features/article-admin/`、`features/gallery-admin/` 中广泛使用：`<n-form>` 表单校验、`<n-modal>`/`<n-drawer>` 弹窗抽屉、`<n-data-table>` 表格、`<n-upload>` 上传、`<n-button>` 按钮等。NaiveUI 的企业中性风格与 Tailwind v4 + 自定义设计 token 风格割裂；`n-config-provider :theme-overrides` 的主题机制与项目里已统一的 CSS 变量体系重复维护。

`nuxt-public/` 已完成 NaiveUI → Nuxt UI v3 → Nuxt UI v4 的迁移（OpenSpec changes `archive/2026-07-14-nuxt-ui-migration` 与 `archive/2026-07-15-upgrade-nuxt-ui-v4-public`）。`nuxt/` 后台站作为同一项目的另一个 Nuxt 4 应用，技术栈与基础设施完全对齐，可以直接复用其经验，且因 admin-only 范围工作量大幅缩减。

**范围决策（2026-07-17 与用户确认）**：

- **仅迁移 `nuxt/` admin 部分**。`nuxt-public/` 已完成迁移，不在本次范围。
- **两阶段拆分**：Phase A（Tailwind v4 升级，独立 change `nuxt-ssr-tailwind-v4-upgrade`）→ Phase B（本 change，Nuxt UI v4 admin-only 替换）。本 change 显式声明依赖 Phase A 已合并。
- **渐进式 4 子阶段**：B.1 接入、B.2 admin layout、B.3 admin 业务、B.4 清理归档。较原 7 子阶段（B.1-B.7）删除 B.3 公开页、B.6 多数特殊组件豁免。
- **关键决策**：
  - Q1 表单校验用 **valibot**（与 nuxt-public 一致）
  - Q2 `n-rate` 评分组件：admin 不使用，**不实现**自实现 StarRating
  - Q3 不实现新加载条 —— `LoadingBar.vue` 随公开页删除
  - Q4 主题系统分阶段重构：`app.config.ts` + Tailwind v4 `@theme`；admin 现有 CSS variables 保留
  - Q5 `nuxt.config.ts` 所有 naiveui 相关配置**最后统一清理**
  - Q6 `md-editor-v3` **保留**（admin 文章编辑器，Nuxt UI 无等价富文本编辑器）
  - Q7 `ImageProcessor` 与 mania 游戏**已在 Phase A 范围内随公开页保留**，本次 change 不处理（实际随后续公开页清理 change 一并删除）

## What Changes

- **BREAKING（依赖）**：`nuxt/package.json` 移除 `naive-ui`、`@bg-dev/nuxt-naiveui`；新增 `@nuxt/ui`（^4.9.0）、`valibot`、`@vueuse/motion/nuxt`。
- **BREAKING（主题）**：`app/layouts/admin.vue` 删除 `<n-config-provider :theme-overrides>` + `<n-message-provider>` + `<n-dialog-provider>`；主题色与圆角 token 迁出到 `app/app.config.ts` 的 `ui.colors` 与 `app/assets/css/main.css` 的 `@theme` 指令。
- **BREAKING（全局 Provider）**：`app/app.vue` 引入 `<UApp>` 包裹 `<NuxtLayout>`，取代 NaiveUI provider 模型。
- **破坏性替换（~20 个 admin 文件）**：admin 6 个页面（index、login、password、articles、comments、imagebed；gallery 管理由 `features/gallery-admin/` 承载）与 `features/article-admin/`、`features/gallery-admin/`、`layouts/admin.vue`、`layouts/blank.vue` 中的 `<n-xxx>` 组件实例替换为 `<Uxxx>`；`useMessage()`/`useDialog()` 替换为 `useToast()`；`n-form + rules` 替换为 `UForm + valibot schema + UFormField`；`n-data-table` 替换为 `UTable`；`n-upload` 替换为 `UFileUpload`。
- **新增 capability**：`ui-library-nuxt-ssr` —— 记录"nuxt/ 后台 SSR 站 admin 部分使用 Nuxt UI v4 作为唯一组件库"及配套契约；明确豁免 `MdEditorWrapper.client.vue`。
- **清理**：`nuxt.config.ts` 删除 `naiveui` 配置块、`build.transpile` 中的 `'naive-ui'`、`vite.optimizeDeps.include` 中的 `'naive-ui'`、`manualChunks` 中 `node_modules/naive-ui` 分支。
- **不删除**：公开页文件、组件、features、依赖（`katex`、`mermaid`、`pixi.js` 等）、modules（`@nuxtjs/mdc`、`nuxt-vitalizer`）、`nuxt.config.ts` 中公开页相关字段。这些由后续独立 cleanup change 处理。

## Capabilities

### New Capabilities

- `ui-library-nuxt-ssr`: nuxt/ 后台 SSR 站 admin 部分的 UI 组件库契约——使用 Nuxt UI v4 作为唯一组件库来源、`UApp` 全局包裹、`app.config.ts` + `@theme` 主题系统、`.dark` class 暗色模式、`valibot` 表单校验、不存在 NaiveUI 残留、`MdEditorWrapper.client.vue`（md-editor-v3）明确豁免。

### Modified Capabilities

- `styling-pipeline`（来自 `nuxt-ssr-tailwind-v4-upgrade` change）：增加约束"nuxt/ admin 不再使用 NaiveUI 主题机制"，与 v4 `@theme` 解耦。

## Impact

- **依赖**：
  - 新增：`@nuxt/ui`（^4.9.0）、`valibot`（^1.x）、`@vueuse/motion/nuxt`（^2.x）
  - 移除：`naive-ui`、`@bg-dev/nuxt-naiveui`
  - 保留：`tailwindcss` v4、`@tailwindcss/vite`、`@nuxt/icon`、`md-editor-v3` 等
- **文件改动**：
  - 新增：`app/app.config.ts`、`app/assets/css/main.css`
  - 修改：`app/app.vue`、`app/layouts/admin.vue`、`app/layouts/blank.vue`、`nuxt.config.ts`、`package.json`
  - 替换：admin 7 个页面 + `features/article-admin/containers/AdminArticleEditorContainer.vue` + `features/gallery-admin/` 下 9 个组件 + `layouts/admin.vue` + `layouts/blank.vue` + `components/MdEditorWrapper.client.vue` 内部清理
- **浏览器底线**：与 Tailwind v4 升级保持一致（Safari 16.4+ / Chrome 111+ / Firefox 128+），无新增要求。
- **行为变化**：
  - dark mode 切换：admin `useTheme` 调整 `.dark` class 同步机制；NaiveUI 替换处涉及范围内的 `.dark-theme`/`.light-theme` legacy 标记替换为 `.dark`，全站收敛留后续 change。
  - 表单提交：admin 表单由 rules 对象改为 valibot schema，行为等价。
  - 表格：`<UTable>` 与 `<n-data-table>` 在分页+筛选+排序组合下行为需 Phase B.3 启动前 PoC 验证。
  - 上传：`<n-upload>` → `<UFileUpload>`，文件压缩仍由 `browser-image-compression` 兜底。
- **技术债**：admin 现有 CSS variables（`--text-primary`、`--primary-color` 等）与 `@theme` token 双轨维护；本次不动，全站收敛留后续 change。
- **已知风险**：
  - admin 表单/弹窗/抽屉/上传的视觉回退（特别是按钮配色、表单错误状态）。
  - Pinia store action 内 `useToast()` 调用必须在 `setup()` 顶层。
  - `<UTable>` 在 Nuxt UI v4 早期版本对分页+排序的组合可能与 `<n-data-table>` 不完全等价；Phase B.3 启动前 PoC 验证。