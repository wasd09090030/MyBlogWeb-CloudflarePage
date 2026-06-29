# Design — Extract Mobile Styles Into Independent Files (nuxt-public)

## Context

- 现状: `nuxt-public/app/assets/css/components/*.styles.css` 6 个文件,把桌面规则与 `@media (max-width: 576/768/992px)` 移动规则混写在同一文件中。Nuxt 3 `nuxt.config.ts` 的 `css: []` 数组加载这些文件。Vue 组件通过 `@import` 引用同名 `.styles.css`。
- 约束:
  - 项目是 Cloudflare Pages 上的 **SSG 静态站**,`nuxt run generate` 时所有 CSS 会被预编译、内联或外链到 HTML
  - Tailwind v3 响应式类(`md:`、`lg:`)已用于 Vue 模板内的内联样式,本次不动
  - nuxt/ 不在范围内
  - 渐进迁移,不能破坏现有页面渲染
- 相关方: 静态博客作者(我)本人,少量新组件后续将遵循约定

## Goals / Non-Goals

**Goals:**

- 把 6 个组件样式文件按"桌面/移动"拆为物理分离的成对文件
- 拆分期间不破坏现有视觉与功能
- 为后续新增组件提供可强制执行的样式组织规范
- 提供轻量验证手段,避免拆分遗漏

**Non-Goals:**

- 不动 Vue 模板内 Tailwind 响应式类
- 不动 `nuxt/` 下的样式
- 不引入 SCSS/SASS(项目当前使用纯 CSS + PostCSS)
- 不重写断点(继续沿用 576 / 768 / 992)
- 不引入运行时 viewport 检测(SSG 场景下无意义)

## Decisions

### Decision 1: 文件命名 + 内容约定

**选择**: `<Name>.desktop.css` + `<Name>.mobile.css` 配对。

- `.desktop.css` 内容: 不含 `@media` 包裹的常规规则(即"桌面基线");如需明确"仅桌面",可用 `@media (min-width: 769px) { ... }` 显式包裹。
- `.mobile.css` 内容: 全部规则包在 `@media (max-width: <breakpoint>)` 块内。断点沿用现有 576 / 768 / 992。
- 两个文件均无作用域,选择器名沿用现状,避免和 Vue scoped 冲突。

**替代方案**:

- A. 沿用 `.styles.css` 后缀 + 加注释分区 — 物理上没分离,无约束力。否。
- B. 用 Tailwind 配置做断点切换 — 无法表达非 Tailwind 类(class-based 组件)。否。
- C. 拆为完全独立的两套 Vue 组件 — 工程量极大,SSG 体积翻倍,首屏不可接受。否。

### Decision 2: 加载机制

**选择**: 两个文件都通过 `nuxt.config.ts` `css: []` 数组加载,顺序为 `desktop` 先 `mobile` 后,确保 mobile `@media` 规则在 cascade 中后写、覆盖桌面基线。

- 优点: 兼容 Nuxt 3 标准模式,生成产物自带媒体查询,浏览器原生只应用匹配规则
- 缺点: 桌面端会下载 mobile CSS(但被 `@media` 屏蔽),体积略增(每个组件 ~几 KB,可接受)

**替代方案**:

- 用 `<link rel="stylesheet" media="screen and (max-width: 768px)">` 做条件加载 — 需自定义 plugin 注入 HTML,复杂度上升,SSG 收益有限。否。

### Decision 3: Vue 组件引用方式

**选择**: 把现有 `@import '../assets/css/components/<Name>.styles.css';` 改为分别 `@import` 两个新文件。

- 例: `WelcomeSection.vue` 内
  ```css
  @import '~/assets/css/components/WelcomeSection.desktop.css';
  @import '~/assets/css/components/WelcomeSection.mobile.css';
  ```
- `prose-custom.css` 是由 `nuxt.config.ts` `css: []` 全局加载的,改为分别加载 `.desktop.css` + `.mobile.css` 即可,不需改 Vue 组件。

**替代方案**:

