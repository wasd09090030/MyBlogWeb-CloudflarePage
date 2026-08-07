# 设计文档：admin 编辑区侧边弹窗 + gallery 页面级加载动画重设计

日期：2026-08-06
状态：已确认设计，待实现

## 背景与目标

两个独立 UI 改动：

1. **admin 编辑区侧边弹窗**（`nuxt-admin`）：当前 `ArticleEditor.vue` 为「编辑+预览」左列 +「元数据卡」右侧 300px 固定列，元数据常驻挤占编辑宽度。改为标题常驻顶部、其余元数据移入右侧滑出弹窗（`USlideover`），编辑/预览占满全宽。
2. **gallery 页面级加载动画**（`nuxt-public`）：当前 `GalleryLoadingAnimation.vue` 为全屏遮罩 + 旋转照片图标 + `UProgress` 进度条 + 提示语「图片未压缩，请注意流量...」。重设计为「毛玻璃面板 + 渐变光斑背景 + GALLERY 字母逐个淡入 + 大号百分比数字」。**不是**单张图片的占位骨架屏。

## 已确认的关键决策

| 项 | 决策 |
| --- | --- |
| 弹窗内容 | 标题常驻编辑区顶部；Slug/分类/封面/标签/AI摘要/统计/草稿状态入弹窗 |
| 弹窗触发 | 工具栏「设置」按钮（齿轮图标），默认收起 |
| 全屏联动 | 全屏模式隐藏设置按钮，只编辑/预览 |
| 字母动画文案 | 主「GALLERY」逐字母淡入上移 + 副标题「WyrmKk」小字 |
| 毛玻璃背景 | 渐变光斑（纯 CSS 动画，用主题渐变变量），不用预览图 |
| 进度呈现 | 只留大号百分比数字；移除 `UProgress` 进度条与提示语 |

---

## 第 1 节：admin 编辑区侧边弹窗

### 修改文件

- `nuxt-admin/app/components/ArticleEditor.vue`（单文件改动）

### 布局调整

```
┌─ 标题输入框（常驻顶部，占满宽度）─────────────┐
├─ [返回] [保存]                                 │
├─ Markdown 工具条 | 撤销/重做 | 图片 | [⚙️设置] [全屏] │
├─ MDC 组件工具条                                 │
├─ ┌ 源码编辑器 ┐ ┌ 实时预览 ┐                     │  ← 占满全宽
└─ └──────────┘ └──────────┘                     │
```

- **标题行**：`form.title` 从原右侧卡片移到编辑区顶部，`UInput` 占满一行，常驻可见。
- **右侧 300px 卡片删除**：外层 grid 由 `xl:grid-cols-[minmax(0,1fr)_300px]` 改为单列，编辑 + 预览占满全宽；`split` 模式下 `lg:grid-cols-2` 不变。
- **新增 `USlideover`**（`side="right"`，title「文章设置」），容纳原卡片其余内容：
  Slug / 分类 / 封面图输入 + 封面预览 / 标签 + 建议标签 / AI 摘要 + 生成按钮 / 分隔线 + 统计（字符/词/标题）+ 草稿状态。
- **触发按钮**：Markdown 工具条内新增「设置」按钮（`i-lucide-settings`，UTooltip「文章设置」），置于全屏按钮旁；**默认收起**。
- **全屏模式**：设置按钮加 `v-if="!fullscreen"`，全屏时隐藏；全屏只保留源码/预览/退出全屏。
- 顶部 header 的「返回」「保存」按钮不变；弹窗内字段仍与 `form` 双向绑定，改动即时生效，`watch(form, ...)` 草稿自动保存逻辑不变。

### 表单字段对应关系

| 原卡片字段 | 新位置 |
| --- | --- |
| 标题（`form.title`） | 编辑区顶部常驻行 |
| Slug（`form.slug`） | USlideover |
| 分类（`form.category`） | USlideover |
| 封面图 + 封面预览（`form.coverImage` + `coverPreviewError`） | USlideover |
| 标签 + 建议标签（`form.tags` + `toggleTag`） | USlideover |
| AI 摘要 + 生成按钮（`form.aiSummary` + `aiSummary()`） | USlideover |
| 统计（`stats`）+ 草稿状态（`draftSavedAt`） | USlideover 底部 |

