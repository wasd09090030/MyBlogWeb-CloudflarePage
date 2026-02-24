# Nuxt MDC 组件渲染原理（本项目实现版）

本文面向本仓库，详细说明 **MDC（Markdown Components）** 从“文章内容字符串”到“网页可交互组件”的完整呈现链路。

---

## 1. 什么是 MDC

MDC 是在 Markdown 中直接使用组件的一套语法能力。

在本文项目里，常见写法是：

```md
::alert{type="info"}
#title
提示
#default
这是正文
::
```

或：

```md
::star-rating{rating="4.5" maxStars="5" label="星级" showScore}
::
```

核心思想：
- Markdown 负责文档结构（标题、列表、段落、代码块）
- MDC 负责嵌入 Vue 组件（交互块、卡片、图表、评分等）

---

## 2. 本项目中的渲染总链路

## 2.1 数据进入前端

文章数据通常包含：
- `contentMarkdown`：Markdown 源文本（推荐）
- `content`：HTML 回退字段（兼容旧数据）
- `_mdcAst`、`_mdcToc`：服务端/预处理得到的解析结果（若存在）

在详情页容器中，会把这些字段传给渲染层：
- `features/article-detail/components/Content.vue`
- `components/MarkdownRenderer.vue`

## 2.2 渲染入口：MarkdownRenderer

`MarkdownRenderer.vue` 是统一入口，按优先级处理：

1. 若有 `precomputedAst`（即 `_mdcAst`）
   - 直接走 `MDCRenderer`，跳过客户端二次解析，首屏更快
2. 若只有 `markdown`
   - 客户端调用 `parseMarkdown` 生成 AST
3. 若没有 markdown 但有 html
   - 回退 `v-html` 渲染（兼容旧文章）

简化伪流程：

```txt
文章数据 -> MarkdownRenderer
  -> precomputedAst ? MDCRenderer : parseMarkdown(markdown)
  -> 生成 AST
  -> MDCRenderer(ast.body, ast.data)
  -> 输出最终 DOM
```

---

## 3. MDC 语法如何变成组件

## 3.1 解析阶段（Markdown -> AST）

`@nuxtjs/mdc/runtime` 的 `parseMarkdown` 会把文本解析成 AST。

在 AST 里：
- 普通 Markdown 节点：`h1/p/ul/code...`
- MDC 节点：记录组件名与参数（props）

例如 `::star-rating{rating="4.5"}` 会形成一个“组件节点”，其中：
- 组件名：`star-rating`
- 参数：`rating = "4.5"`

## 3.2 渲染阶段（AST -> Vue 组件）

`MDCRenderer` 遍历 AST：
- 普通节点渲染为 HTML 结构
- 组件节点按命名规则解析并挂载 Vue 组件

在本项目里，组件主要放在：
- `app/components/content/*.vue`

例如：
- `::alert` -> `components/content/Alert.vue`
- `::star-rating` -> `components/content/StarRating.vue`

参数会自动映射为组件 `props`。

---

## 4. 参数、插槽与布尔属性

## 4.1 参数传递

MDC 写法中的 `{...}` 会转换为组件 props：

```md
::web-embed{url="https://..." aspectRatio="16/9" allowFullscreen}
::
```

含义：
- `url`、`aspectRatio` 作为字符串传入
- `allowFullscreen` 无值属性按布尔 `true` 处理

组件内部通过 `defineProps` 接收，并自行做类型转换（如 `Number(...)`）。

## 4.2 插槽语义

某些组件支持具名块位（如 `#title`、`#default`），解析后会进入组件插槽。

例如 `Alert`：
- `#title` -> 标题插槽
- `#default` -> 正文插槽

---

## 5. 为什么“每个 MDC 组件应该独占一行”

MDC 组件通常承载一个完整信息块（卡片、图表、折叠面板等），若渲染成行内布局会出现：
- 与正文段落混排
- 上下文间距不稳定
- 组件彼此挤在同一行

因此项目做了两层约束：

1. 组件根节点尽量使用块级容器（`div` 等）
2. 在 `MarkdownRenderer.vue` 中统一为 MDC 根类添加 `display: block`

这保证了组件在排版中“自然换行、可预测间距、结构清晰”。

---

## 6. 列表摘要为什么会“排除 MDC”

在文章列表卡片里，摘要由：
- `utils/excerpt.ts` 的 `stripMdcMarkup` / `getExcerpt`

处理原则：
- 去除 frontmatter、代码块、HTML、链接标记
- 去除 MDC 组件语法本体
- 保留纯文本摘要

这样做是因为卡片摘要目标是“快速阅读文本”，不是展示交互组件。

若全文几乎全是 MDC，剥离后可能为空；本项目现已加兜底文案，避免 `article-content-preview` 空白。

---

## 7. 性能策略（本项目）

## 7.1 预解析优先

优先使用 `_mdcAst`、`_mdcToc`，减少客户端解析消耗。

## 7.2 Worker 预处理

`useMarkdownWorker` 负责把 TOC 提取、Mermaid 检测等放到 Worker 线程，减轻主线程阻塞。

## 7.3 Mermaid 延迟渲染

Mermaid 图表按需加载，并用 `requestIdleCallback`（或降级 `setTimeout`）在空闲时渲染，避免首屏卡顿。

---

## 8. 常见问题与排查

## 8.1 组件不显示

检查：
- 组件名是否与文件映射一致（如 `::image-enhanced`）
- 组件是否在 `app/components/content` 下可被 Nuxt 自动注册
- 属性名拼写是否正确

## 8.2 组件和正文不对齐/不换行

检查：
- 组件根节点是否是块级容器
- `MarkdownRenderer.vue` 中是否存在对应类名的块级约束

## 8.3 参数类型异常

检查：
- 组件里是否做了类型转换（如 `Number(props.rating)`）
- 布尔参数是否按无值属性或明确字符串传入

## 8.4 卡片摘要为空

检查：
- 内容是否几乎全由 MDC 组件组成
- `getExcerpt` 兜底文案逻辑是否被覆盖

---

## 9. 一句话总结

在本项目中，MDC 的本质是：

**Markdown 文本经过 Nuxt MDC 解析为 AST，再由 `MDCRenderer` 把组件节点映射到 `components/content` 下的 Vue 组件，最终与普通 Markdown 一起渲染为统一的文章页面。**

如果你希望，我可以再补一版“组件作者视角”的文档：从 0 开始新增一个 `::xxx` 组件（目录、命名、props、样式、编辑器模板、帮助面板同步）的完整 checklist。