- 改用 Vite/Nuxt 自动拆分(把 CSS 放到 `app.vue` `<style>` 里)— 收益是 Vite 会在构建时按引用去重,但当前用 `@import` 已能满足需求。否。

### Decision 4: 渐进迁移的具体步骤

**选择**: 每个组件按下列顺序处理,逐个组件验证后再处理下一个。

1. 读旧 `.styles.css`,按 `@media (max-width: ...)` 边界切分
2. 新建 `.<name>.desktop.css`(基线规则) + `.<name>.mobile.css`(`@media` 块整体搬入)
3. 在 Vue 组件(或 nuxt.config)中将旧 `@import` 改为分别引用新文件
4. **保留**旧 `.styles.css` 文件,但内容替换为两个新文件的 `@import`(保持向后兼容,留 1~2 个版本后再彻底删除)
5. 跑 `npm run generate` 与本地 `npm run dev`,目视回归 + Lighthouse 截图对比
6. 通过后,删除旧 `.styles.css`

**回滚**: 任何一步失败,把 Vue 组件引用改回旧 `.styles.css` 即可。

### Decision 5: 验证脚本

**选择**: 在 `nuxt-public/scripts/check-responsive-split.mjs` 写一个 Node 脚本,扫描 `assets/css/components/` 下所有文件并:

- 任意 `.styles.css` 中存在 `@media` 块 → **报错**(说明没迁移完)
- `<X>.desktop.css` 中存在 `@media (max-width: ...)` 块 → **报错**
- `<X>.mobile.css` 中存在未包裹在 `@media` 中的规则 → **报错**
- `<X>.desktop.css` 与 `<X>.mobile.css` 之一缺失 → **报错**

脚本可通过 `npm run lint:responsive` 触发(在 `package.json` 加 scripts 项)。

**替代方案**: 引入 stylelint 规则 — 收益更通用,但当前项目没用 stylelint,引入成本不匹配范围。否。

## Risks / Trade-offs

- **[Risk] 拆分时漏掉边界规则** — 某些 `@media` 块可能跨越 768/992 嵌套,切错位置会导致样式错位。**Mitigation**: 每个组件拆分后用 Chrome DevTools 移动模拟器 + 桌面尺寸双截图对比。
- **[Risk] 旧 `.styles.css` 在迁移期间体积反而增大**(`@import` 两份子文件)。**Mitigation**: 接受短期体积,逐个迁移后删除,体积回归。
- **[Risk] 断点不一致** — 不同组件可能用了 768/769/991/992 混用,导致拆分后桌面/移动规则有缝隙。**Mitigation**: 设计脚本校验,提示修复。
- **[Trade-off] 桌面端也下载 mobile CSS** — 体积略增(估计每个组件 < 5KB,总计 < 30KB gzip 前),换取加载逻辑简单。

## Migration Plan

按组件滚动迁移,顺序按依赖/重要度:

1. `WelcomeSection`(首页核心,首屏 LCP 影响最大)
2. `SideBar`(全局布局,影响所有页面)
3. `ArticleList`(文章列表页核心)
4. `Gallery`(画廊页核心)
5. `AboutPage`(关于页)
6. `prose-custom`(文章详情页 prose 样式)

每个组件执行 **Decision 4** 的 6 步。全部完成且回归通过后,删除旧 `.styles.css` 文件并更新 README/AGENTS.md。

**回滚**: 任一组件回滚 = 把 Vue 组件 `@import` 改回旧 `.styles.css` 即可,旧文件在迁移期保留内容。

## Open Questions

- 迁移期结束后,旧 `.styles.css` 文件是直接删除,还是保留为 `@forward` 占位若干版本? 倾向直接删除(避免双重加载)。
- 是否需要把全局 `app.vue` 内的 `.hide-mobile` / `.hide-tablet` / `.hide-desktop` 工具类拆出到独立文件? 倾向拆到 `responsive-utilities.desktop.css` + `responsive-utilities.mobile.css`,保持项目内"桌面/移动"约定的一致性。
