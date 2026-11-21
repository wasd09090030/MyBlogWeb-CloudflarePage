---
name: WyrmKk
description: 蜜桃阅览室 — 暖色纸面上的个人编辑式博客
colors:
  rouge: "#e11d48"
  rouge-deep: "#be123c"
  rouge-soft: "#fb7185"
  rouge-pale: "#fda4af"
  amber: "#fb923c"
  teal: "#0d9488"
  sky: "#38bdf8"
  warm-sand: "#fdf6f1"
  warm-sand-deep: "#f7e8e1"
  sand-shade: "#f0ddd6"
  card-white: "#ffffff"
  cocoa: "#3d2f2b"
  cocoa-soft: "#8a7368"
  cocoa-faint: "#bda89d"
  border-warm: "#f2e4da"
  border-strong: "#d9b8a8"
  night-ink: "#241a17"
  night-surface: "#2e211d"
  night-card: "#33241f"
  cream-text: "#fdf5f1"
  rouge-night: "#fb7185"
typography:
  display:
    fontFamily: "Playfair Display, Noto Serif SC, Songti SC, Georgia, serif"
    fontSize: "clamp(32px, 5.5vw, 50px)"
    fontWeight: 800
    lineHeight: 1.12
    letterSpacing: "0.03em"
  hero:
    fontFamily: "Georgia, Times New Roman, Songti SC, serif"
    fontSize: "42px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "1px"
  headline:
    fontFamily: "Playfair Display, Noto Serif SC, Georgia, serif"
    fontSize: "clamp(26px, 3.4vw, 38px)"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Open Sans, system-ui, -apple-system, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Open Sans, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.78
  label:
    fontFamily: "Open Sans, system-ui, -apple-system, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    letterSpacing: "0.12em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  hero: "30px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.rouge}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.full}"
    padding: "11px 26px"
  button-primary-hover:
    backgroundColor: "{colors.rouge-deep}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.cocoa}"
    rounded: "{rounded.full}"
    padding: "11px 26px"
  chip-category-active:
    backgroundColor: "{colors.rouge}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  chip-category-idle:
    backgroundColor: "transparent"
    textColor: "{colors.cocoa}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  article-card:
    backgroundColor: "{colors.warm-sand}"
    textColor: "{colors.cocoa}"
    rounded: "{rounded.lg}"
  side-panel:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.cocoa}"
    rounded: "{rounded.xl}"
    padding: "24px"
  search-pill:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.cocoa-soft}"
    rounded: "{rounded.md}"
    height: "38px"
  nav-link-active:
    backgroundColor: "{colors.rouge-soft}"
    textColor: "{colors.rouge}"
    rounded: "{rounded.md}"
    padding: "8px 20px"
---

# Design System: WyrmKk

## Overview

**Creative North Star: "The Peach Reading Room"（蜜桃阅览室）**

这是一间为一个人准备的阅览室：墙面是暖沙色，桌面是蜜桃色，唯一的高饱和颜色是一支胭脂色的记号笔。站点不催促访客做任何事，它把文章、日记、画廊与游戏档案平摊在桌面上，让人坐下来慢慢翻。视觉的密度偏松，标题敢用大字号衬线体，正文则交回中性无衬线体，阅读节奏由纸张和留白控制，而不是由组件密度控制。

编辑式（editorial）体现在报头、眉标、分类栏和大标题层级上：Playfair Display 只负责“这一页叫什么”，Open Sans 负责“这一页说了什么”。私人（private）体现在尺度与语气上：没有营销区块，没有产品化 CTA，唯一的强动作是首页的「开始探索」与文章卡片的圆形箭头。

**Key Characteristics:**
- 暖沙纸面打底，纯白只留给卡片与侧栏面板
- 胭脂色是唯一的行动色：激活态、可点击、强调
- 衬线体做报头与标题，无衬线体做正文与标签
- 纸面叠层：默认靠 1px 暖色边框分层，阴影只在悬停与滚动导航时出现
- 圆角从 4px 到 30px 分级使用，胶囊形只给动作按钮与筛选标签

## Colors

