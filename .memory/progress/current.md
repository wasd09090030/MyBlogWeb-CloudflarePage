# 当前进度

最后更新：2026-07-03

## 当前阶段

Tailwind v4 升级已完成并验证，工作区改动**尚未提交**（等待用户确认后自行 commit）。下一阶段：观察稳定性 → 调研 Nuxt UI v4 引入方案。

## 最近完成

- Tailwind CSS 3.4.19 → 4.3.2（change: `openspec/changes/tailwind-v4-upgrade/`，tasks 全勾）：
  - `@tailwindcss/vite` 替代 PostCSS 链（autoprefixer/cssnano/postcss 已移除）
  - `tailwind.config.js` 删除；prose 定制移植到 `app/assets/css/components/prose-theme.css`
  - 官方升级工具改名 9 个 .vue 文件；`tailwind.css` 含 v3 兼容基线（边框/占位符/按钮光标）
  - 验证：npm run generate 通过（158 路由）；预览目视回归首页/文章/画廊明暗两态正常；控制台无错误

## 下一步

1. 用户确认后提交本次改动（14 个文件 + 新增 prose-theme.css + openspec 工件）。
2. 部署后观察线上表现（浏览器底线已抬升至 Safari 16.4+ / Chrome 111+ / FF 128+）。
3. 后续 change：Nuxt UI v4 引入调研（替换 Naive UI 设计语言，用户不喜欢 Naive UI 审美）；Inspira UI 可独立引入（不依赖 Nuxt UI）。

## 已验证结论（勿重复踩坑）

- v4 下 prose 类进入 cascade layer：若用未分层 CSS 定义 `.prose` 亮色变量会压死 `dark:prose-invert` 的变量切换 → 解法是按 `.prose` / `.dark .prose` 两态直接写死最终值（本项目 prose 与 dark:prose-invert 恒成对出现，见 MarkdownRenderer.vue）。
- v4 默认主题变量按需生成（tree-shaken），自定义 CSS 引用 `var(--color-*)` 必须带字面值 fallback，或直接用字面值。
- 旧 JS 配置里的 typography `blog` 变体是死配置（MarkdownRenderer size 校验器不含 'blog'）；`.dark code` 等嵌套选择器在 v3 typography 配置中生成 `.prose .dark code`，从未匹配过（伪暗色规则）。
- link-checker 报 `/tools`、`/mania` 404 是 default.vue 中历史硬编码外链（target=_blank 的站外工具页），与样式无关。
- `nuxt-public/dist/` 是 `.output/public` 的镜像/链接，不是历史构建，不能当基线对比。
- node_modules 曾残留手动试装的 tailwind v4 包（extraneous）导致升级工具误判版本；`npm install && npm prune` 恢复一致后才能正常跑 v3→v4 迁移。

## 风险与待确认

- Inspira UI 引入时：其主题模板 `--radius-sm/md/lg/xl`（@theme inline）与 `theme-variables.css` 同名变量冲突，会改变 `rounded-*` 取值——引入前必须先解决命名空间。
- v4 原生 @layer 使未分层样式（Naive UI/手写 CSS）优先级高于 utilities：本次回归未见异常，但长尾页面仍可能有个别差异。

## 关键入口

- 构建：`cd nuxt-public && npm run generate`；预览：`npx serve .output/public -l 4173`
- 样式入口：`nuxt.config.ts` css 数组；`app/assets/css/tailwind.css`（引擎配置）；`prose-theme.css`（typography 主题）
