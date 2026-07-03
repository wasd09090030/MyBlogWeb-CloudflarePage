# Design: Tailwind CSS v4 升级

## Context

- Nuxt 4.3 静态生成（nitro preset: static），部署 Cloudflare Pages。
- Tailwind 3.4.19 经 `nuxt.config.ts` 的 `postcss` 块集成（tailwindcss + autoprefixer + 生产 cssnano），非 `@nuxtjs/tailwindcss` 模块。
- 代码库迁移面已探明：0 处 `@apply`（app 内）、0 处 `theme()`/`@screen`；`tailwind.css` 仅三行指令；typography 定制集中在 `tailwind.config.js`（约 150 行）；待改名工具类约 180 处。
- 暗色模式：自建 `useTheme` 切换 `documentElement` 上的 `.dark` class（另有 legacy `dark-theme`/`data-theme`），`dark:` 变体在 .vue 中约 148 处。
- Naive UI（约 20+ 组件实例）与大量手写 CSS（theme-variables.css 404 行、layout/app/组件级 desktop+mobile css）共存，本次不动。

## Goals / Non-Goals

**Goals**
1. Tailwind 4.x 经 `@tailwindcss/vite` 集成，删除 PostCSS 配置块与冗余依赖。
2. 保持现有视觉与暗色模式行为不变（class 策略）。
3. prose 定制从 JS 配置移植为 CSS，`tailwind.config.js` 退役。
4. `npm run generate` 构建通过，关键页面视觉回归确认。

**Non-Goals**
- 不引入 Nuxt UI / Inspira UI / @nuxtjs/color-mode。
- 不替换或调整 Naive UI 组件与主题。
- 不重构 theme-variables.css / 组件级 CSS 拆分结构。
- 不趁机清理 legacy `dark-theme` class 兼容层。

## Decisions

1. **Vite 插件而非 `@tailwindcss/postcss`**：官方推荐、性能更好，Nuxt 下经 `vite.plugins` 注入即可；删除整个 `postcss` 配置块。放弃 `@nuxtjs/tailwindcss` 模块（其 v4 支持路线与本项目手动集成方式不匹配，且当前也没在用）。
2. **autoprefixer / cssnano / postcss 一并移除**：v4 内置 vendor prefixing（Lightning CSS），Vite 生产构建自带 CSS 压缩；cssnano 仅在旧 postcss 链中被引用。
3. **暗色模式用 `@custom-variant dark (&:is(.dark *))`**：与自建 useTheme 的 class 切换完全兼容，不引入 color-mode 模块（留给 Nuxt UI change 决策）。
4. **prose 定制移植为 CSS 而非 `@config` 兼容加载**：定制内容全部是 `--tw-prose-*` 变量与元素样式，天然是 CSS；`theme('colors.x.y')` → `var(--color-x-y)`。避免 JS config 长期残留。死配置 `blog` 变体不移植；`lg` 变体的两行覆盖保留移植。
5. **class 改名优先跑官方 `npx @tailwindcss/upgrade`**：改名规则有链式顺序陷阱（shadow-sm→xs 必须先于 shadow→sm），工具处理最可靠；nuxt.config 内的 postcss 块工具识别不了，手工处理。工具失败则按官方改名表手工 sed + git diff 审查。
6. **加入 v3 兼容基础样式**（官方升级指南片段）：默认边框色恢复 gray-200（v4 默认 currentColor）、占位符色恢复 gray-400 系、按钮 cursor:pointer。理由：手写 CSS 与模板中存在大量未显式指定颜色的 `border-*`，全量审计成本高于兼容层；后续可独立清理。

## Risks / Trade-offs

- [v4 原生 @layer 改变层叠：未分层的 Naive UI/手写 CSS 优先级高于 utilities] → 全站视觉回归（文章详情、画廊时间线、表单页、暗色模式）；发现差异逐个用提高特异性或调整源 CSS 解决。
- [浏览器底线 Safari 16.4+/Chrome 111+] → 个人博客受众可接受；记录于 proposal，不做降级方案。
- [升级工具可能改写不该动的文件] → 干净工作区运行，`git diff` 全量审查后再继续。
- [`prose-pink` 依赖 typography 插件按主题色生成] → v4 `@plugin` 加载后行为不变，回归时确认链接色。
- [回滚] → 单分支工作区内 `git restore` 即可；无数据/接口变更。

## Migration Plan

1. 依赖与配置切换（package.json / nuxt.config.ts / tailwind.css）。
2. prose 定制移植 → 删除 tailwind.config.js。
3. 官方升级工具跑 class 改名，git diff 审查。
4. `npm run generate` 构建验证 + dev server 关键页面明暗两态目视回归。
5. 视觉差异修复（如有）。

## Open Questions

- 生成的 CSS 体积对比（v3 vs v4）——验证阶段顺带记录，不阻塞。
