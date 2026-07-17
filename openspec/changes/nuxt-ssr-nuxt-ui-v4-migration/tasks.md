# Tasks: nuxt/ 后台 SSR 站 UI 库迁移（admin-only）

> **状态**: 🟡 待执行 — 依赖 OpenSpec change `nuxt-ssr-tailwind-v4-upgrade` 已合并。
> **范围**：admin-only。`nuxt/` 仅承载 admin 后台，公开页由 `nuxt-public/` SSG 静态站承载。
> 阶段完成后归档命令：`openspec archive nuxt-ssr-nuxt-ui-v4-migration`。

## 1. Phase B.1 — 基础设施接入

- [ ] 1.1 创建 `feature/nuxt-ssr-nuxt-ui-v4-migration` 分支（基于已合并的 `nuxt-ssr-tailwind-v4-upgrade`）
- [ ] 1.2 备份 `nuxt/package.json` + `nuxt/package-lock.json` → `_archive/`（便于回滚）
- [ ] 1.3 `pnpm add @nuxt/ui@^4.9.0 valibot@^1.x @vueuse/motion/nuxt@^2.x`
- [ ] 1.4 创建 `nuxt/app/app.config.ts`，写入 `ui.colors` 基础映射（primary=blue、neutral=slate）+ ui.icons.dynamicRounded + ui.button.defaultVariants
- [ ] 1.5 创建 `nuxt/app/assets/css/main.css`，写入 `@theme` 块（primary 50-900 色阶 + radius-md/lg/xl token）
- [ ] 1.6 `nuxt.config.ts`：`css: []` 加入 `~/assets/css/main.css`（在 `tailwind.css` 之后）；`modules` 加入 `'@vueuse/motion/nuxt'` 与 `'@nuxt/ui'`
- [ ] 1.7 `nuxt/app/app.vue` 引入 `<UApp>` 包裹 `<NuxtLayout>`
- [ ] 1.8 验证：`pnpm typecheck` 通过；`pnpm build` 通过；`pnpm dev` curl `/admin/login` 返回 200 且 HTML 含 `<UApp>` 渲染产物

## 2. Phase B.2 — admin layout 替换

- [ ] 2.1 `nuxt/app/layouts/admin.vue`：
  - 删除 `<n-config-provider>`/`<n-message-provider>`/`<n-dialog-provider>` 包裹
  - 删除 `import { darkTheme } from 'naive-ui'`
  - `<n-button>` → `<UButton>`
  - scoped CSS 内 NaiveUI 替换处涉及的 `.dark-theme`/`:global(.dark-theme)` → `.dark`/`:global(.dark)`
- [ ] 2.2 `nuxt/app/layouts/blank.vue`：删除 `<n-message-provider>` 与 `import { NMessageProvider }`
- [ ] 2.3 验证：
  - `/admin`、`/admin/login` 页面顶部导航正常
  - 登出按钮可用
  - 移动端 admin 菜单正常
  - `grep -rn "n-config-provider\|n-message-provider\|n-dialog-provider" nuxt/app/layouts/` 0 命中

## 3. Phase B.3 — admin 业务替换

- [ ] 3.0 **分支 PoC**：验证 `<UTable>` 与 `<n-data-table>` 在 admin/articles、admin/comments、admin/gallery 三个列表的功能对等性（pagination、filter、sort、row 操作）
  - 不达标 → `<UTable>` + 手动分页/筛选
  - 达标 → 继续 3.1
