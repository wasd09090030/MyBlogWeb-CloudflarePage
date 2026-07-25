# Tailwind CSS v3 → v4 升级（nuxt/ 后台 SSR 站 — admin-only）

## Context

`nuxt/`（NUXTSSR 后台站）当前使用 Tailwind CSS 3.4.19（PostCSS 集成），通过 `tailwind.config.js` 配置 `darkMode: 'class'` 与少量 `theme.extend`。`nuxt.config.ts` 的 `postcss.plugins` 链包含 `tailwindcss`、`autoprefixer`、`cssnano`。

`nuxt/` 与 `nuxt-public/` 的关系已重新划分（2026-07-17 与用户确认）：

- **`nuxt-public/`**：SSG 静态站（`nitro.preset: 'static'`），承载全部公开页（首页、画廊、文章、教程）。已完整部署到 Cloudflare Pages。
- **`nuxt/`**：SSR 后台（`nitro.preset: 'node-server'`），仅承载 **admin 后台**（login、articles、comments、gallery、imagebed、password）。公开页不再重复实现。`beatmaps` 谱面管理已由前置 change `remove-mania-and-tools-pages` 移除。

Naive UI 2.43.2 与 `@bg-dev/nuxt-naiveui` 在 admin 6 个页面（index、login、password、articles、comments、imagebed；gallery 管理由 `features/gallery-admin/` 承载）与 `features/article-admin/`、`features/gallery-admin/` 中使用（约 20 个文件含 `<n-*>`），主要为表单 `<n-form>`、模态 `<n-modal>`、抽屉 `<n-drawer>`、上传 `<n-upload>`、表格 `<n-data-table>`、按钮 `<n-button>` 等 admin 后台高频组件。

后续规划（`nuxt-ssr-nuxt-ui-v4-migration`）要将 admin 中的 NaiveUI 替换为 Nuxt UI v4、统一 design token、收敛主题机制。Nuxt UI v4 强依赖 Tailwind v4（`@nuxt/ui` v4 的 CSS 入口消费 Tailwind 注入的 CSS variables）。本 change 完成 Tailwind v3→v4 升级，为后续 change 解锁基础设施。

**与 nuxt-public 关系**：`nuxt-public/` 已完成 Tailwind v3→v4 升级（OpenSpec change `archive/2026-07-14-tailwind-v4-upgrade`），本次变更复用其经验，但因 admin 不用 prose：

- **不**移植 typography 到 `prose-theme.css`
- **不**引入 `@plugin "@tailwindcss/typography"`
- **不**设置 `experimental.inlineSSRStyles: false`

仅复用 v4 基础升级路径（Vite 插件、CSS-only dark variant、v3 兼容基础样式）。

## Goals / Non-Goals

**Goals:**

- `nuxt/` 后台 SSR 站（admin-only）从 Tailwind v3 平滑升级到 v4。
- 复用 nuxt-public 已验证的升级路径与经验（剔除 typography 相关步骤）。
- 保持 admin 现有 NaiveUI、Pinia、md-editor-v3 等依赖与功能不受影响。
- 保持 admin 现有 `theme-variables.css`（`--text-primary` 等 CSS variables）不变。
- 验证 admin 关键路径（login、dashboard、文章管理、评论管理、谱面管理、画廊管理、图床管理、修改密码）。

**Non-Goals:**

- 不修改 `nuxt-public/`（已独立迁移完成）。
- 不替换 NaiveUI、不引入 Nuxt UI、不引入 valibot（划给 `nuxt-ssr-nuxt-ui-v4-migration` change）。
- 不删除 `nuxt/` 中的公开页文件、组件、features、依赖、modules、`nuxt.config.ts` 字段（划给后续独立的 cleanup change 或合并到 Nuxt UI migration change）。
- 不重写 `server/` Nitro API 路由、不修改 `backend-dotnet/` 或 `cloudflare-worker/`。
- 不修改 `tsconfig.*.strict.phaseN.json` 渐进 TS strict 计划。
- 不删除 NaiveUI 残留组件实例（保留直到后续 change 替换）。
- 不引入 `prose-theme.css` 与 `@plugin "@tailwindcss/typography"`（admin 不用 prose）。
- 不设置 `experimental.inlineSSRStyles: false`（admin 不用 prose 排版）。
- 不追求与 Tailwind v3 像素级一致；目标是 v4 视觉稳定且无回归。

## Decisions

### 1. 复用 nuxt-public 已验证的升级路径（剔除 typography 步骤）

完全沿用 OpenSpec change `archive/2026-07-14-tailwind-v4-upgrade` 的技术决策，但因 admin 不用 prose 而**剔除**以下步骤：

- ~~typography 移植到 `prose-theme.css`~~
- ~~`@plugin "@tailwindcss/typography"` 引入~~
- ~~`@custom-variant dark` 与 `prose-*` 选择器相关的回归测试~~
- ~~`experimental.inlineSSRStyles: false`~~

保留：

- `tailwind.config.js` 退役
- `darkMode: 'class'` → `@custom-variant dark`
- v3 兼容基础样式（默认边框色、占位符色、按钮指针）
- content 扫描交给 v4 自动探测（不显式声明 `content` 数组）

理由：admin 不渲染 Markdown、不使用 Tailwind Typography 插件、无 prose 文章排版需求。

替代方案：独立调研 v3→v4 升级路径。**不推荐**，会增加无意义的探索成本。

### 2. PostCSS 链移除，Vite 插件集成

`nuxt/nuxt.config.ts` 当前：

```ts
postcss: {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    ...(isProduction ? { cssnano: { ... } } : {})
  }
}
```

