# Design — Refine Gallery Timeline (count / scrollbar / guide line)

## Context

- 父 change `gallery-timeline-editorial-refine`（2026-07-01 归档）已把 `/gallery` 左侧 rail 升级为杂志目录页：Playfair Display italic、fill-bar、active 月视觉跃迁等。该 change 留下了以下**遗留问题**：
  - 4 处图像数字埋点（年份 `totalCount` / 月份 `count` / hover chip / 右侧月份标题旁 "X 张"）功能重叠，挤占视觉纯度。
  - 3 处滚动条（外层全屏 + 桌面内层 + 移动内层），工程感强、与 Editorial 不搭。
  - 桌面纵向 rail（1px 渐变）+ 移动端 `display: none` —— 用户感知不到任何引导线。
- 当前能力规范：`openspec/specs/gallery-timeline-layout/spec.md`（含 11 条 Requirement 和对应 Scenario）。
- 项目内可复用先例：
  - 隐藏滚动条：`assets/css/components/ArticleList.desktop.css` L46–57 `.category-bar-wrapper { scrollbar-width: none } + ::-webkit-scrollbar { display: none }`。
  - 全局 scrollbar token：`assets/css/theme-variables.css` L64–66（light）/L215–217（dark）的 `--scrollbar-track/thumb/thumb-hover` 已就绪但未用到此处。
  - 激活态左边框：`assets/css/app.css` `.navbar-nav .nav-link.active { border-left: 3px solid var(--accent-primary); }`。
- 目标范围严格限于 `nuxt-public/`，`nuxt/` / `backend-dotnet/` / `cloudflare-worker/` 不动。
- Playfair Display 已通过 `@fontsource/playfair-display` 注入到 `nuxt.config.ts` 的 `css: []`。
- 主题 token：`--color-editorial-{ring,glow,rule,ornament}` + `--color-rail-fill-bar` 已在 `theme-variables.css` 亮+暗两端就绪。

## Goals / Non-Goals

**Goals:**
- 去掉所有图像数字 UI，让 rail 在视觉上更像"杂志目录页"而不是"数据表"。
- 让三层滚动条全部从视觉上消失（外层保留功能 + 仅 2 处视觉隐藏；内层完全移除滚动机制改为自然流/换行）。
- 强化纵向引导线 + 移动端保留对应 + 新增 active 月主动引出线，使用户始终能看到自己"在哪儿"。
- 保持所有现有行为：sticky 联动、键盘可达、IntersectionObserver active 跟踪、暗色主题、SSR-safe、reduced-motion、触摸设备适配。
- 与父 change 共用一套 token 与媒体查询断点，不引入新 CSS 变量或新依赖。

**Non-Goals:**
- 不重写右侧月块（仍是 Editorial header + masonry list）。
- 不重做 mobile rail 的 chip 结构（仅微调外层 wrap 行为）。
- 不引入新依赖。
- 不动 `GalleryContent.vue` / `GalleryPageContainer.vue` / 后端 / Admin。
- 不动 `monthGrouping.ts` 数据层（`totalCount` 字段保留备用，避免 break 其它潜在依赖）。
- 不做 hover 缩略图；不做 "hover 显示月份数" 之类替代品。
- 不修改 `.gallery-fullscreen` 的 `position: fixed` / 全屏容器行为。

## Decisions

### D1 · 4 处数字全部删除，不做替代

- 删除模板 L13 / L42 / L44 / L91 共 4 个 `<span>` 节点 + 对应 scoped 块中的 4 段 CSS。
- 保留：`gallery-timeline__fill-bar`（CSS 宽度百分比表达密度）、`gallery-timeline__sublabel`（active 月英文副标 "Jan/Feb"）。
- **理由**：用户原话"不需要放有多少图这个数字"——直接照办。任何"替代品"（如"图多的月份字号变大"）都不是用户要求的范围。
- **替代方案 A**：仅去 3 处保留年份总数 —— 与用户原话不一致，**否决**。
- **替代方案 B**：保留 hover chip 但换成非数字（如 dot count） —— 与去"数字"诉求相反，**否决**。

### D2 · 外层 `.gallery-fullscreen` 滚动条：保留功能 + 视觉隐藏

