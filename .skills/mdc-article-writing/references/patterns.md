# 按文章类别选用组件

后台文章有固定的 `category` 字段（`nuxt-admin/server/domain/articles.ts:41`）：`study`、`game`、`work`、`resource`、`other`。类别决定了读者是谁、要什么，组件的取舍应该跟着变——不是"尽量多用"，而是"这一类文章里哪些组件是噪音"。

先看矩阵，再看每类的原因和骨架。

## 组件 × 类别矩阵

`✓` 主力使用；`○` 有条件使用（下面各类别里写了条件）；`—` 不要用。

| 组件 | study 学习笔记 | game 游戏评测 | work 个人作品 | resource 资源分享 | other 随笔/日志 |
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
| `github-card` | ○ 一篇至多两张 | — | ✓ | ✓ | — |
| `link-card` | ○ 引用资料 | — | ✓ | ✓ 主力 | ○ |
| `type-writer` | — | — | ○ 至多一处 | — | ○ 至多一处 |
| `web-embed` | ○ 视频教程 | ✓ 实机视频 | ✓ 演示录屏 | ○ | — |

矩阵是默认值，不是禁令。要破例时问一句：这个组件让读者更快拿到他想要的东西吗？如果只是让版面更热闹，去掉。

---

## study — 学习笔记 / 技术教程 / 踩坑复盘

**读者**：想照着做、或者想认出同样问题的人。他们要**可复现的步骤**和**可信的证据**。

**主力**：`steps` 立主线，`code-playground` 放可跑示例，`collapse` 收完整配置和回滚，`tabs` 并列多方案或多种验证路径，`alert` 标风险。

**不要用**：`spoiler`（技术内容没有"剧透"这个概念，遮起来只会让人多点击一次）、`star-rating`（除非真的在评分某个工具，且要给出评分标准）、`type-writer`（读者要的是信息，不是动效）。

**骨架**

```markdown
## 背景

一句话说明为什么做这件事。

::alert{type="info"}
#title
先决条件
#default
版本、权限、前置状态。
::

::steps{current="1"}
---
steps:
  - title: "主要阶段一"
    description: "判据或命令"
  - title: "主要阶段二"
    description: "..."
---
::

### 1. 阶段一

正文 + 围栏命令。

::collapse{title="完整配置文件"}
只贴改动的段落，不要贴整个文件。
::

::alert{type="warning"}
顺序错了会怎样 —— 要具体到后果。
::

## 验证

::tabs
---
labels: ["命令行", "界面操作"]
---
#tab-0
```bash
curl -s https://example.com/api/health
```
#tab-1
在后台逐项点一遍，然后刷新列表确认状态真的变了。
::

## 回滚

::collapse{title="回滚步骤"}
...
::
```

**这一类的取舍要点**

- `steps` 只放 3–5 个**阶段**，不是每条命令一步。
- `alert` 只在"错了会造成真实损失"的地方出现。连续两个 alert 说明应该改成小标题。
- 踩坑复盘里，`alert{type="error"}` 只描述故障本身，建议放文末——把"是什么坏了"和"下次怎么办"分开。
- 验证方式用 `tabs` 而不是并列段落，读者会挑自己常用的那条。

---

## game — 游戏评测

**读者**：决定买不买、玩不玩的人。他们要**结论**和**不被打扰的阅读体验**。

**主力**：`star-rating` 给评分，`spoiler` 隔离剧透，`image-enhanced` 配图，`alert` 收结论。

**不要用**：`code-playground`、`steps`、`github-card`、`link-card`、`tabs`。评测里出现代码框或步骤条会立刻破坏氛围。`tabs` 尤其不要——把四个分项评分塞进四个标签页，读者得点四次才能看全，而他们本来只想扫一眼分数。

**评分要用平铺，不要用 tabs**

```markdown
## 评分

::star-rating{rating="4.5" maxStars="5" label="总评" showScore}
::

::star-rating{rating="5" maxStars="5" label="玩法" size="small"}
::

::star-rating{rating="4" maxStars="5" label="剧情" size="small"}
::

::star-rating{rating="5" maxStars="5" label="音乐" size="small"}
::

::star-rating{rating="3.5" maxStars="5" label="难度" size="small"}
::
```

一行一个评分，纵向排下来是 5 个块——略松散但可接受；想更紧凑就把分项并成一张表格（星数用 ★☆ 字符），只保留总评用 `star-rating`。

**骨架**

```markdown
::image-enhanced{src="..." alt="游戏截图" caption="图 1：..." border rounded}
::

## 第一印象

两三段正文，不要用组件。

## 评分

平铺 star-rating。

## 玩法 / 剧情 / 音乐 / 难度

每节正文 + 必要时配图。

::spoiler{label="⚠ 剧情剧透" clickText="点击查看"}
只遮真正会破坏体验的内容 —— 结局、关键翻转。
::

## 结论

::alert{type="success"}
#title
推荐 / 保留意见写进标题
#default
适合谁、不适合谁。
::
```

**这一类的取舍要点**

