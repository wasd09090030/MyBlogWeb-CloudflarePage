---
name: mdc-article-writing
description: 为本项目博客写 Markdown 正文时使用，尤其是要用 ::alert / ::tabs / ::steps / ::code-playground / ::image-enhanced / ::spoiler / ::star-rating 等 MDC 块组件排版的文章。覆盖 13 个已注册组件的准确语法、props 取值、可嵌套规则，按文章类别（study 学习笔记 / game 游戏评测 / work 个人作品 / resource 资源分享 / other 随笔）区分组件用法的取舍矩阵，以及中文语感：第一人称叙述、去 AI 味（抒情升华、模板铺垫、空转形容词）的写法与自查。当用户说「写篇文章」「写个教程」「写游戏评测」「整理成博客正文」「润色一下」「别写得太像 AI」「用第一人称写」「加个提示框/折叠/标签页」「这段 markdown 发不出去」「MDC 没渲染」时都应主动加载本 skill，即使用户没有说出 MDC 这个词。
---

# 写本项目能渲染的 MDC 文章

这个博客的文章正文不是普通 Markdown：`nuxt-public` 装了 `@nuxtjs/mdc`，正文会被解析成 AST 再由 `MDCRenderer` 渲染，`app/components/content/` 下的 13 个组件因此可以直接用 `::name` 语法调用。写错一个冒号或拼错标签名不会报错 —— 解析器会把它当成普通文本，页面上什么都不显示。所以本 skill 的重点是**准确的语法**、**按类别选对组件**、**写人话的语气**，加**写完自检**。

## 先读什么

| 场景 | 读 |
| --- | --- |
| 要先确定这篇该用哪些组件、不该用哪些 | 下面「按类别选组件」+ `references/patterns.md` |
| 要写某个组件，需要完整 props 表和 YAML 示例 | `references/components.md` |
| 正文写得像 AI，或不确定「我」该用在哪 | `references/humanize-zh.md` |
| 写完要校验 | 跑 `scripts/check-mdc.mjs`（见文末） |

不确定某个组件现在长什么样，直接读 `nuxt-public/app/components/content/<Name>.vue` 的 `defineProps` —— 组件源码是唯一权威，本 skill 的表格是它的快照。

## 第一步：确定文章类别

后台 `category` 字段只接受五个值（`nuxt-admin/server/domain/articles.ts:41`）：**`study` 学习笔记、`game` 游戏评测、`work` 个人作品、`resource` 资源分享、`other` 随笔**。类别不是装饰性标签，它决定了读者要什么，也就决定了哪些组件是帮助、哪些是噪音。

写之前先归类，然后按那张矩阵选组件。矩阵完整版（含每类的骨架和取舍理由）在 `references/patterns.md`，这里只给速查：

| 组件 | study | game | work | resource | other |
| --- | --- | --- | --- | --- | --- |
| `alert` | ✓ | ✓ 仅结论/警告 | ✓ | ✓ | ○ 至多一个 |
| `tabs` | ✓ | — | ○ 方案对比 | ○ 分类清单 | — |
| `collapse` | ✓ | ○ 仅埋藏支线 | ✓ | ✓ | ○ |
| `spoiler` | — | ✓ | — | — | — |
| `steps` | ✓ | — | ✓ | — | — |
| `code-playground` | ✓ | — | ✓ | — | — |
| `image-enhanced` | ✓ | ✓ | ✓ | ○ | ○ |
| `image-comparison` | ○ 版本对比 | ✓ 画质/改动 | ✓ 前后效果 | — | — |
| `star-rating` | — | ✓ | ○ 仅用户评分类作品 | — | — |
| `github-card` | ○ 至多两张 | — | ✓ | ✓ | — |
| `link-card` | ○ 引用资料 | — | ✓ | ✓ 主力 | ○ |
| `type-writer` | — | — | ○ 至多一处 | — | ○ 至多一处 |
| `web-embed` | ○ 视频教程 | ✓ 实机视频 | ✓ 演示录屏 | ○ | — |

`✓` 主力；`○` 有条件（条件写在 `references/patterns.md`）；`—` 不要用。

**为什么这么限制**：矩阵不是洁癖。`game` 类里出现 `code-playground` 会立刻破坏评测的阅读氛围；`resource` 类里放 `spoiler` 或 `image-comparison` 是在阻止读者拿到链接；`study` 类里用 `star-rating` 会让技术内容显得像产品软文。反过来，`work` 类不用 `link-card`/`github-card` 就等于让读者自己去找入口。破例可以，但要能说出"这个组件让读者更快拿到他想要的东西"，而不只是"版面更热闹"。

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

**槽位标记后面紧跟列表时，习惯上留一个空行。** 我没能在本环境实测出「不留空行就解析失败」（`node_modules` 未安装，跑不了 `nuxt generate`），所以不当硬规则要求；但留空行没有代价，写列表时顺手加上更稳。

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

嵌套在技术上可行（`Tabs.vue` 用 `<slot :name="tab.slot" />` 渲染，子组件能正常挂载），但有两个真实限制：`code-playground` 读的是 slot 的 `textContent`，里面再塞组件会把组件文本一起读进去；`tabs` 的 panel 里嵌套时内层必须多用一个冒号，是最容易数错的地方。**所以：需要嵌套时（例如 resource 类按类别分组 `link-card`）可以嵌，但写完必须跑校验脚本；能用连续段落表达清楚的，优先拆平。**

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

