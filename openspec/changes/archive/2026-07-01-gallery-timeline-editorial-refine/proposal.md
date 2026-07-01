## Why

`gallery-timeline-editorial` 已经为右侧月份 header 加了 Playfair Display 衬线、装饰 hairline 和 active dot 发光，但**左侧 sticky rail 的视觉表达与其余 Editorial 元素脱节**：

1. **字体不同步**：年份 header 用 Playfair Display italic 大字（`clamp(1.1rem, 1.4vw, 1.35rem)`），月份按钮却仍是系统 sans 0.86rem bold——视觉上"年"和"月"像两套字体，没有统一的杂志感
2. **结构简陋**：当前 rail 只有「点 + 文字 + 数字」三件套，没有任何"目录页"该有的装饰与节奏（无 fill-bar、无 micro-ornament、无 dotted leader），整列显得像表单 checkbox 而不是 editorial TOC
3. **信息密度单一**：每行视觉权重一致，月份与月份之间没有对比，活跃月份没有强于非活跃月份的"层次跃迁"

本次修订把左侧 rail 从「功能性 nav」升级为「杂志目录页」，让用户从「点开看」变成「想读完」。

## What Changes

- **统一字体族**：月份按钮 label 改用 Playfair Display italic（与年份同源），字号从 0.86rem 提升到 `clamp(0.95rem, 1.1vw, 1.1rem)`，letter-spacing 微调到 0.02em 以匹配衬线字体的呼吸感
- **加 fill-bar（容量条）**：每个月份按钮右侧加一条 1px×28px 的 linear-gradient 容量条，宽度按当月图数占全年峰值比例映射（如最多月 100%、次多月 70%）；非活跃态条用低对比度，活跃态条用主题色 + 发光
- **加 micro-ornament**：年份 header 与月份行之间嵌入 4×4 菱形 ornament（复用现有 SVG，与右侧 header 装饰呼应），让两层之间有"分隔点"
- **加 month secondary label**：在月份数字（"1月"）下方加 8px 字号的小写英文缩写（"Jan"），用 system sans，形成"主标 + 副标"层次（仅活跃月显示英文副标以避免过载）
- **加 hover preview chip**：hover 任一月份时，在按钮右侧浮出 8×8px 的色块提示 + tooltip "12 张"（更明确传达"会跳到 12 张图"），仅 desktop 且非触摸设备
- **活跃月视觉跃迁**：active 月份从"dot 发光"升级为"容器整体加 2px 主题色左边框 + 月份 label 加粗 + fill-bar 全亮 + 月份字号 +0.05em"，让活跃月真的"跳出来"
- **保持**所有现有行为：sticky 滚动联动、键盘可达、IntersectionObserver active 跟踪、暗色主题、移动端折叠、SSR-safe、prefers-reduced-motion 降级
- **保持** 范围严格限于 `nuxt-public/`，`nuxt/` / `backend-dotnet/` / `cloudflare-worker/` 不动
- **不引入** 新依赖（playfair-display 已通过 `@fontsource` 引入）

## Capabilities

### New Capabilities

（无新增能力；本变更在现有能力上扩展）

### Modified Capabilities

- `gallery-timeline-layout`: 新增 **Rail typography 同步**、**Fill-bar 容量条**、**Micro-ornament 分隔**、**Month secondary label**、**Active 月视觉跃迁** 等需求；同时声明 fill-bar 宽度映射规则和无障碍行为（fill-bar 仅为视觉装饰，不承担信息载体）。

## Impact

- **代码**
  - `nuxt-public/app/features/gallery-public/components/GalleryTimelineLayout.vue`：模板结构小幅扩展（fill-bar div + secondary label + ornament），scoped style 新增 4 组规则
  - `nuxt-public/app/features/gallery-public/utils/monthGrouping.ts`：扩展 `GalleryMonthGroup<T>` 与 `GalleryYearGroup<T>` 加 `peakCount` 字段（运行时取所有月份图数峰值，供 fill-bar 归一化）
  - `nuxt-public/app/assets/css/theme-variables.css`：新增 `--color-rail-fill-bar` 变量（亮+暗）
  - 不动：nuxt.config.ts、package.json（无新依赖）、其他文件
- **依赖**：0 新增（playfair-display 已在 `gallery-timeline-editorial` 变更中引入）
- **API / 数据 / 后端 / Admin**：零影响
- **构建**：`npm run generate` 通过，CSS bundle 增加 ~2KB（gzip ~1KB）
- **无障碍**：
  - fill-bar 标记 `aria-hidden="true"`，屏幕阅读器忽略
  - 月份 secondary label "Jan" 标记 `aria-hidden="true"`，避免双读
  - 键盘焦点态与原版保持一致，不破坏 tab order
  - 触摸设备不显示 hover preview chip
- **性能**：fill-bar 用纯 CSS `width` 百分比 + transition，无 JS 重排；容量归一化计算在 `computed` 中一次完成
