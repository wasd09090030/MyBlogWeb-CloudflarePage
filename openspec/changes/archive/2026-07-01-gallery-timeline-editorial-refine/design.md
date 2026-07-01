## Context

- `gallery-timeline-editorial`（已完成）已经把右侧月份 header 升级为 Editorial 杂志感（Playfair Display 衬线 + 装饰 hairline + active dot 发光 + v-motion 揭示），并把左侧 rail 改为 Year-grouped 结构（年用 Playfair 衬线 italic 1.1-1.35rem，月用系统 sans 0.86rem bold）
- `monthGrouping.ts` 已提供 `GalleryMonthGroup<T>` 与 `GalleryYearGroup<T>` 类型，以及 `groupGalleryByMonth` / `groupGalleryByYear` 工具
- `theme-variables.css` 已有 4 个 editorial CSS 变量：`--color-editorial-ring/glow/rule/ornament`（亮+暗各一份）
- Playfair Display 已通过 `@fontsource/playfair-display` 注入到 `nuxt.config.ts` 的 `css: []` 数组
- 本次修订针对**用户截图反馈**："左侧时间线月份字体没和年份同步 + 整体简陋"
- 范围严格限于 `nuxt-public/`，`nuxt/` / `backend-dotnet/` / `cloudflare-worker/` 不动

## Goals / Non-Goals

**Goals:**
- 让左侧 rail 看起来像杂志 TOC（table of contents），不是表单 checkbox
- 月份字体族与年份完全统一（Playfair Display italic）
- 加入 fill-bar 让"图多的月份"和"图少的月份"在视觉上立刻有强弱
- 活跃月用更强的视觉跃迁（border + nudge + bold）让它"跳出来"
- 装饰与右侧 month header 呼应（共用 ornament 形态、装饰线变量）
- 保持所有现有行为：sticky、键盘、IntersectionObserver、暗色、移动、SSR-safe、reduced-motion

**Non-Goals:**
- 不重写右侧月块（仍是 Editorial header + masonry list）
- 不重做 mobile rail 的横排 chip 结构（仅微调 month label 字号 + 加 fill-bar 缩略版）
- 不引入新依赖（Playfair 已在 `gallery-timeline-editorial` 引入）
- 不动 GalleryContent.vue / GalleryPageContainer.vue / 后端
- 不做 hover preview 缩略图（仅文字 chip，spec 已注明）
- 不动 fill-bar 之外的统计信息（仍以数字形式呈现）

## Decisions

### D1 · 月份 label 字体统一为 Playfair Display italic

- 月份按钮的 `.gallery-timeline__label` 增 `font-family: 'Playfair Display', 'Source Serif Pro', Georgia, serif` + `font-style: italic`
- 字号从 `0.86rem` 升到 `clamp(0.95rem, 1.1vw, 1.1rem)`
- 字重 700 → 700（非活跃）/ 800（活跃）
- `letter-spacing` 从 0 → 0.02em（衬线字体的呼吸感）
- **理由**：与年份同源字体是"杂志感"成立的最低门槛；italic 让月份有"被年号引用"的次级感
- **替代方案**：用 Playfair Display regular（非 italic）—— 测试发现 italic 在小字号下比 regular 更有"印刷感"和"目录感"

### D2 · Fill-bar 用纯 CSS 宽度百分比，无 JS

- 月份按钮尾部加一个 `<span class="gallery-timeline__fill-bar" aria-hidden="true">`
- 宽度通过 `style="--fill: 0.58"` 这样的 inline CSS variable 由父级 computed 计算后传入
- CSS: `.gallery-timeline__fill-bar { width: calc(var(--fill, 0) * 100%); }`
- 颜色：默认 `var(--color-rail-fill-bar, rgba(15,23,42,0.18))`；active 用 `var(--color-editorial-glow, ...)`
- **理由**：纯 CSS 宽度响应，0 重排成本；visual 表现力强（一眼能看出哪个月份"重"）
- **替代方案 A**：用 SVG length 画条——更灵活但成本高
- **替代方案 B**：用 stacked dot 表示数量——太繁琐，与现有 dot 冲突

### D3 · Fill-bar 归一化用全年峰值（peakCount），不是全月总和