升级后：

```ts
// 完全移除 postcss 配置块
vite: {
  plugins: [tailwindcss()]  // 由 @tailwindcss/vite 提供
}
```

依赖变化：`tailwindcss`、`autoprefixer`、`cssnano` 卸载；新增 `@tailwindcss/vite`（与 nuxt-public 同版本）。

理由：Tailwind v4 官方推荐 Vite 插件集成，性能更好（无 PostCSS 链路）、配置更简洁。

替代方案：保留 PostCSS 集成（v4 通过 `@tailwindcss/postcss` 也支持）。**不推荐**，与 nuxt-public 走向分叉。

### 3. `tailwind.css` 内容重构（简化版）

当前（v3）：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

升级后（v4，admin-only 简化版）：

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

/* v3 兼容基础样式（从 nuxt-public 复用） */
@layer base {
  /* 默认边框色 */
  /* 占位符色 */
  /* 按钮指针 */
}
```

**不**包含 `@plugin "@tailwindcss/typography"`、**不**包含 `@import "./components/prose-theme.css"`。

### 4. v3 工具类改名通过官方升级工具

执行 `npx @tailwindcss/upgrade` 自动处理。预期 admin 范围涉及约 20 个 .vue 文件、改名处数远少于 nuxt-public（约 180+ 处）。

工具会输出报告，对未自动处理的边界情况手工修正。

### 5. NaiveUI、Pinia、md-editor-v3 保持不动

本次升级不触碰：

- `@bg-dev/nuxt-naiveui` 模块配置
- `naiveui: { colorModePreference, iconSize, themeConfig }` 配置块
- 现有 Pinia stores（`useAuthStore` 等）
- `md-editor-v3`（admin 文章编辑器）
- `server/` Nitro API 路由
- admin `useTheme` 暗色模式逻辑（admin 仍用 `useState('isDarkMode')`）

## Risks / Trade-offs

- [v4 `@layer` 层叠行为变化，NaiveUI admin 组件样式优先级受影响] → Mitigation: NaiveUI 通过 `@bg-dev/nuxt-naiveui` 模块注入，未分层；v4 `@layer` 变化可能导致 admin 表单/弹窗等组件样式优先级反转。本 change 不动 NaiveUI，问题留给后续 Nuxt UI 迁移 change。本阶段仅记录，不做修复。
- [v3 工具类改名遗漏导致 CSS class 无效] → Mitigation: `pnpm build` + 浏览器 admin 全站冒烟，重点验证表单/弹窗/抽屉/上传样式。
- [v4 浏览器支持底线抬升] → Mitigation: Safari 16.4+ / Chrome 111+ / Firefox 128+，与 nuxt-public 一致；CI 浏览器基线已对齐。
- [官方升级工具未覆盖的边界情况] → Mitigation: 升级工具运行后人工 diff 报告；对未处理的 class 手工修正；保留 `tailwind.config.js` 备份便于回滚。
- [构建时间波动] → Mitigation: Phase A 完成后对比 `pnpm build` 耗时；预期下降（无 PostCSS 链路）。

## Migration Plan

1. 创建 `feature/nuxt-ssr-tailwind-v4-upgrade` 分支。
2. 备份 `tailwind.config.js` 与 `package-lock.json` 到 `_archive/`（便于回滚）。
3. 更新 `package.json`：`tailwindcss@3.4.19` → `^4.x`；卸载 `autoprefixer`、`cssnano`、`postcss`；新增 `@tailwindcss/vite`。
4. 删除 `tailwind.config.js`。
5. 重写 `nuxt/app/assets/css/tailwind.css`（v4 简化版，不含 typography 插件）：
   - `@import "tailwindcss"`
   - `@custom-variant dark (&:where(.dark, .dark *))`
   - `@layer base { /* v3 兼容基础样式 */ }` 块
6. 更新 `nuxt.config.ts`：
   - 移除 `postcss` 配置块
   - `vite.plugins` 新增 `tailwindcss()` 导入与注册
7. 执行 `npx @tailwindcss/upgrade` 自动改名 v3 工具类；diff 报告与人工补漏。
8. `pnpm install` 重新生成 `package-lock.json`；`git add package.json package-lock.json` 单独 commit。
9. 验证：
   - `pnpm css:audit && pnpm css:imports:audit` 通过
   - `pnpm typecheck` 通过
   - `pnpm build` 通过
   - `pnpm dev` 浏览器 admin 全站冒烟：login、dashboard、文章管理、评论管理、谱面管理、画廊管理、图床管理、修改密码、暗色模式切换
   - curl `/admin/login`、`/admin`、`/admin/articles` 全部 HTTP 200
10. 回滚预案：保留 `tailwind.config.js` 备份；如升级后不可接受，`git revert` 到 Phase A 起始 commit + `pnpm install` 恢复依赖。

Rollback 策略：通过 `git revert` + 依赖回滚完整恢复到 Phase A 起始状态；备份的 `tailwind.config.js` 与 `package-lock.json` 提供额外保险。

## Open Questions

- `tailwind.config.js` 当前 `theme.extend` 中是否有 admin 实际依赖的定制项？Phase A 启动前需要 grep 验证。
- admin `useTheme`（在 `app/layouts/admin.vue` 等使用）是否需要适配 v4 的 dark variant 机制？Phase A 启动时同步验证（不改 useTheme 实现，仅验证 v4 `.dark` 选择器生效）。
- admin 现有 CSS 文件（`app/assets/css/components/*.css`）是否有引用 Tailwind v3 `@apply` 或 `theme()` 函数？Phase A 启动前 grep 验证。