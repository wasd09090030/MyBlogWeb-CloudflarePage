---
name: mdc-article-writing
description: 为本项目博客写 Markdown 正文时使用，尤其是要用 ::alert / ::tabs / ::steps / ::code-playground / ::image-enhanced / ::spoiler / ::star-rating 等 MDC 块组件排版的文章。覆盖 13 个已注册组件的准确语法、props 取值、可嵌套规则、以及教程/评测/更新日志的成稿套路。当用户说「写篇文章」「写个教程」「写游戏评测」「整理成博客正文」「加个提示框/折叠/标签页」「这段 markdown 发不出去」「MDC 没渲染」时都应主动加载本 skill，即使用户没有说出 MDC 这个词。
---

# 写本项目能渲染的 MDC 文章

这个博客的文章正文不是普通 Markdown：`nuxt-public` 装了 `@nuxtjs/mdc`，正文会被解析成 AST 再由 `MDCRenderer` 渲染，`app/components/content/` 下的 13 个组件因此可以直接用 `::name` 语法调用。写错一个冒号或拼错标签名不会报错 —— 解析器会把它当成普通文本，页面上什么都不显示。所以本 skill 的重点是**准确的语法**加**写完自检**。

## 先读什么

| 场景 | 读 |
| --- | --- |
| 要写某个组件，需要完整 props 表和 YAML 示例 | `references/components.md` |
| 要成稿，需要某种文章类型的完整骨架 | `references/patterns.md` |
| 写完要校验 | 跑 `scripts/check-mdc.mjs`（见文末） |

不确定某个组件现在长什么样，直接读 `nuxt-public/app/components/content/<Name>.vue` 的 `defineProps` —— 组件源码是唯一权威，本 skill 的表格是它的快照。

## 硬性规则

以下几条错了大概率渲染失败，而且不会报错，只会静默变成纯文本：

1. **闭合标记 `::` 顶格写**，从第 0 列开始。四个以上空格的缩进在 Markdown 里就是代码块，组件标记会变成原文显示；即使是 1–3 个空格这种理论可容忍的情况，也没有理由冒这个险——计数冒号已经够容易数错了。
2. **冒号数量要配对**。`::alert` 用 `::` 收尾；嵌套时内层多一个冒号 `:::alert` 用 `:::` 收尾。能不嵌套就别嵌套 —— 下面「嵌套」一节有替代方案。
3. **标签名是文件名转 kebab-case**：`CodePlayground` → `code-playground`，`GithubCard` → `github-card`，`TypeWriter` → `type-writer`。
4. **只使用下面「已注册组件」表里的标签**。`::related-articles` 虽然出现在后台模板里，但对应组件已被移出 `app/components/content/`，当前渲染不出来 —— 不要用。
5. **块组件的开始标记要独占一行**，内容从下一行开始；行内写 `::alert{type="info"} 文字 ::` 不会被解析成组件。

## 已注册组件

全部位于 `nuxt-public/app/components/content/`，`nuxt.config.ts` 里配了 `pathPrefix: false, global: true`，文件名即标签名。

| 标签 | 一句话用途 | 必填 | 最常用的最小写法 |
| --- | --- | --- | --- |
| `alert` | 四种语义色的提示框 | — | `::alert{type="warning"}` |
| `tabs` | 多方案并列的标签页 | YAML `labels` | `::tabs` + `---labels: [...]---` |
| `collapse` | 可折叠的补充内容 | — | `::collapse{title="..."}` |
| `spoiler` | 剧透/敏感内容遮罩 | — | `::spoiler{label="..."}` |
| `steps` | 分步流程条 | YAML `steps` | `::steps{current="1"}` + YAML |
| `code-playground` | 可复制、可运行 JS 的代码框 | — | `::code-playground{lang="javascript" runnable}` |
| `image-enhanced` | 带说明、可点击放大的插图 | `src` | `::image-enhanced{src="..." caption="..."}` |
| `image-comparison` | 前后对比滑块 | `before`/`after` | `::image-comparison{before="..." after="..."}` |
| `star-rating` | 星级评分（支持半星） | — | `::star-rating{rating="4.5" label="..."}` |
| `github-card` | GitHub 仓库卡片（运行时取数） | `repo` | `::github-card{repo="nuxt/nuxt"}` |
| `link-card` | 单链接按钮卡片 | `url` `text` | `::link-card{url="..." text="..."}` |
| `type-writer` | 打字机动画文字 | — | `::type-writer{text="..."}` |
| `web-embed` | 站外视频/沙箱嵌入 | `url` 或 `platform`+`vid` | `::web-embed{url="...bilibili..."}` |

完整 props、默认值、枚举取值、槽位见 `references/components.md`。

## 两种传参方式

**行内 props** 适合属性少、值简单的组件：

```markdown
::alert{type="error"}
构建失败了。
::
```

**YAML 块** 适合数组/对象，或者在内容里还要写 `#slot` 的情况。注意 `---` 紧跟在开始标签下一行，且**只能出现一次**：