- [ ] 3.1 `nuxt/app/pages/admin/login.vue`：form + valibot
- [ ] 3.2 `nuxt/app/pages/admin/password.vue`：form + valibot
- [ ] 3.3 `nuxt/app/pages/admin/index.vue`：dashboard 替换
- [ ] 3.4 `nuxt/app/pages/admin/articles/index.vue`：n-data-table → UTable + form + valibot + 删除模态
- [ ] 3.5 `nuxt/app/pages/admin/comments/index.vue`：n-data-table → UTable
- [ ] ~~3.6 `nuxt/app/pages/admin/beatmaps/index.vue`：n-data-table → UTable + n-upload → UFileUpload~~ [已废弃：admin/beatmaps 页面已由 change `remove-mania-and-tools-pages` 删除]
- [ ] 3.6 `nuxt/app/pages/admin/gallery/index.vue`：n-data-table → UTable + 编辑模态
- [ ] 3.7 `nuxt/app/pages/admin/imagebed/index.vue`：n-upload → UFileUpload + 预览模态 + 拖拽上传
- [ ] 3.8 `nuxt/app/features/article-admin/containers/AdminArticleEditorContainer.vue`：
  - md-editor-v3 保留（`MdEditorWrapper.client.vue` 调用不变）
  - form 改 valibot
  - 清理 `<n-*>` 引用
- [ ] 3.10 grep `MdEditorWrapper.client.vue` 内部 `<n-*>` 引用：
  - 命令：`grep -n "<n-" nuxt/app/components/MdEditorWrapper.client.vue`
  - 仅清理自定义工具栏扩展引用，保留 md-editor-v3 自带 toolbar
- [ ] 3.11 `nuxt/app/features/gallery-admin/`：
  - `composables/useAdminImagebedPage.ts`
  - `containers/AdminGalleryPageContainer.vue`
  - `components/imagebed/ImagebedFileArea.vue`
  - `components/imagebed/ImagebedPreviewModal.vue`
  - `components/imagebed/ImagebedToolbar.vue`
  - `components/imagebed/ImagebedUploadArea.vue`
  - `components/gallery/GalleryCardGrid.vue`
  - `components/gallery/GalleryEditModal.vue`
  - `components/gallery/GalleryFilterBar.vue`
- [ ] 3.12 Pinia store 内 `useToast()` 调用规范化（`useAuthStore` 等所有 action）
- [ ] 3.13 验证：
  - 登录流程跑通
  - 文章 CRUD 跑通
  - 评论管理跑通
  - 谱面管理跑通
  - 画廊编辑跑通
  - 图床管理跑通（拖拽、上传、复制链接、预览模态）
  - 修改密码跑通
  - `grep -rEn "<n-(data-table|upload|form|modal|drawer|button|input|select|message|config-provider|dialog-provider)" nuxt/app/pages/admin/ nuxt/app/features/article-admin/ nuxt/app/features/gallery-admin/ nuxt/app/components/MdEditorWrapper.client.vue` 仅豁免项允许命中

## 4. Phase B.4 — 清理归档

- [ ] 4.1 `nuxt/nuxt.config.ts`：
  - `modules` 删除 `'@bg-dev/nuxt-naiveui'`
  - 删除 `naiveui: { ... }` 配置块
  - `build.transpile` 删除 `'naive-ui'`
  - `vite.optimizeDeps.include` 删除 `'naive-ui'`
  - `manualChunks` 内 `naive-ui` 分支替换为 `@nuxt/ui` / `reka-ui` / `@internationalized`（chunk 名仍为 `vendor-ui`）
- [ ] 4.2 `nuxt/package.json`：移除 `naive-ui` 与 `@bg-dev/nuxt-naiveui`；`pnpm uninstall` 同步 lockfile
- [ ] 4.3 grep admin 范围确认无运行时残留：
  - `grep -rn "from 'naive-ui'" nuxt/app/pages/admin/ nuxt/app/features/article-admin/ nuxt/app/features/gallery-admin/ nuxt/app/layouts/admin.vue nuxt/app/layouts/blank.vue` 0 命中
  - `grep -rn "@bg-dev/nuxt-naiveui" nuxt/nuxt.config.ts` 0 命中
  - `grep -rEn "<n-(button|modal|drawer|form|input|select|message|config-provider|dialog-provider|menu|table|upload|alert|tag|spin|rate|pagination)" nuxt/app/pages/admin/ nuxt/app/features/article-admin/ nuxt/app/features/gallery-admin/` 仅豁免项允许命中
