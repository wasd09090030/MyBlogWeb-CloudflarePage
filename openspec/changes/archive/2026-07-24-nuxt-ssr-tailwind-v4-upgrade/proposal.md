# Tailwind CSS v3 → v4 升级（nuxt/ 后台 SSR 站 — admin-only）

## Why

`nuxt/`（NUXTSSR 后台站）当前使用 Tailwind CSS 3.4.19（PostCSS 集成）+ Naive UI 2.43.2 + `@bg-dev/nuxt-naiveui`，主要服务于 **admin 后台**（login、articles、comments、gallery、imagebed、password）。`nuxt-public/` 已是 SSG 静态站，公开页（首页、画廊、文章、教程）已成熟完整并部署到 Cloudflare Pages，`nuxt/` 不再重复实现这些公开页。

> **2026-07-17 同步**：原 admin 后台 7 个页面包含 `beatmaps`（谱面管理）。该页面已由前置 change `remove-mania-and-tools-pages` 一并删除，admin 范围变 6 个页面。

后续规划（将 Naive UI 替换为 Nuxt UI v4、统一 design token、收敛主题机制）都以 Tailwind v4 为硬性前置条件。先完成纯净的 v3→v4 升级，让 `nuxt/` 在稳定状态下为后续 Nuxt UI 迁移解锁基础设施。

**与 nuxt-public 已完成迁移的关系**：

- `nuxt-public/` 已完成 Tailwind v3→v4 升级（OpenSpec change `archive/2026-07-14-tailwind-v4-upgrade`），本次变更复用其经验。
- `nuxt-public/` 已完成 NaiveUI→Nuxt UI v3 迁移（OpenSpec change `archive/2026-07-14-nuxt-ui-migration`）并升级到 v4（`archive/2026-07-15-upgrade-nuxt-ui-v4-public`）。`nuxt/` 后台站的 Nuxt UI 迁移是后续独立 change（`nuxt-ssr-nuxt-ui-v4-migration`，依赖本 change 合并后启动）。

**范围决策（2026-07-17 与用户确认）**：

- 本次**仅升级 Tailwind**，Naive UI 原样保留。
- 本次范围是 **`nuxt/` 仅保留 admin 后台**：公开页（首页、画廊、文章、教程）由 `nuxt-public/` 承载，`nuxt/` 不再重复实现。范围缩减后涉及 .vue 文件约 20 个（admin 6 个页面 + features/article-admin/ + features/gallery-admin/ + 2 layouts + MdEditorWrapper），较原计划（50+ 文件）大幅下降。
  - **2026-07-17 更新**：原 admin 7 个页面包含 `beatmaps`（谱面管理），已由前置 change `remove-mania-and-tools-pages` 删除（mania 公开页下线后失去 `/mania/{id}` 跳转目标），admin 范围变 6 个页面。
- ~~**公开页相关组件、依赖与配置同时清理**~~：**已由前置 change `remove-mania-and-tools-pages` 处理**（公开页文件、孤儿组件/worker/composable、worker 路由、CI/CD 注释、文档均已同步清理）。本 change 范围进一步缩减。
- Nuxt UI 引入、Naive UI 清理**明确划出本次范围**，作为后续 `nuxt-ssr-nuxt-ui-v4-migration` change。
- 关键决策：完全复用 nuxt-public Tailwind v4 升级经验，但**不需要** typography 移植（admin 不渲染 Markdown）、**不需要** `prose-theme.css`（admin 不用 `@tailwindcss/typography`）、**不需要** `inlineSSSRRStyles: false`（admin 不用文章 prose 排版）。

**附录：范围决策（公开页相关清理项，不属于本次 change，列入后续 cleanup change 或合并到 Nuxt UI migration change）**：

> **2026-07-17 更新**：以下项已**全部由前置 change `remove-mania-and-tools-pages` 完成**（2026-07-17 合并），本 change 范围进一步缩减。原始列表保留作为变更历史参考：

