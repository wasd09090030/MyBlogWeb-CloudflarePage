## 1. 数据层扩展

- [x] 1.1 在 `monthGrouping.ts` 给 `GalleryMonthGroup<T>` 加 `englishShort: string` 字段（如 `"Jan"` / `"Feb"` / `"Mar"`）
- [x] 1.2 在 `groupGalleryByMonth` 中按 `monthKey` 末两位数字映射 1-12 月到英文简写，存到 `englishShort`
- [x] 1.3 给 `GalleryYearGroup<T>` 加 `peakCount: number` 字段（年内最多图的月份数）
- [x] 1.4 在 `groupGalleryByYear` 中遍历 `group.items.length` 取 `Math.max(...)` 写入 `peakCount`
- [x] 1.5 跑 `vue-tsc --noEmit` 确认类型无错（EXIT=0）

## 2. 主题 token

- [x] 2.1 在 `theme-variables.css` 亮色段增 `--color-rail-fill-bar: rgba(15, 23, 42, 0.18)`
- [x] 2.2 在暗色段（`:root.dark, :root.dark-theme, :root[data-theme="dark"]`）覆盖为 `rgba(226, 232, 240, 0.22)`

## 3. 组件模板

- [x] 3.1 在月份按钮的 `<span class="gallery-timeline__label">` 容器上绑 `:style="{ '--fill': yearGroup.peakCount > 0 ? (group.items.length / yearGroup.peakCount).toFixed(3) : '0' }"`（按钮上绑，让 fill-bar 子元素继承）
- [x] 3.2 在月份按钮内尾部加 `<span class="gallery-timeline__fill-bar" aria-hidden="true" />`
- [x] 3.3 在月份按钮内加 `<span v-if="activeMonthKey === group.key && group.englishShort" class="gallery-timeline__sublabel" aria-hidden="true">{{ group.englishShort }}</span>`（active 月才显示），并把原 label 文本包到 `<span class="gallery-timeline__label-text">` 让 sublabel 块级换行
- [x] 3.4 在年份 header 与首个月份行之间插 `<svg class="gallery-timeline__year-ornament" viewBox="0 0 4 4" aria-hidden="true" focusable="false"><rect x="0" y="0" width="2.83" height="2.83" transform="rotate(45 1.41 1.41)" /></svg>`（`v-if="yearGroup.months.length > 0"` 守门）
- [x] 3.5 在月份按钮内加 `<span class="gallery-timeline__hover-chip" aria-hidden="true">{{ group.items.length }} 张</span>`（绝对定位到右下，仅 desktop 可见）

## 4. 组件样式