```markdown
::steps{current="2" vertical}
---
steps:
  - title: "安装依赖"
    description: "npm install"
  - title: "启动"
    description: "npm run dev"
---
::
```

同一组件两种写法可以混用（`{...}` 里的属性优先），但一篇文里保持一致更好读。

## 槽位

`#slotname` 单独占一行，接下来的内容属于该槽，直到下一个 `#slot` 或结束标记：

```markdown
::alert{type="success"}
#title
部署成功
#default
四个 Worker 都已上线。
::
```

不写 `#default` 时，标签后、首个 `#slot` 之前的内容就是默认槽。各组件支持哪些槽见 `references/components.md`；`steps` / `code-playground` / `star-rating` / `github-card` / `link-card` 没有具名槽。

## 嵌套

MDC 用冒号数量表示层级：

```markdown
::tabs
---
labels: ["问题", "解决"]
---
#tab-0
:::alert{type="warning"}
#default
报 415 了。
:::
#tab-1
原因是没有 body 的 DELETE 也被要求带 Content-Type。
::
```

但嵌套有几个实际限制：`code-playground` 读的是 slot 的 `textContent`，里面再塞组件会把组件文本一起读进去；`tabs` 的每个 panel 里嵌套别的块组件也容易数错冒号。**优先拆平**：把要嵌套的提示框移到标签页外面，或用连续段落代替。

## 内容层的三个坑

**代码里的 Markdown 特殊字符会被吃掉。** `::code-playground` 和 `::type-writer` 读的是渲染后 DOM 的 `textContent`，所以它们的内容先被当成 Markdown 解析。写 `*args`、`__init__`、`[key]` 这类字符时必须用围栏包住，否则会被解析成强调、加粗或链接：

````markdown
::code-playground{lang="python" title="装饰器"}
```python
def wrapper(*args, **kwargs):
    ...
```
::
````

围栏本身不会出现在输出里（`textContent` 只取代码文本），但围栏的语言要和 `lang` 属性一致。

**`web-embed` 有域名白名单。** 只允许 `bilibili.com`、`youtube.com`、`youtu.be`、`codepen.io`、`codesandbox.io`、`stackblitz.com` 及其子域。其他站点的 URL 会被静默丢弃，组件显示「无效的 URL」。另外 `aspectRatio` 默认 `16/9`，因此 `width` / `height` 实际不会生效 —— 想控制比例就改 `aspectRatio`。

**`code-playground` 的 `runnable` 只对 `javascript` / `js` / `node` 生效。** 写 TypeScript 不会出现运行按钮，想让用户点运行就先给出编译后的 JS。

## 正文约定

- **标题从 `##` 开始**。`mdc.headings.anchorLinks` 里 h1 关闭、h2–h4 开启，h5/h6 不生成锚点，TOC 深度也截到 4 —— 所以别用五级标题组织信息，改用列表或 `collapse`。
- **公式用 `$...$` / `$$...$$`**，`remark-math` + `rehype-katex` 已配置。KaTeX 样式表只在正文出现公式语法时才注入，不用就不产生额外请求。
- **图表用 ```` ```mermaid ```` 围栏**，客户端渲染成 SVG 并跟随明暗主题；`graph`、`flowchart`、`sequenceDiagram`、`classDiagram`、`stateDiagram`、`erDiagram`、`gantt`、`pie`、`mindmap`、`timeline` 等都支持。别和 `code-playground` 混用。
- **插图优先用 `image-enhanced`** 而不是裸 `![]()`，能拿到说明文字和外点放大；纯正文配图想要朴素效果再用裸语法。
- **标签页数量等于 `labels` 长度**，且槽名必须是 `#tab-0`、`#tab-1`…… 少写一个槽，对应标签点开是空的。

## 成稿后自检

```bash
node .skills/mdc-article-writing/scripts/check-mdc.mjs path/to/article.md
```
脚本检查：未知标签、冒号不配对、缩进的 `::`、必填 props 缺失、`labels` 与 `#tab-N` 数量不一致、枚举值越界、`web-embed` 域名白名单、`star-rating` 半星/上限、`runnable` 语言不匹配。有错误时退出码为 1，可以直接串进工作流。

脚本只能查语法，查不出内容质量。发布前的最后一步仍然是登录后台，在「分屏」模式里看一眼预览 —— 但注意**后台预览用的是简化替身**（`nuxt-admin/app/components/mdc/`）：`steps` 渲染成有序列表而不是 `UStepper`，`star-rating` 不做半星，`web-embed` 只显示外壳。预览正常不等于线上一致，涉及交互组件的文章要发布后回公开站再看一眼。

## 别忘了重建

公开站是 SSG，文章正文在构建时由 `parseArticleMarkdown` 解析成 AST 写进静态页。改完文章必须在后台点「重构 nuxt-public」，否则线上还是旧内容；只改 Markdown 不需要重新部署 Worker。