## 封面图：没有就借画廊的宽图

文章本身没有封面时，不要留空：从画廊里借一张**横图**填进 `coverImage`。宽图是硬条件，不是偏好。

- **怎么挑**：用 MCP 的 `gallery_list` 取条目，它带 `imageWidth` / `imageHeight` 和 `isActive`。只选启用中、且 `imageWidth / imageHeight ≥ 1.5`（3:2 或更宽，16:9 最稳）的那张，把它的 `imageUrl` 写进 `article_create` / `article_update` 的 `coverImage`。
- **竖图和方图一律不用**。封面在列表卡片、详情页（`ArticleCard.vue`、`CoverImage.vue`）和后台预览里都按 `16/9` + `object-fit: cover` 裁切，竖图会被裁掉大半，只剩中间一条。
- 尺寸为 `null` 的条目不要猜，跳过看下一张。整页都没有合格宽图时，回来问用户，不要自己生成或上传一张新图。
- **一张画廊图只能给一篇文章当封面。** 补之前先把所有文章已用的 `coverImage` 收齐（逐篇 `article_get`），把已占用的图从候选里排除；一次补多篇时给每篇分配不同的图，不能多篇共用一张。
- 用户明确指定了封面就用用户的，不要换成画廊图。

## 语气：第一人称，别抒情

组件写对不代表文章能读。这个博客是一个人写的：默认主语是「我」，默认不抒情。

**第一人称不等于编经历。** 用户没给的过程、时间、试错次数、当时的情绪，一律不补。缺素材就问，或者只写判断不写故事。写「我把缓存头改成了 `max-age=31536000`」可以，写「我在这上面耗了一整天」——除非用户真说过——不行。

三种最常见的 AI 味，按危害排序：

1. **给真实的事编反应。**「我几乎是笑着按下开始键」——没人说过笑了，这句就是编的。「看得入迷」「久久不能平静」同理。判断句比情绪句耐读。
2. **用比喻和升华顶替描述。**「手动发布像一种仪式」「便宜不等于无代价，只是代价换了地方」。一篇留一到两句能被单独摘出来的句子就够了，其余地方写具体的事：时间、命令、现象、数字。
3. **每段结构一样。** 主题句 + 三行 + 小结，段段等长，结尾必升华。这种均匀感比任何单个词都更像机器写的。允许一段只有一句话，允许某段直接给结论。

再加上工具腔那一层：预告式开场（「接下来让我们深入看看」）、假对比（「不仅…更是…」）、空转形容词（「稳定可靠、高效便捷」）、无出处的权威（「业内专家认为」）、套话收尾（「总而言之」）。这些词本身不是罪，空泛才是；技术文里「闭环反馈」是准确术语，别为了去味改坏它。

删掉一句抒情之后空出来的位置，填的是判断而不是另一句漂亮话：能被反对、有理由、指向具体的东西。没法被反对的句子（「这是一次远行」）不承载信息。不确定的就写「这条我还没想明白」。

人称按类别调：`game` 和 `other` 全篇「我」；`study` 用「我」讲过程、结论回到客观陈述；`work` 全篇「我」；`resource` 只用「我」交代用途，不用来夸。

21 条具体模式、改写前后对照和写完自查清单见 `references/humanize-zh.md`。

## 成稿后自检

```bash
# 只查语法
node .skills/mdc-article-writing/scripts/check-mdc.mjs path/to/article.md

# 语法 + 类别规范（推荐）
node .skills/mdc-article-writing/scripts/check-mdc.mjs path/to/article.md --category study
```

`--category` 接受 `study` / `game` / `work` / `resource` / `other`，和后台分类字段完全一致。带上类别后，脚本会额外按前面那张矩阵判断：

- 该类不该出现的组件报 **error**（退出码 1），并说明原因
- 有条件组件超量报 **warning**（`github-card` 超过 2 张、`type-writer`/`tabs`/`alert` 超过上限）
- 结构性缺失报 warning（`resource` 类没有 `link-card`、`work` 类既无成品图又无入口、`game` 类只有一个评分）

通用语法检查项：未知标签、冒号不配对、缩进、必填 props 缺失、`labels` 与 `#tab-N` 数量不一致、枚举越界、`web-embed` 域名白名单、`star-rating` 半星与上限、`runnable` 语言不匹配、`star-rating` 嵌在 `tabs` 内。

脚本只能查语法和组件取舍，查不出内容质量。发布前的最后一步仍然是登录后台，在「分屏」模式里看一眼预览 —— 但注意**后台预览用的是简化替身**（`nuxt-admin/app/components/mdc/`）：`steps` 渲染成有序列表而不是 `UStepper`，`star-rating` 不做半星，`web-embed` 只显示外壳。预览正常不等于线上一致，涉及交互组件的文章要发布后回公开站再看一眼。

## 别忘了重建

公开站是 SSG，文章正文在构建时由 `parseArticleMarkdown` 解析成 AST 写进静态页。改完文章必须在后台点「重构 nuxt-public」，否则线上还是旧内容；只改 Markdown 不需要重新部署 Worker。
