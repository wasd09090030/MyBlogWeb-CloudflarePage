# Tasks: nuxt/ Tailwind CSS v3 → v4 升级（admin-only）

> **状态**: 🟡 待执行 — 依赖 nuxt-public 已完成的 Tailwind v4 升级经验（OpenSpec change `archive/2026-07-14-tailwind-v4-upgrade`）。
> 范围：admin-only，公开页相关文件保留不动（删除留后续 change）。
> 阶段完成后归档命令：`openspec archive nuxt-ssr-tailwind-v4-upgrade`。

## 1. Phase A.0 — 预研与备份

- [ ] 1.1 创建 `feature/nuxt-ssr-tailwind-v4-upgrade` 分支
- [ ] 1.2 备份 `tailwind.config.js` → `_archive/tailwind.config.js.v3.bak`
- [ ] 1.3 备份 `package.json` + `package-lock.json` → `_archive/package.v3-tailwind.bak.json` + `_archive/package-lock.v3-tailwind.bak.json`
- [ ] 1.4 grep 验证 `nuxt/app/**/*.{vue,css}` 中是否存在 `@apply` 或 `theme(` 函数调用
  - 命令：`grep -rEn "@apply|theme\(" nuxt/app/`
  - 期望：无业务代码命中（如果命中，列入 Phase A.1 改造清单）
- [ ] 1.5 grep 验证 admin 范围内是否使用 `prose` 类
  - 命令：`grep -rEn 'class="[^"]*prose' nuxt/app/pages/admin/ nuxt/app/features/article-admin/ nuxt/app/features/gallery-admin/ nuxt/app/layouts/admin.vue`
  - 期望：零命中（admin 不用 prose）
- [ ] 1.6 grep 验证 admin 范围内 `darkMode` 与 CSS variables 使用
  - 命令：`grep -rEn 'darkMode|isDarkMode' nuxt/app/`
  - 确认 admin 暗色模式仍由 `useState('isDarkMode')` 驱动，与 v4 `@custom-variant dark` 不冲突

## 2. Phase A.1 — 依赖变更

- [ ] 2.1 `nuxt/package.json`：
  - `tailwindcss ^3.4.19` → `^4.x`
  - 卸载 `autoprefixer ^10.4.23`
  - 卸载 `cssnano ^7.1.2`
  - 卸载 `postcss ^8.5.6`
  - 新增 `@tailwindcss/vite`
- [ ] 2.2 `pnpm install` 重新生成 `package-lock.json`
- [ ] 2.3 单独 commit：`chore(nuxt): upgrade tailwindcss to v4.x`

## 3. Phase A.2 — tailwind.css 重构（admin-only 简化版）

- [ ] 3.1 重写 `nuxt/app/assets/css/tailwind.css`：
  - `@import "tailwindcss"`
  - `@custom-variant dark (&:where(.dark, .dark *))`
  - `@layer base { /* v3 兼容基础样式 */ }` 块（从 nuxt-public 复用：默认边框色、占位符色、按钮指针）
  - **不**包含 `@plugin "@tailwindcss/typography"`
  - **不**包含 `@import "./components/prose-theme.css"`
- [ ] 3.2 **不**创建 `nuxt/app/assets/css/components/prose-theme.css`（admin 不用 prose）
- [ ] 3.3 单独 commit：`refactor(nuxt): migrate tailwind v3 directives to v4`

## 4. Phase A.3 — nuxt.config.ts 改造

- [ ] 4.1 `nuxt/nuxt.config.ts` 顶部新增 `import tailwindcss from '@tailwindcss/vite'`
- [ ] 4.2 移除 `postcss: { plugins: { tailwindcss: {}, autoprefixer: {}, cssnano: {...} } }` 配置块
- [ ] 4.3 `vite.plugins` 新增 `tailwindcss()`
- [ ] 4.4 **不**新增 `experimental.inlineSSRStyles: false`（admin 不用 prose）
- [ ] 4.5 验证 `postcss.config.js` 文件不存在（如果存在则删除）
- [ ] 4.6 单独 commit：`chore(nuxt): integrate tailwindcss via vite plugin`

## 5. Phase A.4 — v3 工具类自动改名

- [ ] 5.1 执行 `npx @tailwindcss/upgrade --force` 自动改名 v3 工具类
- [ ] 5.2 人工 diff 升级工具报告，对未自动处理的边界情况手工修正
- [ ] 5.3 grep 验证关键 v3 工具类已清零（admin 范围）：
  - `grep -rEn 'class="[^"]*\bshadow\b(?!\-)' nuxt/app/pages/admin/ nuxt/app/features/article-admin/ nuxt/app/features/gallery-admin/`
  - `grep -rEn 'class="[^"]*\bflex-shrink-0\b' nuxt/app/pages/admin/ nuxt/app/features/article-admin/ nuxt/app/features/gallery-admin/`
  - `grep -rEn 'class="[^"]*\brounded\b(?!\-)' nuxt/app/pages/admin/ nuxt/app/features/article-admin/ nuxt/app/features/gallery-admin/`
  - 期望：仅命中 Tailwind v4 兼容语义