一套暖色纸面系统，唯一的高饱和是胭脂红；其余颜色服务于分类识别与状态反馈。

### Primary
- **Rouge / 胭脂红** (#e11d48): 全站唯一行动色。用于主按钮、激活的分类 chip、文章卡片悬停边框、标签前缀、日记报头的斜体强调、hero 剪影填充。深色模式下切换为 Rouge Night (#fb7185)，保证在深棕纸面上仍有足够对比。
- **Rouge Deep** (#be123c): 主按钮与链接的悬停加深色，只在亮色模式使用。

### Secondary
- **Amber / 琥珀** (#fb923c): `study`（学习笔记）分类色，也用于次级强调与暖色渐变端点。
- **Teal / 青绿** (#0d9488): `game`（游戏评测）分类色与成功状态。
- **Sky / 天蓝** (#38bdf8): `resource`（资源分享）分类色与信息状态。`work`（个人作品）使用 Warning Amber (#f59e0b)，`other`（随笔）使用 Cocoa Faint (#c4a89b)。

### Neutral
- **Warm Sand / 暖沙** (#fdf6f1): 页面背景与文章卡片底色；`body` 实际使用略深的 Warm Sand Deep (#f7e8e1) 作为全局背景，形成纸面与卡片的微弱差。
- **Sand Shade** (#f0ddd6): 三级背景、懒加载占位与骨架屏中段。
- **Card White** (#ffffff): 侧栏面板、分类栏、搜索框与内容卡片，是纸面之上唯一的“白”。
- **Cocoa / 可可** (#3d2f2b): 正文与标题墨色，永远不用纯黑。
- **Cocoa Soft** (#8a7368): 次级文字、摘要、元信息。
- **Cocoa Faint** (#bda89d): 三级文字、占位符、眉标。
- **Border Warm** (#f2e4da) / **Border Strong** (#d9b8a8): 所有分隔线、卡片描边与输入框描边都取这两种暖色，禁止使用中性灰描边。
- **Night Ink** (#241a17) / **Night Surface** (#2e211d) / **Night Card** (#33241f) / **Cream Text** (#fdf5f1): 深色模式的三级底色与正文色，保持同样的暖棕关系。

### Named Rules

**The Rouge Signals Rule.** 胭脂红只用于“可行动”或“已选中”：按钮、激活 chip、悬停边框、链接强调。它不作为大面积装饰底色，也不作为段落文字色。

**The Category Hue Rule.** 五个文章分类固定占用琥珀、青绿、天蓝、警告黄、可可灰五色。新增分类前先复用现有五色，不新增第六种分类色。

**The Warm Border Rule.** 任何需要描边的地方都用 Border Warm 或 Border Strong；中性灰边框会立刻破坏纸面感。

## Typography

**Display Font:** Playfair Display (with Noto Serif SC, Songti SC, Georgia)
**Body Font:** Open Sans (with system-ui, -apple-system fallbacks)
**Label Font:** Open Sans，字距放大后使用

**Character:** 衬线体只出现在“报头层”——日记与归档的刊头、游戏档案的详情标题、文章大标题；正文、卡片标题、元信息全部是无衬线体。这个分工让页面读起来像纸刊而不是装饰性网站。

### Hierarchy

- **Display** (800, clamp 32–50px, 1.12): 仅用于日记与归档的杂志式报头；英文斜体部分用 Rouge。
- **Hero** (400, 42px, 1.2, 字距 1px): 首页 hero 标题，Georgia/Songti 栈，重点词用 Rouge + 斜体。
- **Headline** (800, clamp 26–38px, 1.15): 游戏档案等宽屏详情页标题。
- **Title** (700, 1.25rem, 1.3): 文章卡片标题；悬停转为 Rouge。
- **Body** (400, 1rem, 1.78): 文章正文与说明文字；正文行宽约 65–75ch，靠容器而非字号控制。
- **Label** (700, 11–13px, 字距 0.12em, 大写): 眉标、元信息、日期、统计标签；英文一律大写，中文保留原字形。

### Named Rules

**The Two Voices Rule.** 衬线体只写“页面叫什么”，无衬线体写“页面说了什么”。正文段落里出现 Playfair 即视为越界。

**The Eyebrow Rule.** 报头上的小标签必须是大写 + 0.12em 以上字距 + 11–13px；它是编辑感的来源，不要用加粗代替字距。

## Layout

主内容容器 1160px，居中，两侧 24px 内边距；游戏档案是 12 列展柜，容器放宽到 1440px 且不加侧栏。桌面端内容区与侧栏为 3fr : 1fr 网格，列间距 24px，侧栏在 992px 起显示并 sticky 于 80px。首页 hero 同为 1160px，最小高度 380px，圆角 30px。

文章卡片在列表模式是 60% 图片 / 40% 文字的横向分栏，偶数项左右翻转；网格模式改为两列纵向卡片。移动端（≤768px）容器撑满并降为 12px 内边距，卡片改为纵向堆叠，导航收进抽屉，分类栏保持单行横向滚动。

断点固定为 576 / 768 / 992px；间距阶为 4 / 8 / 16 / 24 / 32 / 48px。页面纵向节奏偏松：卡片间距 24px，段落间距 0.95rem，章节标题上边距 32–40px。

## Elevation & Depth

纸面叠层：默认状态是平的。层次由 1px 暖色边框、底色差（Warm Sand → Card White）和精确的间距建立，而不是阴影。阴影只在两种时刻出现：卡片悬停时的轻微上浮，以及导航栏滚动后的毛玻璃压层。侧栏面板刻意移除了常驻阴影，只用圆角和底色与内容区分。

### Shadow Vocabulary

- **hover-lift** (`0 4px 12px rgba(251, 113, 133, 0.30)`): 分类卡与可点击面板的悬停阴影，带胭脂色调。
- **card-rest** (`0 2px 4px rgba(0, 0, 0, 0.10)`): 极少使用；仅在需要与白底分离的浮层上出现。
- **nav-scrolled** (`0 4px 6px -1px rgba(157, 23, 77, 0.05), 0 2px 4px -1px rgba(157, 23, 77, 0.03)`): 滚动后导航的暖色压层，配合 `rgba(253, 246, 241, 0.85)` 与 12px 模糊。
- **overlay** (`rgba(0, 0, 0, 0.5)`): 抽屉与对话框遮罩。

### Named Rules

**The Paper-By-Default Rule.** 静止表面不加阴影。需要分离时先加 1px 暖色边框，再考虑底色差，最后才考虑阴影。

**The Glass-Only-At-The-Top Rule.** 毛玻璃只属于滚动后的导航与遮罩层，不用于卡片、侧栏或内容区块。

## Shapes

圆角分五级：4px（日期、标签等小 chip）、8px（输入框、导航激活块）、12px（文章卡片、分类栏按钮）、16px（侧栏面板、分类卡）、30px（hero 横幅）；动作按钮与筛选标签用胶囊形 9999px。文章卡片的“阅读全文”是一个 3rem 的正圆，内含白色箭头，悬停时圆与文字一起横向延展。

描边统一 1px，颜色取 Border Warm / Border Strong。图片容器一律裁切在父级圆角内，悬停时图片 1.05 倍放大但不溢出。没有装饰性斜切、无边框发光、无玻璃拟态卡片。

## Components

### Buttons
- **Shape:** 胶囊形（9999px）；文章卡片的阅读按钮是正圆（3rem）。
- **Primary:** 胭脂渐变（`linear-gradient(135deg, #fb7185, #e11d48)`），白字，11px 26px 内边距，17px 字号；悬停加深并轻微上浮。
- **Secondary / Outline:** 透明底，1px Border Strong 描边，Cocoa 文字；悬停转为 Rouge 描边与文字。
- **Hover / Focus:** 过渡 0.3s ease；键盘焦点用 3px `rgba(225, 29, 72, 0.35)` 外环或 2px Rouge 描边。

### Chips
- **Category filter:** 透明底 + 透明描边，文字 Cocoa；激活态使用 135° 胭脂渐变、白字、无描边。
- **Meta chips:** 日期用 12% Cocoa Soft 底 + Cocoa Soft 文字，4px 圆角；分类 chip 用对应分类色的实底 + 白字。
- **Tags:** 不带底色、不带边框，仅以 `#` 前缀与 Rouge 文字出现。

### Cards / Containers
- **Corner Style:** 文章卡片 12px；侧栏面板 16px；hero 30px。
- **Background:** 文章卡片 Warm Sand (#fdf6f1)；侧栏与分类栏 Card White；深色模式对应 Night Card (#33241f)。
- **Shadow Strategy:** 见 Elevation & Depth——静止无阴影。
- **Border:** 1px Border Warm；悬停时文章卡片边框转为 Rouge。
- **Internal Padding:** 卡片内容 24px；侧栏面板 24px；hero 内容 42px 60px。

### Inputs / Fields
- **Style:** 搜索胶囊高 38px、8px 圆角、Card White 底、1px Border Strong 描边，内嵌图标与 `⌘K` 快捷键块。
- **Focus:** 描边转 Rouge，外环 3px `rgba(225, 29, 72, 0.35)`。
- **Placeholder:** Cocoa Faint；错误态使用 Rouge，成功态使用 Teal。

### Navigation
- **Style:** sticky 顶部，透明起始；滚动后转为 85% 暖沙毛玻璃 + 底部暖色分隔线，并压缩内边距。
- **Links:** 无衬线 1.1rem、500 字重、8px 圆角；悬停加 8% Rouge 底，激活为 12% Rouge 底 + Rouge 文字。
- **Mobile:** ≤992px 收进右侧抽屉，抽屉从左侧滑入，内含四个主导航项与主题切换。

### Signature Component: 杂志式报头
日记与归档页使用居中的报头：两侧各一条 1px Cocoa 横线夹住标题，标题为 Playfair Display 800、字号 clamp 32–50px，英文斜体部分用 Rouge；标题下方是 11.5px、0.22em 字距的大写副标题。这是整站编辑气质最集中的地方，新页面若需要“刊头”，复用这个结构而不是另造。

## Do's and Don'ts

### Do:
- **Do** 以 Warm Sand (#fdf6f1) 作为页面基底，Card White 只留给侧栏、分类栏与确实需要浮起的容器。
- **Do** 用 1px Border Warm (#f2e4da) 建立层次，悬停时再让文章卡片边框转为 Rouge。
- **Do** 在报头与页面大标题使用 Playfair Display；正文、卡片标题、元信息使用 Open Sans。
- **Do** 保持 12px / 16px / 30px 三级圆角分工：卡片 / 面板 / hero。
- **Do** 用 11–13px、0.12em 以上字距的大写眉标建立编辑感。
- **Do** 分类固定使用琥珀、青绿、天蓝、警告黄、可可灰五色。
- **Do** 为每个组件同时给出深色模式值（胭脂转 #fb7185，纸面转 Night Ink / Night Surface）。
- **Do** 新代码只使用语义类：`bg-card`、`text-ink`、`text-ink-soft`、`border-warm`、`bg-rouge`、`bg-sunken`；禁止 `gray-*`、`indigo-*` 等调色板类。
- **Do** 让动效只服务于状态：悬停上浮 2–3px、图片 1.05 倍、页面切换 0.25s 淡入缩放。

### Don't:
- **Don't** 重新引入关于页的靛蓝（#6366f1）或项目霓虹色（#3bff25、#ff0eff 等）：已于 2026-11-21 统一为暖纸体系，`npm run check:design` 会拦截回潮。
- **Don't** 使用中性灰描边、纯黑正文或冷色阴影。
- **Don't** 在正文段落中使用 Playfair Display。
- **Don't** 给静止卡片添加常驻阴影，或用毛玻璃包裹内容区块。
- **Don't** 把胭脂红当作大面积背景色；它只标记行动与选中。
- **Don't** 新增第六种分类色或第二套渐变方向（全站渐变固定 135°）。
- **Don't** 使用超过 30px 的圆角，胶囊形只给按钮与筛选标签。
