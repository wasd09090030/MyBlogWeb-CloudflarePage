# CSS 架构索引（集中分类）

## 目录分层

- `app/assets/css/theme-variables.css`
  - 设计令牌层（颜色、阴影、状态、组件 token）
- `app/assets/css/app.css`
  - 全局行为层（全局交互、跨页面覆盖、主题兼容）
- `app/assets/css/layout.css`
  - 布局工具层（网格、间距、辅助类）
- `app/assets/css/components/*.styles.css`
  - 功能样式层（按页面/功能聚合）

## 功能归属建议

- 首页相关：`WelcomeSection.styles.css`、`SideBar.styles.css`
- 文章列表：`ArticleList.styles.css`
- 图库：`Gallery.styles.css`
- 关于页：`AboutPage.styles.css`

## 入口规则（已执行）

- 业务样式入口统一在 `<style>` 中 `@import`。
- 不再在 `<script>` 中 side-effect import CSS。
- 若样式需要影响子组件或跨组件，使用非 `scoped` 的 style import。
- 组件局部补丁样式保留 `scoped`。

## 审计命令

- 硬编码颜色审计：`npm run css:audit`
- 重复样式入口审计：`npm run css:imports:audit`

## 后续迁移目标

1. 将 `components/*.styles.css` 进一步按 feature 子目录拆分（如 `components/article-list/*`）。
2. 建立 token 白名单（品牌色/语言色）并加入审计脚本豁免。
3. 逐步移除 `.dark-theme` 仅保留 `.dark`。