- `alert` 的 `type` 就是结论：推荐用 `success`，有保留但仍推荐用 `success` 并在正文写清保留点，不推荐用 `warning`。**不要用 `error`**——那是给故障提示的。
- `spoiler` 只遮结局和关键翻转。遮太多，读者会干脆跳过整段。
- 评分按 0.5 取整；`4.7` 会显示成 `4.5`，想表达精确值就关掉 `showScore` 或改用表格。
- 优缺点用表格收尾比再堆一组 alert 有效。

---

## work — 个人作品 / 项目展示

**读者**：评估"这个东西值不值得用/看"的人，以及想学实现的人。两种读者都要照顾。

**主力**：`image-enhanced` 展示成果，`image-comparison` 做前后对比，`github-card` + `link-card` 给入口，`steps` 讲上线/使用流程，`code-playground` 放核心片段，`alert` 写前置条件。

**不要用**：`spoiler`（作品展示没有需要遮的内容）、`type-writer`（除了一处开场标语，其余时候只是延迟信息出现）。

**骨架**

```markdown
一句话说清这是什么、解决什么问题。

::image-enhanced{src="..." caption="图 1：最终效果" border rounded}
::

::link-card{url="..." text="在线体验" icon="mdi:open-in-new"}
::

::github-card{repo="owner/repo"}
::

## 它解决什么

正文。对比同类方案时用表格，不要用 alert 堆叠。

## 怎么用

::steps{current="1"}
---
steps:
  - title: "安装"
    description: "npm i xxx"
  - title: "配置"
    description: "..."
---
::

## 实现中的关键点

::collapse{title="核心代码"}
```ts
// 只贴真正有信息量的片段
```
::

## 已知限制

::alert{type="warning"}
#title
明确写出不适用场景
#default
...
::
```

**这一类的取舍要点**

- `github-card` 是运行时取数，star 数每次都变；一篇至多两张，且要在意 GitHub 未认证限流（60 次/小时/IP）。
- `code-playground` 只在"读者能复制就跑、跑完有直观结果"时用。展示架构代码用普通围栏。
- `image-comparison` 适合改版前后、性能优化前后；两张图必须同尺寸同比例。

---

## resource — 资源分享

**读者**：来拿东西的人。他们要**快速找到、快速拿走**。

**主力**：`link-card` 是主角，一个资源一个；`github-card` 给仓库；`collapse` 装长清单；`alert` 提示安全/授权问题；`tabs` 按类别分组。

**不要用**：`star-rating`、`spoiler`、`code-playground`、`steps`、`image-comparison`、`type-writer`、`web-embed`。资源分享页里，任何需要读者额外操作的组件（点开、拖动、运行）都是在阻止他们拿到链接。

**骨架**

```markdown
一句话说明这批资源是干什么的、适合谁。

::alert{type="warning"}
#title
授权与安全
#default
这些资源的许可协议、是否可直接商用、需要从哪里获取授权。
::

::tabs
---
labels: ["工具", "素材", "文档"]
---
#tab-0
:::link-card{url="..." text="工具名 — 一句话说明" icon="mdi:tools"}
:::
#tab-1
:::link-card{url="..." text="素材名 — 一句话说明" icon="mdi:image"}
:::
#tab-2
:::link-card{url="..." text="文档名 — 一句话说明" icon="mdi:book"}
:::
::

::collapse{title="完整清单（N 项）"}
- 名称 — 说明 — 链接
- ...
::
```

**这一类的取舍要点**

- `link-card` 的 `text` 要写成"名称 — 一句话用途"，只写名称等于没说。
- 图标用 `mdi:` 或 `heroicons:` 前缀。`fa6-solid:` 不在 icon 白名单里，静态产物会退化成运行时拉取。
- 清单超过 8 项就别全铺成卡片，改成 `collapse` 里的列表。

---

## other — 随笔 / 日记 / 更新日志

**读者**：跟着站点看的人。他们读的是文字，不是版面。

**主力**：几乎没有。`alert` 偶尔用来标"需要你手动操作"，`collapse` 收长细节，`image-enhanced` 配图。

**不要用**：其余全部。随笔里出现评分、步骤条、代码沙箱会显得很刻意。

**更新日志例外**：如果更新日志涉及版本升级，`alert{type="warning"}` 标破坏性变更 + `collapse` 装完整变更清单是合理的。但仍然不用 `steps`——读者不是来跟着做的。

---

## 跨类别的组合禁忌

这些组合单独看都合法，放在一起会互相削弱：

1. **`star-rating` 嵌在 `tabs` 里**：读者要逐个点开才能看全分数。评测类一律平铺。
2. **`code-playground` 里放 `mermaid` 围栏**：Mermaid 渲染走的是 `MarkdownRenderer` 对整篇文章的处理，沙箱里的代码只会被当文本。图要画就画在组件外面。
3. **一篇里超过三处 `alert`**：强调失效。该拆成小标题。
4. **`type-writer` 超过一处**：无限循环的动效会把注意力钉在装饰上。
5. **`spoiler` 用在非剧透内容上**：读者点开一次发现没内容，后面就不点了。要"收起来长内容"用 `collapse`。
6. **同一篇里 `tabs` 用两次以上**：标签页是重交互，重复出现会让人怀疑自己在做选择题。