- 在 `Gallery.desktop.css` 的 `.gallery-fullscreen` 段增加：
  ```css
  scrollbar-width: none;          /* Firefox */
  -ms-overflow-style: none;        /* IE/Edge legacy */
  }
  .gallery-fullscreen::-webkit-scrollbar { display: none; }
  ```
- 保留 `overflow-y: auto`、`position: fixed` 等原有属性不动。
- **理由**：`GalleryPageContainer.vue` 调用 `bodyScrollManager.disable()` —— body 不滚、`.gallery-fullscreen` 是浏览画廊的唯一通道。删除滚动功能会破坏可达性。
- **替代方案 A**：把 `.gallery-fullscreen` 改为内联文档流 —— 改动面扩展到 `GalleryContent.vue` 和 `bodyScrollManager`，**否决**。
- **替代方案 B**：连 `overflow-y: auto` 都去掉 —— 用户无法浏览下方月份，**否决**。

### D3 · 内层 `.gallery-timeline` 桌面端滚动条：从源头移除

- 删除 scoped CSS 中的 `max-height: calc(100vh - 6rem)` 与 `overflow: auto`。
- 保留 `position: sticky; top: 5.25rem; align-self: start`。
- **理由**：父 change 当时加滚动条是预防"30 年 × 12 月 ≈ 300 行"高度爆炸。但实际允许 rail 沿页面自然流，配合 `position: sticky` 仍能让当前年份月份持续可见，sticky 失效后才让出。这意味着：
  - 当用户滚动到某月份区域上方时，对应月份仍在 rail 顶部"贴"着；
  - 当用户滚动超出 rail 整个高度时，rail 自然滚出 viewport，整个页面继续滚。
- **副作用评估**：如果数据量极大（> 50 个月份），rail 高度可能 `> 1` 屏，但因为 `position: sticky`，用户在滚动时**始终能在 top:5.25rem 附近看到当前月份的对应行**（即使下面还有更多月份）。这与 `overflow: auto` 的体验**等价**但视觉上没有滚动条。
- **替代方案 A**：保留 sticky 但用 `max-height: 60vh; overflow: auto` —— 仍然有滚动条，**否决**。
- **替代方案 B**：完全去掉 sticky —— rail 跟着页面走不再常驻导航，违背 rail 的本质用途，**否决**。

### D4 · 内层 `.gallery-timeline` 移动端：去 `overflow-x: auto` + `flex-wrap: wrap`

- 在 `@media (max-width: 1024px)` 段删除 `overflow-x: auto`。
- 把容器改为 `flex-wrap: wrap; align-content: flex-start`。
- 年份 / 月份 chip 因 `min-width: max-content` 自动换行。
- **理由**：横向滚动在视觉上是"工程表格"，不是"杂志"。wrap 后最多占视口宽度 100%，更符合 mobile 浏览直觉。
- **副作用评估**：页面顶部多 1–2 行 rail；下方是月份图像区。可接受，因为 `position: sticky; top: 0` 让 rail 在用户向下滚动时仍然黏附顶部。
- **替代方案 A**：保留 overflow-x 但改成 iOS 风格 partial-overflow blur 边 —— 视觉效果接近 wrap，复杂度高，**否决**。
- **替代方案 B**：移动端折叠为下拉 —— 改交互超出本变更范围，**否决**。

### D5 · `.gallery-timeline__rail` 升级：1px 渐变 → 2px 实色

- 桌面：
  ```css
  .gallery-timeline__rail {
    position: absolute;
    left: 0.5rem;                                    /* 原 0.55rem → 0.5rem 4px 对齐 */
    top: 0.75rem;
    bottom: 0.75rem;
    width: 2px;                                       /* 1 → 2 */
    background: rgba(15, 23, 42, 0.25);               /* 实色，不用渐隐 */
    border-radius: 1px;                               /* 软化端点 */
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.65); /* 与白底细微对比，防"消失"感 */
  }
  ```
- 暗色覆盖：`.gallery-fullscreen` 是 fixed overlay，背景为 `linear-gradient(135deg, #f5f7fa, #c3cfe2)` 或暗色渐变；`:global(.dark-theme) .gallery-timeline__rail` 改为亮色实色（如 `rgba(226, 232, 240, 0.32)`）+ 对应 box-shadow 暗色。
- **理由**：1px + 渐隐让 rail 在浅灰背景上几乎看不见。2px + 实色 + 微 box-shadow 兼顾"清晰可见"和"不抢戏"。
- **替代方案 A**：3px 实色 —— 与 Editorial 装饰元素过强，**否决**。
- **替代方案 B**：保留 1px 渐变但增强对比 —— 强度仍不足，**否决**。

