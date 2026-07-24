# nuxt/ admin 从 NaiveUI + Tailwind v3 迁移到 Nuxt UI v4 + Tailwind v4 设计

Date: 2026-07-24

> **状态（2026-07-24）**：
> - ✅ **Phase A — Tailwind v3 → v4 升级**：已完成，commit `6a9f3e5`（2026-07-24）。本 spec §3.1 Phase A 整节已过期，仅作历史记录保留。
> - 🟡 **Phase B — Nuxt UI v4 admin-only 迁移**：未开始。**单一事实源为 OpenSpec change `openspec/changes/nuxt-ssr-nuxt-ui-v4-migration/`**（`design.md` / `proposal.md` / `tasks.md` / `specs/`）。
>
> **使用说明**：本 superpowers spec 文档已与 OpenSpec change 内容对齐（file scope、豁免清单、承接关系）；任何后续修订请改 OpenSpec change 内的 `design.md`，本文件仅作 superpowers 流程记录保留。`writing-plans` 阶段以 OpenSpec design.md 为输入。

> 本设计稿由 `superpowers:brainstorming` 输出，确认后转入 `superpowers:writing-plans` 产出实施计划。
> 与 OpenSpec change `openspec/changes/nuxt-ssr-tailwind-v4-upgrade/`（已 archive）、`openspec/changes/nuxt-ssr-nuxt-ui-v4-migration/` 配套；本文档负责登记"与现状不符需修订的差异点"以及本次会话确认的决策。

## 1. 现状快照（已 grep 验证）

- **依赖**：`tailwindcss@3.4.19` + `naive-ui@2.43.2` + `@bg-dev/nuxt-naiveui@2.0.0` + `autoprefixer@10.4.23` + `postcss@8.5.6` + `cssnano@7.1.2`
- **PostCSS 链路**：`nuxt/nuxt.config.ts` 中 `postcss.plugins: { tailwindcss, autoprefixer, cssnano }`
- **主题**：`app/assets/css/theme-variables.css` 手写 CSS 变量；`nuxt.config.ts` 中 `naiveui.themeOverrides.common.primaryColor: '#0d6efd'`（Bootstrap blue）
- **NaiveUI 范围**：24 个 `.vue` 文件 / 38 个组件 / 约 250 处标签
- **关键组件频次**（admin + features）：
  - `<n-button>`×83、`<n-form-item>`×35、`<n-input>`×21、`<n-card>`×18
  - `<n-modal>`×8、`<n-spin>`×8、`<n-select>`×6、`<n-form>`×6、`<n-button-group>`×6、`<n-alert>`×6
  - `<n-tab-pane>`×5、`<n-switch>`×5、`<n-data-table>`×4、`<n-input-number>`×4
  - 其它：`n-tag`、`n-upload`、`n-upload-dragger`、`n-pagination`、`n-rate`、`n-checkbox`、`n-radio-button`、`n-radio-group`、`n-date-picker`、`n-dynamic-tags`、`n-empty`、`n-image`、`n-menu`、`n-badge`、`n-divider`、`n-popconfirm`、`n-skeleton`、`n-space`、`n-steps`、`n-step`、`n-tabs`
  - Composable：`useMessage()`×6、`useDialog()`×1
- **全局 Provider**（admin/blank 布局）：
  - `app/layouts/admin.vue`：`<n-config-provider :theme="isDarkMode ? darkTheme : null">` 包裹 `<n-message-provider>`、`<n-dialog-provider>`
  - `app/layouts/blank.vue`：`<n-message-provider>`
- **豁免清单**（本次不迁）：
  - `app/components/content/{CodePlayground,LinkCard,StarRating,Steps}.vue`（内容组件，使用 NaiveUI）
  - `md-editor-v3`（admin 文章编辑器，Nuxt UI 无等价）
  - `server/` Nitro API 路由
  - `tsconfig.*.strict.phaseN.json` 渐进 TS strict 计划

## 2. 目标与边界

### 2.1 做