- ~~删除公开页 `pages/`（`index.vue`、`gallery.vue`、`about.vue`、`tutorials.vue`、`article/`、`tools/`、`mania/[id].vue`）~~ [已由 `remove-mania-and-tools-pages` 完成]
- ~~删除公开页 `layouts/default.vue`~~ [已由 `remove-mania-and-tools-pages` 完成]
- ~~删除公开页 `components/`（MarkdownRenderer、MarkdownConverter、CommentSection、SearchBar、SideBar、WelcomeSection、LoadingBar、LoadingSpinner、SkeletonLoader、GalleryLoadingAnimation、IconMarquee、ImageProcessor、Effects/*、content/*）~~ [已由 `remove-mania-and-tools-pages` 完成]
- ~~删除公开页 `features/`（home/、article-list/、article-detail/、gallery-public/、tutorials/）~~ [已由 `remove-mania-and-tools-pages` 完成]
- ~~卸载依赖：`katex`、`keen-slider`、`mermaid`、`browser-image-compression`、`html2pdf.js`、`docx`、`file-saver`、`jszip`、`pixi.js`、`@tailwindcss/typography`、`remark-math`、`rehype-katex`~~ [部分由 `remove-mania-and-tools-pages` 处理；剩余依赖卸载留后续 Nuxt UI 迁移或独立 cleanup change]
- ~~卸载 modules：`@nuxtjs/mdc`、`nuxt-vitalizer`~~ [部分由 `remove-mania-and-tools-pages` 处理；剩余 modules 卸载留后续 change]
- ~~清理 `nuxt.config.ts` 中公开页相关字段（sitemap、schemaOrg、SWR 缓存、prerender、多数 `experimental.*` 字段）~~ [部分由 `remove-mania-and-tools-pages` 处理；剩余字段清理留后续 change]

理由：范围控制原则要求"所有变更以满足需求的最小范围为目标"。Tailwind v3→v4 升级本身不需要删除公开页文件（即使有公开页文件，Tailwind v4 仍能编译）。公开页清理与 Tailwind 升级属于不同范畴，应作为独立 change 拆分（或合并到后续 Nuxt UI migration change 中一并处理）。

## What Changes

- **BREAKING（构建层）**：`tailwindcss` 3.4.19 → 4.x；PostCSS 插件链（tailwindcss + autoprefixer + cssnano）改为 `@tailwindcss/vite` 插件；`nuxt.config.ts` 移除 `postcss` 配置块。
- `tailwind.css`：`@tailwind base/components/utilities` 指令 → `@import "tailwindcss"` + `@custom-variant dark`（**不**引入 `@plugin "@tailwindcss/typography"`，admin 不用 prose）。
- `tailwind.config.js`（JS 配置）退役：仅含 `darkMode: 'class'` 与 `theme.extend` 的少量定制，无 typography 块（admin 不用 prose）。`darkMode: 'class'` 改为 CSS `@custom-variant`；content 扫描交给 v4 自动探测。
- 模板中 v3 工具类改名（官方升级工具处理）：`shadow`→`shadow-sm`、`shadow-sm`→`shadow-xs`、`rounded`→`rounded-sm`、`blur`→`blur-sm`、`flex-shrink-0`→`shrink-0` 等。预期 admin 范围涉及约 20 个 .vue 文件、改名处数远少于 nuxt-public（约 180+ 处）。
- 添加 v3 兼容基础样式（默认边框色、占位符色、按钮指针），降低视觉回归风险。
- 不改动：Naive UI 及其模块配置、admin 现有 `theme-variables.css`（admin 仍用 `--text-primary` 等 CSS variables）、Pinia stores、`server/` Nitro API 路由。
- 不引入：`prose-theme.css`（admin 不用 prose）、`inlineSSRStyles: false`（admin 不用文章排版）。

## Capabilities

### Modified Capabilities

- `styling-pipeline`: 在原有"nuxt-public 使用 Tailwind v4"基础上，扩展为"nuxt-public（SSG 静态站）与 nuxt/（SSR admin 后台）均使用 Tailwind v4，统一 Vite 插件集成、CSS-only 暗色模式定制、v3 兼容基础样式。`nuxt/` 子集不涉及 typography/prose 路径"。

## Impact

- **依赖**：`tailwindcss` 升 4.x；新增 `@tailwindcss/vite`；移除 `autoprefixer`、`cssnano`、`postcss`（v4 内置处理）。**不**移除 `@tailwindcss/typography`（admin 暂未使用但保留，避免影响后续清理）。
- **文件**：`nuxt/package.json`、`nuxt/nuxt.config.ts`、`nuxt/app/assets/css/tailwind.css`、`nuxt/tailwind.config.js`（删除）、约 20 个 admin 相关 `.vue` 文件的 class 改名。
- **浏览器支持底线抬升**：Safari 16.4+ / Chrome 111+ / Firefox 128+（v4 依赖 @property、color-mix 等）。与 nuxt-public 一致。
- **层叠行为变化**：v4 使用原生 `@layer`，未分层样式（Naive UI、手写 CSS）优先级高于 utilities，与 v3 不同，需 admin 全站视觉回归（重点：登录页、admin/index、admin/articles 列表、表单弹窗、暗色模式）。
- **CI/构建时间**：Tailwind v4 通过 `@tailwindcss/vite` 集成，构建时间预期下降（无 PostCSS 链路）；`pnpm build` 实测对比 Phase A 前后。