## Context

`@nuxt/icon` v2.2.1 是 nuxt-public 的图标方案。仓库内已经存在两套写法：
- **老风格**：短名（如 `<Icon name="house" />`），靠 `app.config.ts` 的 `icon.aliases` 翻译为 `collection:icon`。
- **新风格**：直写（如 `<Icon name="mdi:github" />`），出现在 `Effects/SearchBar.vue`（2026 年新增）、`content/GithubCard.vue`、`content/ImageEnhanced.vue`、`content/Steps.vue`。

两套并存的代价：
1. 维护者读模板时看到的图标名和实际渲染的图标名可能不一样（`mdi:github` 实际渲染 `<>` 括号）。
2. 加新图标时要在 aliases 表里加一行，纯重复劳动。
3. 容易引入 bug：aliases 表里 `film` 漏掉了，目前依赖 Iconify 远程兜底（不可靠）。

`nuxt.config.ts` 的 `icon.serverBundle.collections: ['heroicons', 'mdi']` 已经声明了所有需要本地化的图标集，`@iconify-json/heroicons` 和 `@iconify-json/mdi` 都是 devDependencies。这两个图标集覆盖了项目里用到的全部图标名（包括"4 个语义图标"的目标：`mdi:github`、`mdi:gamepad-variant`、`mdi:robot`、`mdi:film`），无需新加依赖。

## Goals / Non-Goals

**Goals:**
- 单一图标命名风格：所有 `<Icon>` 模板使用 Iconify 原生 `collection:icon` 格式。
- `app.config.ts` 不再维护任何图标名翻译逻辑，只保留 size/class 默认值。
- 视觉变化符合预期：11 处切换为真 MDI 图标、4 处替换语义图标。
- 单 commit 可完成、可回滚。

**Non-Goals:**
- 不引入新图标集。
- 不动 `nuxt/` SSR 站。
- 不重写或封装 `<Icon>` 组件。
- 不改 `nuxt.config.ts` 中 `serverBundle.collections`。
- 不改 `package.json` 依赖。

## Decisions

### D1. 直写形式选 Iconify 原生 `collection:icon`，不引入新抽象

每个 `<Icon>` 模板直接写 `heroicons:xxx` 或 `mdi:xxx`。考虑过的替代方案：

- **方案 X：自定义 Vue 组件 `IconHome`、`IconGithub` 包裹 `<Icon name="..." />`** —— 拒绝。1) 150+ 个图标意味着 150+ 个 wrapper 文件，纯增维护量；2) `@nuxt/icon` 的 `<Icon>` 已经是事实上的 wrapper，没有再加一层的必要。
- **方案 Y：保留 aliases 但只留"语义兜底"项（如 `controller→gamepad`）** —— 拒绝。语义兜底和短名翻译混在一个 map 里，标准不清晰；新代码无法判断"该用短名还是直写"。

**选择**：直接直写。仓库内已经存在的"新风格"组件（5 个）就是证明。

### D2. 4 个"无 alias 兜底"的语义图标全部用 MDI 品牌图

| 出现位置 | 旧 | 新 |
|---|---|---|
| `pages/about.vue:70` | `name="github"` → `heroicons:code-bracket` | `mdi:github` |
| `pages/about.vue:104` | `name="controller"` → `heroicons:puzzle-piece` | `mdi:gamepad-variant` |
| `features/article-detail/components/Header.vue:25` | `name="robot"` → `heroicons:cpu-chip` | `mdi:robot` |
| `components/content/WebEmbed.vue:20` | `name="film"`（无 alias，依赖 Iconify 远程兜底） | `mdi:film` |

理由：aliases 表的设计意图本就是"用通用图标替代品牌图标"，这是一种 *降级* 视觉表达。砍掉 aliases 后，应该让真实意图浮现——`mdi:github` 本来就是 GitHub logo，没有理由再隐藏。

### D3. `nuxt.config.ts` 的 `clientBundle.icons` 预加载列表追加 3 个品牌图标

追加：
- `mdi:github`（about 页面 + GithubCard 用）
- `mdi:robot`（文章 Header 用）
- `mdi:gamepad-variant`（about 页面用）

理由：这三个是相对大尺寸的图标（出现在卡片或按钮上），无预加载会出现"先空白→再渲染"的小幅闪烁。`mdi:film` 仅在 WebEmbed 嵌入的占位状态出现，可不预加载。

### D4. 改写顺序：先删 aliases、然后逐文件改、最后跑 generate

如果反过来（先改模板、后删 aliases）会出现编译失败/视觉错误的中间态，不利于调试。

### D5. 文件级 edit，不做全局 sed

`name="house"` 这种字符串可能出现在 `aria-label`、注释、字符串拼接等位置，盲目 sed 风险大。逐文件 Edit 工具改写最稳。

## Risks / Trade-offs

- **[R1] 11 处视觉变化**（Group C：GithubCard / SearchBar / Steps / ImageEnhanced）—— 这些是预期变化，但要在 about / GithubCard 跑肉眼回归。
- **[R2] 4 处图标替换**（Group D：github / controller / robot / film）—— 同上，预期变化，需肉眼回归。
- **[R3] `nuxt.config.ts` 的预加载列表**追加了 3 个图标，会让 client bundle 略大（约几 KB），可接受。
- **[R4] MDI 图标和 heroicons 图标在视觉上**可能略不统一（如线条粗细、风格），但项目里 MDI 已经被新组件广泛使用，不存在"全站统一"约束。

## Migration Plan

1. 改 `app.config.ts`：删 `aliases` 块（保留 size/class）。
2. 改 30 个文件：逐文件把短名替换为 `collection:icon`。
3. 改 `nuxt.config.ts`：在 `clientBundle.icons` 追加 3 个 MDI 品牌图标。
4. 验证：`npm run generate` 跑通 + `npm run dev` 肉眼回归 6 个关键页面（首页 / about / article 详情 / 画廊 / 搜索 / 嵌入）。
5. 回滚：单 commit revert。

## Open Questions

无。所有关键决策（命名风格、品牌图标选型、preload 范围）已在用户确认。