- 升级 Tailwind v3→v4（复用 nuxt-public 已验证经验，admin 不用 prose）
- 接入 `@nuxt/ui@^4.9.0`，卸载 `naive-ui` + `@bg-dev/nuxt-naiveui`
- 24 个文件全部移除 NaiveUI 标签与 import
- admin 表单统一 `valibot` + `<UForm>` + `<UFormField>` + `useToast`
- 主题用 Nuxt UI v4 默认（`ui.colors.primary = 'blue'`、`ui.colors.neutral = 'slate'`），不沿用旧的 Bootstrap blue 自定义

### 2.2 不做

- 不改 `nuxt-public/`（已独立完成）
- 不动 `app/components/content/` 4 个 NaiveUI 组件
- 不动 `server/`、不收敛全站 CSS variables、不改 tsconfig strict 计划
- 不替换 `md-editor-v3`
- 不重构无关 Pinia store
- 不实现 `n-rate` 自实现 StarRating（admin 实际不使用，仅 content 组件用到，且豁免）

### 2.3 与现有 OpenSpec 提案的差异修订

| 位置 | 原提案内容 | 修订 |
|------|----------|------|
| `nuxt-ssr-nuxt-ui-v4-migration/tasks.md` §3.6 | `admin/beatmaps/index.vue`（已删除） | 整条删除 |
| `nuxt-ssr-nuxt-ui-v4-migration/tasks.md` §3.10 | `MdEditorWrapper.client.vue` 内部清理 | 改为"仅 grep 验证 + 注释保留 md-editor-v3 集成" |
| `nuxt-ssr-nuxt-ui-v4-migration/tasks.md` §4.1 | `manualChunks` 内 `naive-ui` 分支替换 | 改为 `vendor-ui` 包装 `@nuxt/ui` + `reka-ui` + `@internationalized` |
| `nuxt-ssr-nuxt-ui-v4-migration/design.md` §1 | admin 范围 ~20 个文件 | 修订为 24 个文件（含 StateLoading.vue、CodePlayground 等不在 admin 但 grep 命中文件）——豁免项明确登记 |
| 两份提案的"依赖" | `katex` / `mermaid` / `pixi.js` 等公共页依赖保留 | 不动；划给后续独立 cleanup change |

## 3. 实施步骤（两阶段串行）

### 3.1 Phase A — Tailwind v3 → v4（独立 OpenSpec change，可单独回滚）

1. 分支 `feature/nuxt-ssr-tailwind-v4-upgrade`（基于当前 main）
2. 备份 `package.json` / `package-lock.json` / `tailwind.config.js` → `_archive/`
3. 改 `nuxt/package.json`：
   - `tailwindcss ^3.4.19` → `^4.x`
   - 卸 `autoprefixer@^10.4.23` / `cssnano@^7.1.2` / `postcss@^8.5.6`
   - 新增 `@tailwindcss/vite`
4. 重写 `nuxt/app/assets/css/tailwind.css`：
   ```css
   @import "tailwindcss";
   @custom-variant dark (&:where(.dark, .dark *));
   @layer base { /* v3 兼容基础样式：默认边框色、占位符色、按钮指针 */ }
   ```
   - **不**引入 `@plugin "@tailwindcss/typography"`
   - **不**创建 `prose-theme.css`
5. `nuxt/nuxt.config.ts`：
   - 顶部新增 `import tailwindcss from '@tailwindcss/vite'`
   - 移除 `postcss: { plugins: { tailwindcss, autoprefixer, cssnano } }`
   - `vite.plugins` 新增 `tailwindcss()`
   - **不**新增 `experimental.inlineSSSRtyles: false`
6. 执行 `npx @tailwindcss/upgrade --force` 工具类自动改名；人工 diff 报告；grep 三类关键 v3 工具类清零
7. 删除 `tailwind.config.js`
8. 验证 + 归档：`openspec archive nuxt-ssr-tailwind-v4-upgrade`

### 3.2 Phase B — Nuxt UI v4 迁移（admin-only，独立 OpenSpec change）

1. 分支 `feature/nuxt-ssr-nuxt-ui-v4-migration`（基于已合并的 Phase A 分支）
2. `pnpm add @nuxt/ui@^4.9.0 valibot@^1.x @vueuse/motion/nuxt@^2.x`
3. 新建 `nuxt/app/app.config.ts`：
   ```ts
   export default defineAppConfig({
     ui: {
       colors: { primary: 'blue', neutral: 'slate' },
       icons: { dynamicRounded: 'rounded-full' },
       button: { defaultVariants: { size: 'md' } },
     },
   })
   ```