### D6 · 移动端 rail 显示策略反转：保留 + 改横向尾线

- 在 `@media (max-width: 1024px)` 段**不**再 `display: none`。
- 改为：
  ```css
  .gallery-timeline__rail {
    display: block;
    top: auto;
    bottom: 0;
    left: 0.25rem;
    right: 0.25rem;
    width: auto;
    height: 1px;
    background: linear-gradient(
      90deg,
      rgba(15, 23, 42, 0.25) 0%,
      rgba(15, 23, 42, 0.05) 100%
    );
  }
  ```
- **理由**：移动端导航栏顶部需要有"自己属于哪个 section"的引导感。一根左→右 渐隐的 1px 横线正好等价桌面端的纵向引导线。
- **副作用评估**：rail 在桌面 2px 移动 1px 的差序保持视觉一致。
- **替代方案 A**：移动端继续 `display: none` —— 与用户原话"补上视觉引导线"冲突，**否决**。

### D7 · active 月主动引出线

- 新增 `gallery-timeline__item[aria-current="true"]::before` 伪元素：
  ```css
  .gallery-timeline__item[aria-current="true"]::before {
    content: '';
    position: absolute;
    left: -0.45rem;                          /* 从 rail 主线 (0.5rem) 出发到 item 左缘 (0.05rem = 0.08rem padding) */
    top: 50%;
    transform: translateY(-50%);
    width: 0.4rem;
    height: 2px;
    background: var(--color-editorial-glow, rgba(15, 23, 42, 0.32));
    border-radius: 999px;
    z-index: 1;                              /* 防止与 fill-bar 重叠 */
  }
  /* hover chip 已移除，无需避让 */
  ```
- 暗色覆盖：`.dark-theme` 中 `background` 用暗色 glow token。
- `prefers-reduced-motion: reduce` 段不动（伪元素无 transition）。
- **理由**：用户原话"补上视觉引导线"——除了主 rail，主动引出线让"我属于这里"的可视性显著增强。呼应 `.navbar-nav .nav-link.active` 的 `border-left` 惯例但通过 `::before` 模拟，避免 layout 抖动。
- **副作用评估**：仅在 active 时显示，对其余月份 0 影响；不影响 keyboard focus ring；不影响 fill-bar 视觉。
- **替代方案 A**：用 inset box-shadow 加粗当前已有的 2px 左边框 —— 与 fill-bar / hover 状态有视觉冲突，**否决**。
- **替代方案 B**：把 fill-bar 加长到 rail 边缘 —— 改变 fill-bar 含义，**否决**。

### D8 · 全屏滚动条隐藏沿用项目惯例

- 完全照搬 `ArticleList.desktop.css` L46–57 的写法：
  ```css
  .gallery-fullscreen {
    /* 原有属性不动 */
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .gallery-fullscreen::-webkit-scrollbar {
    display: none;
  }
  ```
- **理由**：项目内已有先例，零决策成本；同时与 Firefox / IE / Chromium 三家覆盖。
- 不重新自定义滚动条样式（用户原话是"不要"——而非"自定义"）。

## Risks / Trade-offs

- **R1 · 外层滚动条视觉隐藏后，用户可能不知道页面可滚**。**Mitigation**：① 整个 `.gallery-fullscreen` 本身就是一个明显"fullscreen"视觉块（fixed overlay + 渐变背景），用户进入即知可滚；② 键盘 `PageDown/End` 仍可；③ 触摸滑动仍有效；④ 这是当代设计惯例（如 Notion / Linear / Twitter 都隐藏外层轨道）。
- **R2 · 内层 rail `max-height` 移除后，rail 整体很高（极多年份）**。**Mitigation**：`position: sticky` 让用户永远在 top:5.25rem 附近看到 active 月份行；非 sticky 部分在用户滚动时自然通过，与页面流一致。
- **R3 · 移动端改为 wrap 后，rail 可能占 2–3 行**。**Mitigation**：`position: sticky; top: 0` 让 rail 仍黏附顶部，wrap 不影响导航；下方图像区从 rail 下方开始仍占视口大部。
- **R4 · 引出线 `::before` 与现有 `.gallery-timeline__dot` 的 z-index 可能冲突**。**Mitigation**：实测位置：dot 在 `z-index: 1`，引出线设在 `z-index: 1` —— 二者在水平方向不重叠（dot 在 item 内、引出线在 item 外的 rail 主线），平面不冲突。
- **R5 · rail 升级为 2px 实色后，在某些浅色背景上仍可能对比度不足**。**Mitigation**：`box-shadow: 0 0 0 1px rgba(255,255,255,0.65)` 给 rail 一个白边；暗色主题对应暗色 box-shadow；用户 `npm run dev` 肉眼验证必要。
- **R6 · 用户未来可能希望"看见"滚动行为作为发现机制**。**Mitigation**：本变更完全可逆（4 文件改动 + git revert 即可）；如未来用户希望"露出"滚动条，删除 4 行 CSS 即可恢复。