- [x] 4.1 `.gallery-timeline__label` 增 `font-family: 'Playfair Display', ...serif; font-style: italic; font-size: clamp(0.95rem, 1.1vw, 1.1rem); letter-spacing: 0.02em; font-weight: 700;`（并把容器改为 `display: flex; flex-direction: column;` 以让 sublabel 块级换行）
- [x] 4.2 `.gallery-timeline__item` 增 `padding-right: 36px;`（给 fill-bar 留位）
- [x] 4.3 新增 `.gallery-timeline__fill-bar`：`position: absolute; right: 0.6rem; bottom: 0.5rem; width: calc(var(--fill, 0) * 22px); max-width: 22px; height: 2px; background: var(--color-rail-fill-bar); border-radius: 999px; transition: width 220ms ease-out, background 220ms ease, height 220ms ease, box-shadow 220ms ease-out;`
- [x] 4.4 `.gallery-timeline__item[aria-current="true"]` 改用 `box-shadow: inset 2px 0 0 var(--color-editorial-glow); transform: translateX(4px); transition: ...`（不占 layout 空间）；子 `.gallery-timeline__label` `font-weight: 800`
- [x] 4.5 `.gallery-timeline__item[aria-current="true"] .gallery-timeline__fill-bar` `height: 3px; background: var(--color-editorial-glow); box-shadow: 0 0 6px var(--color-editorial-glow);`
- [x] 4.6 新增 `.gallery-timeline__sublabel`：`display: block; font-size: 0.62rem; font-style: normal; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(15, 23, 42, 0.45); margin-top: 1px;`
- [x] 4.7 新增 `.gallery-timeline__year-ornament`：`width: 4px; height: 4px; margin: 0.15rem 0 0.05rem 0.55rem; color: var(--color-editorial-ornament); fill: currentColor; align-self: flex-start; opacity: 0.9;`
- [x] 4.8 新增 `.gallery-timeline__hover-chip`：`position: absolute; right: -2px; top: 50%; transform: translate(100%, -50%); margin-right: 0.4rem; padding: 0.18rem 0.5rem; background: var(--color-editorial-glow); color: #fff; font-size: 0.7rem; font-weight: 600; border-radius: 4px; white-space: nowrap; opacity: 0; pointer-events: none; z-index: 2;`
- [x] 4.9 在 `@media (hover: hover) and (pointer: fine)` 块内：`.gallery-timeline__item:hover/focus-visible .gallery-timeline__hover-chip { opacity: 1; }`
- [x] 4.10 暗色主题覆盖：`.dark-theme .gallery-timeline__sublabel` 改浅；`.gallery-timeline__item[aria-current="true"]` box-shadow 用暗色 glow token；active fill-bar 也用暗色 glow
- [x] 4.11 移动端 `≤1024px` 段：`.gallery-timeline__item` padding-right 28px；fill-bar max-width 16px；sublabel 字号 0.55rem；hover-chip `display: none`
- [x] 4.12 `prefers-reduced-motion: reduce` 段：所有 transform / transition 强制 0s；active 月 transform: none + box-shadow: none（保留 visual 但禁用位移）

## 5. 验证

- [x] 5.1 `vue-tsc --noEmit` EXIT=0
- [x] 5.2 `npm run generate` 完整通过（**注意**：build 内仍报 172 个 pre-existing link 错误 `/tools` `/mania` 404，与本变更无关；所有 gallery 路由正常）
- [x] 5.3 CSS bundle 包含 `gallery-timeline__fill-bar` 与 `gallery-timeline__sublabel` 规则（**实际 16/16 全通过**——`.label-text` `aria-current=true`（无引号）`@media(hover:hover)`（无空格）都被 cssnano 压缩后命中）
- [ ] 5.4 浏览器打开 `/gallery`（建议本地 `npm run dev`）肉眼验证：①月份字体已是 Playfair Display italic 与年份同源；② fill-bar 比例视觉正确；③ active 月有 2px 左边框 + nudge + bold；④ active 月显示英文副标（**本会话禁止开浏览器** → **交用户**）
- [ ] 5.5 暗色主题下 fill-bar 与 sublabel 颜色对比度 WCAG AA（**交用户**）
- [ ] 5.6 移动端 `≤1024px` 段：月份 label 字号合适、fill-bar 缩略、hover chip 不显示（**交用户**）
- [ ] 5.7 `prefers-reduced-motion: reduce` 启用：transform 0s、hover chip 0s（**交用户**）
- [ ] 5.8 触摸设备（DevTools 切到 Touch）：hover chip 不显示（**交用户**）
- [x] 5.9 `git diff --stat HEAD -- nuxt/ backend-dotnet/ cloudflare-worker/` 应为空（**已确认**：输出为空，scope 守恒）

## 6. 用户验证

- [ ] 6.1 **用户**本地 `npm run dev` 后肉眼对比"原截图"与"新版本"，确认：①月份字体同步问题已修复 ②时间线不再简陋 ③整体达到杂志 TOC 感
- [ ] 6.2 若用户对 active 月视觉跃迁（border + nudge）仍不满意，可后续加 `nudge` 距离到 6px 或更换为 background 改色变体
- [ ] 6.3 若用户希望月份副标改中文拼音（"yī yuè"），改 `englishShort` 字段为中文