4. 新建 `nuxt/app/assets/css/main.css`：
   ```css
   @theme {
     --color-primary-50:  #e6f1fe;
     /* ... 100-900 ... */
     --color-primary-500: #0d6efd;
     --radius-md: 0.5rem;
     --radius-lg: 0.625rem;
     --radius-xl: 0.75rem;
   }
   ```
5. `nuxt/nuxt.config.ts`：`css: []` 加入 `~/assets/css/main.css`；`modules` 加 `'@vueuse/motion/nuxt'` 与 `'@nuxt/ui'`
6. `nuxt/app/app.vue`：`<UApp>` 包裹 `<NuxtLayout>`
7. `nuxt/app/layouts/admin.vue`：删 `<n-config-provider>` / `<n-message-provider>` / `<n-dialog-provider>` 与 `import { darkTheme }`；`<n-button>` → `<UButton>`
8. `nuxt/app/layouts/blank.vue`：删 `<n-message-provider>` 与 `import { NMessageProvider }`
9. **PoC 分支**（B.3 启动前）：验证 `<UTable>` 在 articles / comments / gallery 三个列表的分页+排序+筛选行为；不达标则 `<UTable>` + 手动分页
10. 业务替换（24 个文件）：
    - `<n-button>` → `<UButton>`（83 处）
    - `<n-form :model :rules>` → `<UForm :state :schema>` + `<UFormField>` + valibot
    - `<n-modal v-model:show>` → `<UModal v-model:open>`
    - `<n-data-table>` → `<UTable>`
    - `<n-upload>` → `<UFileUpload>`
    - `useMessage()` / `useDialog()` → `useToast()`
    - 其它：`n-card`、`n-input`、`n-select`、`n-tag`、`n-spin`、`n-switch`、`n-input-number`、`n-checkbox`、`n-radio-*`、`n-date-picker`、`n-dynamic-tags`、`n-pagination`、`n-divider`、`n-popconfirm`、`n-skeleton`、`n-space`、`n-tabs`/`n-tab-pane`、`n-alert`、`n-menu`、`n-badge`、`n-empty`、`n-image` → 对应 Nuxt UI v4 组件
11. Pinia store action 内 `useToast()` 调用规范化（仅 setup 顶层）
12. `nuxt/nuxt.config.ts`：
    - `modules` 删 `'@bg-dev/nuxt-naiveui'`
    - 删 `naiveui: { ... }` 配置块
    - `build.transpile` 删 `'naive-ui'`
    - `vite.optimizeDeps.include` 删 `'naive-ui'`
    - `manualChunks` 中 `naive-ui` 分支替换为 `vendor-ui`（包装 `@nuxt/ui` + `reka-ui` + `@internationalized`）
13. `nuxt/package.json`：卸 `naive-ui` 与 `@bg-dev/nuxt-naiveui`
14. 验证 + 归档：`openspec archive nuxt-ssr-nuxt-ui-v4-migration`

## 4. 风险与对应措施