- 在 `monthGrouping.ts` 加 `peakCount` 字段到 `GalleryYearGroup<T>`：遍历所有月后取 `Math.max(...counts)`
- fill 计算公式：`month.items.length / yearGroup.peakCount`
- **理由**：归一化到"全年最大月"，让最大的月永远 100%，其他月份按比例缩放，符合"信息可视化"惯例
- **替代方案**：归一化到所有图数总和——但这会让 12 张和 4 张的视觉差异过小

### D4 · Active 月加 2px 左边框 + 4-6px nudge

- active 月份的按钮加 `box-shadow: inset 2px 0 0 var(--color-editorial-glow, ...)` 或 `border-left: 2px solid ...` + `padding-left: 0.45rem`（向外扩展）
- 文字 weight 提升、字号 +0.05em
- fill-bar 全亮 + 1px box-shadow glow
- **理由**：现有 active 只靠 dot 发光，强度不够；加边框让眼睛立刻锁定
- **替代方案 A**：用 background 改色——和 rail 整体气质不搭（rail 应该是"白纸黑字"）
- **替代方案 B**：用 scale 放大——会和 fill-bar 的宽度变化叠加导致 reflow

### D5 · 月份英文副标仅 active 显示（避免过载）

- 副标 `<span class="gallery-timeline__sublabel" aria-hidden="true">` 只在 `aria-current="true"` 时渲染
- 实现：`v-if="activeMonthKey === group.key"`
- 文本：在 `monthGrouping.ts` 增 `englishShort: 'Jan' | 'Feb' | ...` 字段，映射 1-12 月
- **理由**：12 个月全部显示 "Jan/Feb/..." 视觉过载；只 active 那个月显示"作为强调"
- **替代方案**：hover 才显示——会让用户在扫视时错过信息

### D6 · 年/月之间的 micro-ornament 用 4×4 SVG 菱形

- 复用现有 `<rect transform="rotate(45)" />` 模板（与右侧 header 同源）
- 4×4 viewBox（比右侧的 8×8 小一半，因为是 micro）
- 颜色用 `var(--color-editorial-ornament)` muted
- 居中于年份 header 与首个月份行之间
- **理由**：micro-ornament 制造"目录章节分隔"质感；与右侧呼应形成视觉语言一致
- **替代方案 A**：用 CSS 伪元素画三角/横线——与现有 SVG 体系割裂
- **替代方案 B**：用 emoji 或 unicode（◆ ◇ ✦）——不同字体宽度不同

### D7 · Hover chip 仅 desktop pointer 设备显示

- 用 `@media (hover: hover) and (pointer: fine)` 包裹 hover 样式
- 触摸设备（`@media (hover: none)`）不显示
- chip 文本用 `<span class="gallery-timeline__hover-chip" aria-hidden="true">{{ group.items.length }} 张</span>`，绝对定位到按钮右下
- **理由**：触摸设备没有 hover 概念，强行定义会扰乱交互；键盘焦点态用浏览器原生 outline 即可
- **替代方案 A**：用 JS 监听 mouseenter/leave——增加 JS 复杂度，纯 CSS 媒体查询已够

### D8 · fill-bar token 加到 theme-variables.css

- 新增 `--color-rail-fill-bar`（亮：`rgba(15,23,42,0.18)` / 暗：`rgba(226,232,240,0.22)`）
- 复用现有 `--color-editorial-glow` 作为 active 态条色
- 不引入新 token 类型，保持变量系统简洁

## Risks / Trade-offs

- **R1 · Fill-bar 在月份数差异小时效果有限** → 假如所有月份都是 1-3 张，bar 都是 30-100% 区间，对比度不足。**Mitigation**：spec 已要求按 peakCount 归一化；视觉上仍能区分"1 张"和"3 张"（30% vs 100%）；当差异 < 2 倍时，肉眼可忽略的"信息密度均匀"本身也是美。
- **R2 · 月份 label 改 italic 后加宽可能换行** → "10月" / "11月" / "12月" 在 italic Playfair 下可能比原 sans 略宽。**Mitigation**：按钮 min-width 由现有 1fr grid 处理；ellipsis 在小尺寸下不破坏布局。
- **R3 · Active 月 2px 边框 + 4-6px nudge 让 row 高度变化 2-3px** → 上下月份可能轻微抖动。**Mitigation**：用 `box-shadow` 模拟边框（不占空间）；nudge 用 `transform: translateX(4px)` 替代 padding 调整（不影响 layout）。
- **R4 · 年份头部 italic Playfair 在极小屏幕下溢出** → 现有 `font-size: clamp(1.1rem, 1.4vw, 1.35rem)` + `white-space: nowrap` 已处理；新增 micro-ornament 居中即可。
- **R5 · 用户截图的具体观感无法被模型直接读取**（model 不支持 image input）→ 实施方案时**强烈建议**用户先 `npm run dev` 跑一遍肉眼验证再合并。