- [ ] 4.4 全站 build 验证：`pnpm build` 通过；构建产物体积对比
- [ ] 4.5 更新 `nuxt/README.md`（技术栈段：NaiveUI → Nuxt UI v4；明确 admin-only 范围，公开页由 `nuxt-public/` 承载）；`AGENTS.md`（项目概览段同步标注）
- [ ] 4.6 更新项目记忆 `C:\Users\COWAIN\.claude\projects\D--Work-space-MyBlogWeb-CloudflarePage\memory\`：
  - `MEMORY.md` 新增 `nuxt-ssr-ui-migration-roadmap.md` 索引
  - `ui-roadmap-naiveui-to-nuxtui.md` 追加"nuxt/（SSR）admin-only 进度"段落
- [ ] 4.7 归档：`openspec archive nuxt-ssr-nuxt-ui-v4-migration`

## 关键交付物

- ✅ `nuxt/package.json` 移除 `naive-ui`、`@bg-dev/nuxt-naiveui`；新增 `@nuxt/ui@^4.9.0`、`valibot`、`@vueuse/motion/nuxt`
- ✅ `nuxt/app/app.config.ts` 新增（ui.colors、ui.icons、ui.button.defaultVariants）
- ✅ `nuxt/app/assets/css/main.css` 新增（@theme 块：primary 50-900 + radius-md/lg/xl）
- ✅ `nuxt/app/app.vue` 引入 `<UApp>` 包裹
- ✅ `nuxt/app/layouts/admin.vue`、`blank.vue` NaiveUI 全部清理
- ✅ admin 7 个页面 + `features/article-admin/`、`features/gallery-admin/` + 2 layouts + `MdEditorWrapper.client.vue` 共 ~20 个 `.vue` 文件的 `<n-*>` 组件实例替换
- ✅ `MdEditorWrapper.client.vue`（md-editor-v3）保留，豁免清单内
- ✅ Pinia store 内 `useToast()` 调用规范化
- ✅ `nuxt/nuxt.config.ts` admin 范围内 NaiveUI 配置块删除
- ✅ `pnpm css:audit && pnpm css:imports:audit` 0 violation
- ✅ `pnpm typecheck` 0 error
- ✅ `pnpm build` 通过；admin 关键路径 HTTP 200
- ✅ README + 项目记忆同步更新

## 关键决策回顾

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 迁移策略 | 4 子阶段 admin-only | 范围缩减；公开页由 nuxt-public 承载 |
| 迁移顺序 | admin layout → admin 业务 → 清理 | admin 是 Nuxt UI 替换的唯一定位 |
| Nuxt UI 版本 | v4（^4.9.0） | 与 nuxt-public 一致 |
| ui.prose | false | admin 不用 prose |
| 表单校验 | valibot | 与 nuxt-public 一致 |
| md-editor-v3 | 保留 | Nuxt UI 无等价；admin 编辑器必需 |
| ImageProcessor | 不处理 | 公开页保留；本次 admin 范围不涉及 |
| mania | 不处理 | 公开页保留；本次 admin 范围不涉及 |
| Pinia + Toast | setup 顶层调用 useToast() | composable 上下文合法 |
| `<UTable>` PoC | B.3 启动前分支验证 | 避免大爆炸 |
| LoadingBar | 不处理 | 公开页保留；本次 admin 范围不涉及 |
| CSS variables 双轨 | 保留 | 渐进收敛是设计决定 |

## 与公开页清理 change 的边界

本次 change **不**涉及公开页清理。后续独立 cleanup change 应处理：

- 删除公开页 `pages/`、`layouts/default.vue`、`components/`、`features/`
- 卸载依赖：`katex`、`keen-slider`、`mermaid`、`browser-image-compression`、`html2pdf.js`、`docx`、`file-saver`、`jszip`、`pixi.js`、`@tailwindcss/typography`、`remark-math`、`rehype-katex`
- 卸载 modules：`@nuxtjs/mdc`、`nuxt-vitalizer`
- 清理 `nuxt.config.ts` 中公开页相关字段（sitemap、schemaOrg、SWR 缓存、prerender、多数 `experimental.*` 字段）