| 风险 | 影响 | 应对 |
|------|------|------|
| `<UTable>` 在分页+排序+筛选组合下与 `<n-data-table>` 行为不一致 | 文章/评论/画廊列表功能退化 | Phase B §9 分支 PoC 验证；不达标则 `<UTable>` + 手动分页/筛选 |
| `n-upload` 拖拽上传交互与 `<UFileUpload>` 差异 | 图床管理体验变化 | PoC 验证；保留 `browser-image-compression` 兜底；拖拽区域退化则手写原生 drag-drop |
| 表单错误状态视觉回退 | 登录/改密/编辑器元数据表单感知变差 | 验证清单强制包含 4 个表单的错误态截图 |
| Pinia store action 内 `useToast()` 上下文失效 | toast 不显示 | 仅 setup 顶层调用；store action 改为接受 `toast` 入参或调用方先 `useToast()` |
| v4 `@layer` 级联行为变化 | NaiveUI 替换处视觉跳变 | Phase A 强制 admin 全站冒烟（含登录、暗色切换、表格） |
| `nuxt-public` 与 `nuxt/` `@nuxt/ui` 版本偏离 | 类型/行为差异 | 升级前同步核对 nuxt-public 实际版本，统一 `^4.9.0` |
| `app.config.ts` 与现有 `theme-variables.css` 双轨 | 主题碎片化 | 本次不收敛；记录在记忆里作为后续 change |
| `app/components/content/*`（CodePlayground/LinkCard/StarRating/Steps）含 NaiveUI | grep 命中残留 | 本次不迁；在豁免清单明确登记 |
| 浏览器底线上抬（Safari 16.4+ / Chrome 111+ / Firefox 128+） | 老浏览器访问失败 | 与 nuxt-public 一致；本项目后台用户可控 |
| `@tailwindcss/upgrade --force` 工具类改名遗漏 | 工具类失效 | Phase A 人工 diff + grep 三类关键 v3 工具类清零 |
| 工作区分支与 `feature/nuxt-shrink-to-pure-admin` 关系 | 提交冲突 | 新分支基于当前 main；Phase A merge 后再开 Phase B |

## 5. 验证标准

### 5.1 Phase A 验证

- `pnpm css:audit` 0 violation
- `pnpm css:imports:audit` 0 violation
- `pnpm typecheck` 0 error
- `pnpm build` 通过
- `pnpm dev` admin 6 路由冒烟：login → index → articles → comments → gallery → imagebed → password
- 暗色模式切换：`<html>` `.dark` class 切换正常
- `pnpm preview &` + `curl` admin 关键路径全部 HTTP 200
- 归档：`openspec archive nuxt-ssr-tailwind-v4-upgrade`

### 5.2 Phase B 验证

- `pnpm css:audit` 0 violation
- `pnpm css:imports:audit` 0 violation
- `pnpm typecheck` 0 error
- `pnpm build` 通过
- grep 残留：
  - `grep -rEn "<n-(button|modal|drawer|form|input|select|message|config-provider|dialog-provider|menu|table|upload|alert|tag|spin|rate|pagination)" nuxt/app/pages/admin/ nuxt/app/features/article-admin/ nuxt/app/features/gallery-admin/` 仅豁免项命中
  - `grep -rn "from 'naive-ui'" nuxt/app/pages/admin/ nuxt/app/features/article-admin/ nuxt/app/features/gallery-admin/ nuxt/app/layouts/admin.vue nuxt/app/layouts/blank.vue` 0 命中
- admin 6 路由 SSR HTTP 200
- 业务流手测：登录、改密、文章 CRUD、评论管理、画廊编辑、图床（拖拽/上传/复制链接/预览模态）、登出、暗色模式
- 构建产物体积对比（NaiveUI 卸包后预期下降）
- 归档：`openspec archive nuxt-ssr-nuxt-ui-v4-migration`

## 6. 文档与记忆更新

- `nuxt/README.md`：技术栈段 "Naive UI + Tailwind v3" → "Nuxt UI v4 + Tailwind v4"，明确 admin-only 范围
- `AGENTS.md`：项目概览段同步
- `~/.claude/projects/.../memory/MEMORY.md`：追加 `nuxt-ssr-ui-migration-roadmap.md` 索引；在 `ui-roadmap-naiveui-to-nuxtui.md` 追加 "nuxt/（SSR）admin-only 完成" 段落
- `.memory/memory.md` 与 `.memory/progress/current.md` 同步标记两阶段完成
- `openspec/changes/{nuxt-ssr-tailwind-v4-upgrade,nuxt-ssr-nuxt-ui-v4-migration}/` 内 tasks.md 按 §2.3 差异修订

## 7. 非本次范围建议

记录于 `.memory/progress/current.md` "风险与待确认" 或新增 `lessons/`：

- 卸载 `katex` / `mermaid` / `pixi.js` / `@nuxtjs/mdc` / `nuxt-vitalizer` 等公共页残留依赖
- 收敛全站 CSS variables 到 `@theme`、`.dark` 双轨合一
- `app/components/content/*` 4 个 NaiveUI 组件按需迁移
- 移除 `_archive/` 备份