---

## 第 2 节：gallery 页面级加载动画重设计

### 修改文件

- `nuxt-public/app/components/GalleryLoadingAnimation.vue`（重写模板/脚本/样式）
- 父组件 `GalleryContent.vue`、容器 `GalleryPageContainer.vue` **无需改动**（props/传参保持兼容）。

### 视觉结构

```
┌────────────────────────────────┐
│      ●  ●  渐变光斑缓慢漂移 ●    │
│  ┌─────────毛玻璃面板─────────┐ │
│  │  G A L L E R Y            │ │  ← 字母逐个淡入上移
│  │      WyrmKk               │ │  ← 小字副标题
│  │          78%              │ │  ← 大号百分比
│  └───────────────────────────┘ │
└────────────────────────────────┘
```

### 实现要点

- **遮罩**：保留全屏 `fixed` 覆盖层（`z-index: 10000`），背景随主题半透明（沿用现有 light `rgba(255,255,255,0.8)` / dark 配色的思路，改用 CSS 变量）。
- **渐变光斑**：3 个绝对定位圆斑，用主题渐变变量 `--gradient-primary` / `--gradient-secondary` / `--gradient-cool`，`filter: blur(...)` 模糊成大块光晕，`animation` 缓慢漂移（位移 + 轻微缩放）；light/dark 自动适配。
  - `prefers-reduced-motion: reduce` 时禁用漂移动画。
- **毛玻璃面板**：居中、圆角（`--radius-xl` 或 `rounded-2xl`），`background: var(--glass-bg)` + `backdrop-filter: var(--backdrop-blur)` + `1px solid var(--glass-border)`（等价现有 `.glass-effect` 工具类）；自适应明暗主题。
- **字母动画**：将 `GALLERY` 拆为 7 个 `<span>`，各 span 设 `animation-delay: calc(var(--i) * 90ms)`（或逐字递增），keyframes 淡入 + `translateY(12px→0)`；只运行一次（`forwards`）。
- **副标题**：「WyrmKk」小字，置于字母下方，间距 `--spacing-lg` 量级。
- **百分比**：大号数字（`font-weight: 700`）实时显示 `Math.round(loadingProgress)`，下方无进度条、无提示语。
- **移除**：`UProgress` 组件、`loading-tip`（「图片未压缩，请注意流量...」）、旋转图标（`heroicons:photo`）、`spinner-rotate` keyframes。
- **保留**：`previewImages` prop 声明（向后兼容，父组件仍在传）；`loading-fade` 淡出过渡由父组件 `<Transition>` 处理，组件自身无需管理；移动端 `@media (max-width: 768px)` 尺寸缩放适配。

### 不实施（范围外）

- gallery 单图骨架屏 / 图片懒加载占位不动。
- `GalleryContent.vue` / `GalleryPageContainer.vue` / `imageLoader.ts` 不动。
- admin 其他页面、表单结构、`admin.vue` 布局不动。

## 兼容性与风险

- **向后兼容**：两个组件的 props 签名不变；`ArticleEditor` 仅内部布局调整，`[id].vue` / `create.vue` 传参不变。
- **风险**：USlideover 在 `nuxt-admin` 已有使用先例（`admin.vue` 移动端导航），无新增依赖。加载动画为纯 CSS 动画 + 主题变量，无新依赖。
- **验证方式**：admin 用 `npm run dev` 打开文章编辑页，检查标题常驻、设置弹窗、全屏联动、草稿保存；public 用 `npm run dev` 打开 `/gallery`，检查加载动画字母/百分比/光斑、主题切换、`prefers-reduced-motion`、淡出过渡、移动端。

## 实施顺序建议

1. 先做 admin 侧边弹窗（改动独立、可单独验收）。
2. 再做 gallery 加载动画（重写单组件，可单独验收）。
