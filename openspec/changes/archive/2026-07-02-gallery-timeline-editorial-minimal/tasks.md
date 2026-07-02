# Tasks — Refine Gallery Timeline (count / scrollbar / guide line)

## 1. 规范与制品

- [ ] 1.1 创建 `openspec/changes/gallery-timeline-editorial-minimal/specs/gallery-timeline-layout/spec.md`，以 `openspec/specs/gallery-timeline-layout/spec.md` 为基线复制
- [ ] 1.2 改写 requirement "Month fill bar visualizes image count" 的 Scenario "Fill bar is decorative only"，去掉"the image count is still readable as the trailing number in the month label"句，改为"图像数不再以文字呈现，密度仅由 fill-bar 与 active 月英文副标共同传达"
- [ ] 1.3 删除整条 requirement "Hover preview chip on desktop" 及其所有 Scenario
- [ ] 1.4 在 requirement "Desktop month timeline layout" 末尾增加 Scenario："WHEN the user opens /gallery on desktop-class viewport, THEN the left rail contains no internal scrollbar; its height follows the page flow and remains sticky while active month is visible"
- [ ] 1.5 在 requirement "Mobile timeline rail" 末尾增加 Scenario："WHEN the viewport is narrow, THEN the rail wraps months to multiple rows without horizontal scrollbar; the vertical main rail converts to a horizontal 1px gradient hairline below the rail container"
- [ ] 1.6 改写 requirement "Year/month micro-ornament divider" 的 Scenario "Diamond appears under each year header"，补充"AND the vertical main rail is rendered 2px solid with a soft 1px box-shadow halo on desktop, 1px horizontal gradient on mobile"

## 2. 数字归零（template + scoped CSS）

- [ ] 2.1 删除 `GalleryTimelineLayout.vue` 模板 L13 `<span class="gallery-timeline__year-count">…</span>` 整段（含其外层 `: v-if` 或 wrapper 不必要则一并删；本例中直接删 span）
- [ ] 2.2 删除模板 L42 `<span class="gallery-timeline__count">…</span>`
- [ ] 2.3 删除模板 L44 `<span class="gallery-timeline__hover-chip">…</span>`
- [ ] 2.4 删除模板 L91 `<span class="gallery-month-section__count">…</span>`
- [ ] 2.5 删除 scoped CSS 中 `.gallery-timeline__year-count` 整段（含 `:global(.dark-theme)` 覆盖段对应行）
- [ ] 2.6 删除 scoped CSS 中 `.gallery-timeline__count` 整段
- [ ] 2.7 删除 scoped CSS 中 `.gallery-timeline__hover-chip` 整段 + `@media (hover: hover) and (pointer: fine)` 包裹的 hover 规则 + `:global(.dark-theme)` 覆盖 + `@media (max-width: 1024px)` 中 `display: none`（连带删除）
- [ ] 2.8 删除 scoped CSS 中 `.gallery-month-section__count` 段 + `:global(.dark-theme)` 覆盖段对应行

## 3. 滚动条处理（3 处）

- [ ] 3.1 桌面 `.gallery-timeline`：删除 scoped CSS 中 `max-height: calc(100vh - 6rem); overflow: auto;` 两行；保留 `position: sticky; top: 5.25rem; align-self: start`
- [ ] 3.2 移动端 `.gallery-timeline`（`@media (max-width: 1024px)` 段）：删除 `overflow-x: auto`；container 增加 `flex-wrap: wrap; align-content: flex-start`
- [ ] 3.3 移动端 `.gallery-timeline__rail`：删除 `display: none`；替换为横向 1px 渐变尾线（按 design D6）
- [ ] 3.4 外层 `.gallery-fullscreen`（`Gallery.desktop.css`）：保留 `overflow-y: auto` 等原有属性；增加 4 行隐藏滚动条规则：`.gallery-fullscreen { scrollbar-width: none; -ms-overflow-style: none; } .gallery-fullscreen::-webkit-scrollbar { display: none; }`

## 4. 引导线升级

- [ ] 4.1 桌面 `.gallery-timeline__rail`：width `1px → 2px`；background 替换为 `rgba(15, 23, 42, 0.25)`；加 `border-radius: 1px` + `box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.65)`
- [ ] 4.2 暗色覆盖：`:global(.dark-theme) .gallery-timeline__rail` 同步改为亮色实色（如 `rgba(226, 232, 240, 0.32)`）+ 对应暗色 box-shadow
- [ ] 4.3 active 月引出线：在 `.gallery-timeline__item[aria-current="true"]` 规则后增加 `&::before { content: ''; position: absolute; left: -0.45rem; top: 50%; transform: translateY(-50%); width: 0.4rem; height: 2px; background: var(--color-editorial-glow); border-radius: 999px; z-index: 1; }`（用 `&::before` 或子选择器语法匹配 Vue scoped）
- [ ] 4.4 暗色覆盖：`:global(.dark-theme) .gallery-timeline__item[aria-current="true"]::before` 同步用暗色 glow token

## 5. 验证

- [ ] 5.1 `vue-tsc --noEmit` EXIT=0
- [ ] 5.2 `npm run generate` 通过（已有 baseline，注意 172 个 pre-existing `/tools` `/mania` 404 链接错误与本变更无关）
- [ ] 5.3 CSS bundle 含新规则 `gallery-timeline__rail`（width 2px）+ `gallery-fullscreen::-webkit-scrollbar { display: none }` + `gallery-timeline__item[aria-current="true"]::before`
- [ ] 5.4 浏览器打开 `/gallery` 肉眼验证：①4 处数字全部消失；②三层滚动条全部视觉不可见（用户仍可鼠标滚 / 触摸滑 / 键盘 PageDown）；③桌面 2px 实色 rail 清晰可见；④移动端横向尾线展示；⑤active 月从 rail 主线伸出短引出线
- [ ] 5.5 暗色主题：rail 颜色 + 引出线颜色对比度足够
- [ ] 5.6 移动端 viewport：rail wrap 多行展示，无水平滚动条，rail 仍 sticky 顶部
- [ ] 5.7 触摸设备（DevTools 切到 Touch）：仍可 swipe 浏览整页（外层 overflow-y: auto 在）
- [ ] 5.8 `prefers-reduced-motion: reduce` 启用：所有 transition / transform 仍按现有规则失效，引出线是伪元素无 transition
- [ ] 5.9 `git diff --stat HEAD -- nuxt/ backend-dotnet/ cloudflare-worker/` 应为空（scope 守恒）

## 6. 用户验证

- [ ] 6.1 用户本地 `npm run dev` 后肉眼比对，确认：①数字归零 ②滚动条全消失 ③引导线在桌面 / 移动双端都清晰可见 ④active 月引出线不会让行高抖动
- [ ] 6.2 如果用户在某种暗色背景下发现 rail 对比度仍不足，调整 4.1 / 4.2 的 rgba 值
- [ ] 6.3 如果用户觉得引出线 0.4rem 太短或太长，可调整到 0.5/0.6rem

## 7. 收尾

- [ ] 7.1 `openspec validate gallery-timeline-editorial-minimal` 通过
- [ ] 7.2 `openspec archive gallery-timeline-editorial-minimal`（实施完成且验证后归档）
- [ ] 7.3 更新项目记忆（如需要）：在 `openspec/specs/gallery-timeline-layout/spec.md` 中合并本变更的 requirement 改写（若用户采用合并模式而非保留为单独 change）
