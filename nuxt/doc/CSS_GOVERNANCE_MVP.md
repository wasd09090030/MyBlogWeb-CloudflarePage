# CSS 治理规范（MVP）

> 目标：在不大规模重构组件的前提下，快速收敛样式来源与主题机制，降低颜色改版与暗色适配成本。

## 1. 主题真源

- 主题状态唯一真源：`html.dark`（Tailwind `darkMode: 'class'`）。
- 兼容期允许保留 `.dark-theme` / `.light-theme`，但不得作为新增逻辑入口。
- 新代码不要依赖 `data-bs-theme`。

## 2. 色彩与变量约束

- 颜色、背景、边框、阴影优先使用 `theme-variables.css` 中的 `var(--*)`。
- 禁止在业务组件中新增裸色值：`#hex` / `rgb()` / `rgba()` / `hsl()` / `hsla()`。
- 允许例外：品牌图标、截图像素级还原、第三方代码高亮主题（需在 PR 中说明）。

## 3. 组件样式策略

- 保持 feature-first：组件内 `scoped` 可继续使用。
- `scoped` 中涉及主题差异时，优先写变量，不直接写 `.dark-theme` 特化。
- 通用样式能力（如状态色、渐变、阴影）放到全局变量或公共样式文件，避免重复定义。

## 4. 命名与兼容映射

- 统一语义前缀：
  - 背景：`--bg-*`
  - 文本：`--text-*`
  - 强调色：`--accent-*`
- 迁移期别名：`--primary-color` / `--bs-primary` 映射到 `--accent-primary`。
- 新增 token 时，需同时给出 light/dark 两套值。

## 5. 回归检查

- 本地开发前执行：`npm run css:audit`
- 重点页面回归：首页、文章详情、图库、教程、工具页。
- 重点组件回归：
  - `app/components/content/CodePlayground.vue`
  - `app/components/MarkdownRenderer.vue`
  - `app/features/gallery-public/components/MasonryWaterfall.vue`

## 6. 后续收尾（非 MVP）

- 逐步移除 `.dark-theme` 选择器并替换为 `html.dark` 上下文。
- 将高频重复样式抽成共享原子类或 UI 级样式片段。
- 将 `css:audit` 接入 CI（提醒模式或 PR 注释模式）。