## Migration Plan

### 步骤 1 — 修改规范（spec）

复制 `openspec/specs/gallery-timeline-layout/spec.md` 到 `openspec/changes/gallery-timeline-editorial-minimal/specs/gallery-timeline-layout/spec.md`，并按下面方案改写：

- **requirement: "Month fill bar visualizes image count"**
  - Scenario: "Fill bar width reflects relative month size" — 不改
  - Scenario: "Active month fill bar uses accent color" — 不改
  - Scenario: "Fill bar is decorative only" — 改最后一句"The image count is still readable as the trailing number in the month label" → "The image count is **not** rendered as text; readers infer density from the fill bar and the active month's English sublabel only"
- **requirement: "Hover preview chip on desktop"** —— **整条删除**
- **requirement: "Desktop month timeline layout"** —— 增加 Scenario："Rail contains no internal scrollbar"
- **requirement: "Mobile timeline rail"** —— 增加 Scenario："Mobile rail wraps without horizontal scrollbar"
- **requirement: "Year/month micro-ornament divider"** —— 改写 Scenario，把"diamond appears under each year header"补充"and the vertical main rail is 2px solid (1px on mobile horizontal version)"

### 步骤 2 — 修改 `GalleryTimelineLayout.vue`

模板：
- L13：删除 `<span class="gallery-timeline__year-count">…</span>` 整段
- L42：删除 `<span class="gallery-timeline__count">…</span>`
- L44：删除 `<span class="gallery-timeline__hover-chip">…</span>`

scoped 样式：
- `.gallery-timeline` 块：删除 `max-height: calc(100vh - 6rem); overflow: auto;`
- `.gallery-timeline__rail`：替换 width/background/box-shadow（按 D5）
- `.gallery-timeline__item[aria-current="true"]`：在现有规则之后增加 `&::before { ... }`（按 D7）
- `.gallery-timeline__year-count`、`.gallery-timeline__count`、`.gallery-timeline__hover-chip` 段：**整段删除**
- `.gallery-month-section__count` 段：**整段删除**
- `@media (max-width: 1024px)` 段：删除 `.gallery-timeline__rail { display: none }`；替换为 D6 横线样式

### 步骤 3 — 修改 `Gallery.desktop.css`

在 `.gallery-fullscreen { ... }` 段增加 D8 4 行规则（`scrollbar-width: none` 等）。

### 步骤 4 — 验证

- `npx vue-tsc --noEmit` EXIT=0
- `npm run generate` 完整通过
- 浏览器或开发者肉眼验证三层（桌面/移动/暗色）× 三态（active/hover/inactive）：
  - 数字埋点全部消失
  - 三层滚动条全部视觉不可见
  - 桌面纵向 rail 清晰可见（2px 实色）
  - 移动端横向尾线显示
  - active 月从 rail 主线伸出短引出线
- `git diff --stat HEAD -- nuxt/ backend-dotnet/ cloudflare-worker/` 输出为空（scope 守恒）

### 回滚

3 个文件改动 + 1 个新文件，git revert 单 commit 即可。

## Open Questions

- **Q1 · 外层滚动条视觉隐藏后，是否需要在 `.gallery-fullscreen` 右下加一个"可滚动提示"小三角形/Chevron**？当前设计不打算加（避免加新视觉元素）；如用户希望可加 `chevron-down` SVG 在右下 fade-in/out fade-out when not at bottom。
- **Q2 · 引出线 `::before` 长度 0.4rem 是否够明显**？可在 design review 时调整到 0.5rem 或 0.6rem。
