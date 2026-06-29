# Extract Mobile Styles Into Independent Files (nuxt-public)

## Why

`nuxt-public/app/assets/css/components/*.styles.css` 目前把桌面端规则与移动端规则混写在同一个文件中,仅靠文件内的 `@media (max-width: 768px)` 块做切分。这带来三个实际问题:

1. **可读性差** — 一个组件的桌面/平板/手机样式散落在 300~500 行中,改移动端布局需要在大量桌面规则中搜索。
2. **协作冲突** — 多人同时改同一文件的桌面/移动部分必然产生 diff 冲突,影响 review 与回滚。
3. **审计困难** — 缺少工具化手段判断某个组件是否"已完全迁移",也很难强制新增组件遵循桌面/移动分离规范。

`nuxt/` 暂不在本次范围内。

## What Changes

- 引入"桌面/移动配套文件"命名约定:
  - `<Name>.desktop.css` — 仅包含桌面端规则(`@media (min-width: ...)` 之外或显式包在 `@media (min-width: <breakpoint>)` 块内)
  - `<Name>.mobile.css` — 仅包含移动端规则(包在 `@media (max-width: <breakpoint>)` 块内)
- 新增一个 CSS 加载入口(`responsive-split.css` 或在 `nuxt.config.ts` 中通过 `css: [...]` 数组按 viewport 加载),使浏览器只为当前视口请求对应的样式表。
- 将 `nuxt-public/app/assets/css/components/` 下 6 个现有文件按规则拆分到配套文件:
  - `WelcomeSection.styles.css` → `WelcomeSection.desktop.css` + `WelcomeSection.mobile.css`
  - `SideBar.styles.css` → `SideBar.desktop.css` + `SideBar.mobile.css`
  - `ArticleList.styles.css` → `ArticleList.desktop.css` + `ArticleList.mobile.css`
  - `AboutPage.styles.css` → `AboutPage.desktop.css` + `AboutPage.mobile.css`
  - `Gallery.styles.css` → `Gallery.desktop.css` + `Gallery.mobile.css`
  - `prose-custom.css`(仅在 576px 下的 prose 微调)→ `prose-custom.desktop.css` + `prose-custom.mobile.css`
- 渐进迁移:每个组件拆分时**保留**原 `.styles.css` 文件作为占位(内容置为空或 `@import` 占位,仅做兼容),待所有配套文件验证通过后一次性删除原文件。
- 新增约定:今后新增样式文件时,直接以 `.desktop.css` / `.mobile.css` 命名,禁止再出现混写 `@media` 的 `.styles.css`。
- **BREAKING**: 命名约定变更;所有引用旧 `.styles.css` 的位置需要改为引用新的配套文件。
- 非破坏项:Vue 模板中的 Tailwind 响应式类(`md:flex`、`lg:hidden` 等)本次保持不变 — Tailwind 自身的 `md:`/`lg:` 前缀已是独立的桌面/移动写法。

## Capabilities

### New Capabilities

- `responsive-styles-splitting` — 定义 nuxt-public 静态站中桌面/移动样式物理分离的命名、加载和组织规范。

### Modified Capabilities

无。已有 specs(gallery-timeline-layout、game-screenshot-gallery)记录的是组件行为需求,不涉及样式组织方式,本次不改动。

## Impact

**修改文件**:

- `nuxt-public/app/assets/css/components/*.styles.css`(6 个,作为过渡占位)
- `nuxt-public/app/assets/css/components/*.desktop.css`(6 个,新增)
- `nuxt-public/app/assets/css/components/*.mobile.css`(6 个,新增)
- `nuxt-public/nuxt.config.ts`(`css: [...]` 加载顺序)
- 所有 `<style src="...">` 引用旧 `.styles.css` 的 `.vue` 组件(改用配套文件或保留到迁移完成)
- `nuxt-public/app/app.vue` 中的全局响应式隐藏类(`.hide-mobile` / `.hide-tablet` / `.hide-desktop`)改写到对应配套文件
- 项目根 README.md / AGENTS.md(更新样式约定说明)

**新增辅助**:

- 一个轻量检查脚本(可选,放 `nuxt-public/scripts/check-responsive-split.mjs`),扫描 `assets/css/components/` 下每个组件,验证:
  - `.desktop.css` 内不出现 `@media (max-width: ...)` 块
  - `.mobile.css` 内不出现桌面规则(无 `@media (max-width: ...)` 包裹的常规规则)
  - 任何 `.styles.css` 文件不再出现 `@media` 块(已迁移)

**风险**:

- 静态站 SSG 产物会因为多出 ~6 个 CSS 引用导致 HTML 体积略增(可接受)
- 加载策略变更可能影响 LCP / FCP,需要在拆分后用 Chrome DevTools 跑一次 Lighthouse 验证
- 若未在 `nuxt.config.ts` 中正确排序,可能存在样式优先级回退,需要为每个组件单独回归
