# CSS 集中管理方案（3 种可落地模式）

## 0. 当前建议（本仓库推荐）

采用 **混合分层模式**：
- 全局基础层：`app/assets/css/theme-variables.css`、`app/assets/css/app.css`、`app/assets/css/layout.css`
- 功能样式层：`app/assets/css/components/*.styles.css`（按 feature/页面归属）
- 组件就近层：SFC `style scoped`（仅放结构与局部状态，不放主题硬编码）

并执行两条规则：
1. 颜色必须走 token（`var(--*)`）
2. `.vue` 文件仅保留一种样式入口（推荐 `style @import`，不再在 `script` 中 side-effect import）

---

## 1) 纯全局集中（不推荐）

所有样式都汇总在 `assets/css` 下统一管理。

优点：
- 检索和批量替换简单
- 视觉规范容易统一

缺点：
- 业务耦合高
- 文件膨胀后难维护
- feature-first 架构下可读性差

适用：
- 小型静态站、页面数量很少

---

## 2) 纯组件就近（不推荐）

每个 `.vue` 完全自带样式，几乎不使用全局样式文件。

优点：
- 改动局部、回归范围小
- 组件可移植性高

缺点：
- 主题一致性难保证
- 重复样式多、设计 token 容易失控

适用：
- 组件库开发、隔离性要求极高场景

---

## 3) 混合分层（推荐）

把“规则”和“业务样式”分开：
- 规则（全局）：变量、重置、布局、通用状态
- 业务（功能）：按 feature 的 styles 文件
- 局部（组件）：`scoped` 只放结构与局部交互

优点：
- 统一主题能力强
- 与 feature-first 架构一致
- 修改成本和可维护性平衡最佳

---

## 执行清单

- 每次改样式先执行：`npm run css:audit`
- 每次改入口后执行：`npm run css:imports:audit`
- PR 必须说明：是否新增 token、是否新增硬编码例外

---

## 本仓库已落地

- 已引入硬编码扫描：`scripts/check-hardcoded-colors.mjs`
- 已引入重复样式入口扫描：`scripts/check-duplicate-style-imports.mjs`
- 已把若干页面改为单一入口（style @import）
