# Refine Gallery Timeline: remove counts, remove scrollbars, strengthen guide line

## Why

`gallery-timeline-editorial-refine`（已于 2026-07-01 归档）把 `/gallery` 左侧 sticky rail 升级为杂志目录页（Playfair Display italic、fill-bar、active 视觉跃迁等），但用户在生产浏览中发现三类审美/交互摩擦，需要进一步最小化打磨：

1. **数字冗余**：当前 rail 一共出现 **4 处** 数字埋点——年份右上 `totalCount`、月份右上 `count`、hover 弹出"X 张"、右侧月份大标题右侧"X 张"。这些数字与已存在的 fill-bar、active 英文副标、右侧月份标题三套视觉信号功能重叠，挤占了"杂志感"的视觉纯净度。
2. **滚动条过于工程感**：当前存在 **3 处** 滚动条——外层 `.gallery-fullscreen`（`overflow-y: auto` 全屏滚动）、桌面内层 `.gallery-timeline`（`max-height: calc(100vh - 6rem); overflow: auto`）、移动内层 `.gallery-timeline`（`overflow-x: auto`）。外层是画廊的**唯一浏览机制**必须保留，但视觉轨道与其他 Editorial 元素脱节；内层滚动条本身就是 refine 阶段为防止高度爆炸加入的回退方案，违背杂志目录的"贴纸"气质。
3. **引导线薄弱**：当前唯一的纵向引导线 `.gallery-timeline__rail` 是 1px 渐变（`linear-gradient(180deg, rgba(15,23,42,.18), rgba(15,23,42,.04))`），并且在 ≤1024px 直接 `display: none`。这导致桌面端引导线"看不见"、移动端完全没有。用户期望一根清晰的、可贯穿桌面 + 移动双端的纵向主引导线，并希望 active 月份能从主引导线"伸出"一根短引出线强烈提示当前位置。

本次变更把"目录感"再向前推一步：去掉数字、藏起轨道条、强化引导线，让整列在功能上仍然是导航，在视觉上更像一份被印刷出来的目录。

## What Changes

- **移除 4 处图像数字显示**：`gallery-timeline__year-count`、`gallery-timeline__count`、`gallery-timeline__hover-chip`、`gallery-month-section__count` 四个 UI 元素全部从模板移除并删除对应 scoped 样式块。`monthGrouping.ts` 中 `totalCount` 字段可保留以备将来需要（不影响性能），但不再渲染。
- **保留视觉密度信号**：`gallery-timeline__fill-bar`（已用纯 CSS 宽度百分比表达月份密度）、`gallery-timeline__sublabel`（active 月英文副标 "Jan/Feb"）保持不变——这两项用非数字手段传达"密度"与"当前位置"，与"无数字"诉求兼容。
- **三层滚动条处理**：
  - 外层 `.gallery-fullscreen`：**保留 `overflow-y: auto` 功能**，仅以项目内已有的 `scrollbar-width: none + ::-webkit-scrollbar { display: none }` 模式（先例：`assets/css/components/ArticleList.desktop.css` L46–57）隐藏视觉轨道。
  - 桌面内层 `.gallery-timeline`：移除 `max-height: calc(100vh - 6rem)` 与 `overflow: auto`，保留 `position: sticky; top: 5.25rem`，让 rail 随页面自然流动（极长年份也不会出现内层滚动）。
  - 移动内层 `.gallery-timeline`：移除 `overflow-x: auto`，将 rail 容器改为 `flex-wrap: wrap` 多行排列，年份与月份自动换行。
- **引导线升级**：
  - `.gallery-timeline__rail`：宽度 1px → 2px；渐变改为实色 `rgba(15, 23, 42, 0.25)`，加 `border-radius: 1px` + `box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.65)`（与背景轻微对比，保持柔软感）。
  - ≤1024px：移除 `display: none`，改为贴合 rail 容器底部的横向短尾线（`bottom: 0; height: 1px; background: linear-gradient(90deg, rgba(15,23,42,.25), transparent)`），保持双端都有引导线。
  - 新增 `gallery-timeline__item[aria-current="true"]::before`：从主 rail 伸出一根 2px 短引出线，宽度约 0.45rem，颜色为 `--color-editorial-glow`。呼应项目内已有惯例（`assets/css/app.css` 中 `.navbar-nav .nav-link.active { border-left: 3px solid var(--accent-primary); }`），但用 `::before` 模拟以避免 layout 抖动。
- **保持**所有现有行为：sticky 滚动联动、键盘可达、IntersectionObserver active 跟踪、暗色主题、SSR-safe、`prefers-reduced-motion` 降级。
- **保持** 范围严格限于 `nuxt-public/`，`nuxt/` / `backend-dotnet/` / `cloudflare-worker/` 不动。
- **不引入**新依赖（Playfair Display 已通过 `@fontsource/playfair-display` 注入；`--color-editorial-*` 变量已在 refine 阶段加入 `theme-variables.css`）。

## Capabilities

### New Capabilities

（无新增能力；本变更在现有能力上扩展）

### Modified Capabilities

- `gallery-timeline-layout`：
  - 改写 **"Month fill bar visualizes image count"**——把 scenario 中"image count is still readable as the trailing number in the month label"句删除，改为 fill-bar 是密度视觉信号的唯二载体之一（另一载体是 active 月英文副标"Jan/Feb"）。
  - **删除** **"Hover preview chip on desktop"** requirement 整条——不再有数字气泡。
  - 新增 Scenario："rail 内部不出现滚动条；外层全屏容器仍可滚动浏览，但视觉轨道被隐藏"。
  - 改写 **"Year/month micro-ornament divider"**——把现有 1px 渐变 rail 升级为 2px 实色 + box-shadow 微对比，移动端不再 `display: none`。

## Impact

- **代码**
  - `nuxt-public/app/features/gallery-public/components/GalleryTimelineLayout.vue`：模板删除 4 个 `<span>`；scoped 样式删除/改写 5 段规则（4 个 count 类 + rail 升级）。
  - `nuxt-public/app/assets/css/components/Gallery.desktop.css`：`.gallery-fullscreen` 段增加滚动条隐藏 4 行规则（**不修改其 overflow 行为**）。
  - `openspec/specs/gallery-timeline-layout/spec.md`：2 条 requirement 改写 + 1 条 requirement 删除 + 1 条 requirement 微调。
  - 不动：`monthGrouping.ts`（`totalCount` 字段保留备用）、`nuxt.config.ts`、`package.json`、`theme-variables.css`（变量已就绪）。
- **依赖**：0 新增。
- **API / 数据 / 后端 / Admin**：零影响。
- **构建**：`npm run generate` 通过；CSS bundle 微增/微减大致相抵（删除 4 count 段 + 增加 1 rail 升级段 + 增加 1 引出线段 + 增加 1 全屏滚动条隐藏段）。
- **无障碍**：
  - 删除 `gallery-timeline__hover-chip` 整段——先前已有 `aria-hidden="true"`，删除后无障碍不降低；失去的是"鼠标悬停时的双层反馈"，键盘与触摸设备本就拿不到，**无损**。
  - 引出线 `::before` 是纯视觉装饰，对屏幕阅读器零影响。
  - 全屏滚动条被视觉隐藏但功能保留，键盘仍可 `PageDown/PageUp/End/Home/箭头`，`tabindex` 正常。
  - 触摸设备 swipe 行为不受影响（`overflow-y: auto` 仍提供原生滚动惯性）。
- **性能**：去除 4 处文本节点 + 4 段 CSS = 微减；移动端 `flex-wrap: wrap` 替代 `overflow-x: auto` 的视觉等价替换 = 几乎无差。