- [ ] 5.4 单独 commit：`refactor(nuxt): apply tailwindcss v3→v4 utility renames (admin scope)`

## 6. Phase A.5 — 验证

- [ ] 6.1 `pnpm css:audit` 通过（0 violation）
- [ ] 6.2 `pnpm css:imports:audit` 通过（0 violation）
- [ ] 6.3 `pnpm typecheck` 通过（0 error）
- [ ] 6.4 `pnpm build` 成功产出 `.output/`（SSR 模式）
- [ ] 6.5 `pnpm dev` 浏览器 admin 全站冒烟：
  - `/admin/login`：登录表单（NaiveUI `<n-form>` 样式允许有 v4 优先级变化）
  - `/admin`：dashboard 正常
  - `/admin/articles`：文章管理列表 + 操作按钮
  - `/admin/comments`：评论管理列表
  - `/admin/gallery`：画廊管理列表 + 编辑模态
  - `/admin/imagebed`：图床管理（拖拽上传、复制链接、预览模态）
  - `/admin/password`：修改密码表单
  - 暗色模式切换：admin 顶部导航、`<html>` 元素 `.dark` class 切换正常
  - 注：admin 原 7 个页面包含 `/admin/beatmaps`（谱面管理），已由前置 change `remove-mania-and-tools-pages` 删除（mania 公开页下线后失去 `/mania/{id}` 跳转目标）
- [ ] 6.6 SSR smoke：`pnpm preview &` + curl admin 关键路径全部 HTTP 200
  ```bash
  for path in /admin /admin/login /admin/articles /admin/comments /admin/gallery /admin/imagebed /admin/password; do
    curl -sf http://localhost:3000$path > /dev/null || echo "FAIL: $path"
  done
  ```
- [ ] 6.7 构建产物体积对比：记录 Phase A 前后 `.output/` 体积差异

## 7. Phase A.6 — 清理与归档

- [ ] 7.1 确认 `nuxt/tailwind.config.js` 已删除
- [ ] 7.2 清理 `_archive/` 备份目录（仅在所有验证通过后；如发现需回滚则保留）
- [ ] 7.3 更新 `nuxt/README.md`（技术栈段标注 Tailwind v4 已升级；说明 NaiveUI 仍是当前 UI 库，将在 `nuxt-ssr-nuxt-ui-v4-migration` change 替换；明确 `nuxt/` 仅承载 admin 后台，公开页由 `nuxt-public/` 承载）
- [ ] 7.4 更新项目记忆 `C:\Users\COWAIN\.claude\projects\D--Work-space-MyBlogWeb-CloudflarePage\memory\MEMORY.md`：
  - 在 `ui-roadmap-naiveui-to-nuxtui.md` 中追加"nuxt/（SSR）admin-only 进度"段落，记录 Phase A 完成
  - 新增 `nuxt-ssr-ui-migration-roadmap.md` 索引文件
- [ ] 7.5 commit：`docs: update README and memory for tailwind v4 upgrade (admin-only)`
- [ ] 7.6 归档：`openspec archive nuxt-ssr-tailwind-v4-upgrade`

## 关键交付物

- ✅ `nuxt/package.json` 移除 `autoprefixer`、`cssnano`、`postcss`；新增 `@tailwindcss/vite`；`tailwindcss` 升 4.x
- ✅ `nuxt/tailwind.config.js` 已删除
- ✅ `nuxt/app/assets/css/tailwind.css` 改为 v4 简化版（admin-only，无 typography）
- ✅ `nuxt/nuxt.config.ts` PostCSS 块删除；Vite 插件集成
- ✅ 约 20 个 admin `.vue` 文件 v3→v4 工具类改名
- ✅ `pnpm css:audit && pnpm css:imports:audit` 0 violation
- ✅ `pnpm build` 通过；admin 关键路径 HTTP 200
- ✅ README + 项目记忆同步更新

## 关键决策回顾

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 升级路径 | 复用 nuxt-public 经验（剔除 typography 步骤） | 已验证低风险；admin 不用 prose |
| 集成方式 | `@tailwindcss/vite` 替换 PostCSS | v4 官方推荐、性能更好 |
| typography 插件 | 不引入 | admin 不用 prose |
| prose-theme.css | 不创建 | admin 不用 prose |
| inlineSSRStyles | 不设置 false | admin 不用 prose 排版 |
| 范围 | admin-only，公开页文件保留 | 范围控制原则；公开页清理留后续 change |
| NaiveUI 处理 | 不动 | 留给后续 Nuxt UI 迁移 change |