## Migration Plan

- **步骤 1（数据层）**：`monthGrouping.ts` 在 `GalleryMonthGroup<T>` 加 `englishShort: string` 字段、在 `GalleryYearGroup<T>` 加 `peakCount: number` 字段；在 `groupGalleryByMonth` 中按 `key` 末两位 `parseInt` 后映射 1-12 月到英文简写；在 `groupGalleryByYear` 中遍历 `group.items.length` 取 `Math.max`
- **步骤 2（CSS 变量）**：`theme-variables.css` 亮色 + 暗色各增 `--color-rail-fill-bar`
- **步骤 3（组件模板）**：`GalleryTimelineLayout.vue` 模板中
  - 月份按钮的 `<span class="gallery-timeline__label">` 增 `:style="{ '--fill': (group.items.length / yearGroup.peakCount).toFixed(3) }"`
  - 按钮内尾部加 `<span class="gallery-timeline__fill-bar" aria-hidden="true" />`
  - active 月份加 `<span v-if="activeMonthKey === group.key" class="gallery-timeline__sublabel" aria-hidden="true">{{ group.englishShort }}</span>`
  - 年份 header 与首月行之间插 `<svg class="gallery-timeline__year-ornament" viewBox="0 0 4 4" aria-hidden="true"><rect transform="rotate(45)" /></svg>`
  - hover chip 放在按钮内绝对定位
- **步骤 4（组件样式）**：scoped 块新增 5 段规则
  - `.gallery-timeline__label` 加 `font-family: Playfair Display, ...serif; font-style: italic; font-size: clamp(0.95rem, 1.1vw, 1.1rem); letter-spacing: 0.02em;`
  - `.gallery-timeline__item` 加 `position: relative; padding-right: 28px;` 给 fill-bar 留位
  - `.gallery-timeline__fill-bar` 用 `width: calc(var(--fill, 0) * 100%); height: 2px; position: absolute; right: 0.45rem; bottom: 0.4rem; background: var(--color-rail-fill-bar); transition: ...`
  - `.gallery-timeline__item[aria-current="true"]` 用 `box-shadow: inset 2px 0 0 var(--color-editorial-glow); transform: translateX(4px);` + 子 fill-bar / label 调整
  - `.gallery-timeline__sublabel` `display: block; font-size: 0.62rem; ...`
  - `.gallery-timeline__year-ornament` 4×4 居中绝对定位或 flex 居中
  - `.gallery-timeline__hover-chip` `@media (hover: hover) and (pointer: fine)` 包裹
  - 暗色主题 + 移动端覆盖
  - `prefers-reduced-motion` 把所有 transform/transition 强制 0s
- **步骤 5（验证）**：`vue-tsc --noEmit` EXIT=0；`npm run generate` 完整通过；CSS bundle 含新规则；用户本地 `npm run dev` 后肉眼验证截图问题已修复
- **回滚**：4 个文件改动，git revert 单 commit 即可

## Open Questions

- **Q1 · fill-bar 是否要 hover 时变高（4px）**？当前设计保持 2px 一致；如要加可加 1 行业务量。
- **Q2 · 月份副标英文是否用中文拼音（"yī yuè"）**？当前设计用英文 "Jan/Feb" 更符合杂志感，但项目主语言是 zh-CN。请在 review 时确认。
- **Q3 · 是否要把 active 月的 fill-bar 做成 100% 全宽 + glow**？当前设计是 100% 宽但 glow 在 box-shadow；如要让 glow 沿条本身做 4px 软光，需换 `filter: drop-shadow`（性能略差，但视觉更突出）。
