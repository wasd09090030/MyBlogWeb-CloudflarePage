# 成稿骨架

按文章类型选骨架。每个骨架给的是**组件位置**，不是字面模板 —— 段落内容要自己写。

---

## 一、技术教程 / 部署记录

读者目标：照着做完能得到同样结果。组件的作用是把「版本差异」「坑」「完整配置」从主线里剥离出来。

```markdown
## 背景

一句话说明为什么要做这件事，以及当前状态的问题。

::alert{type="info"}
#title
先决条件
#default
Node 20+，已登录 `wrangler`，`wasd09090030.top` 的 zone 权限。
::

## 步骤

::steps{current="1"}
---
steps:
  - title: "应用 D1 迁移"
    description: "必须先于 Worker 部署"
  - title: "部署 blog-api"
    description: "npm run deploy:api"
  - title: "部署 router"
    description: "npx wrangler deploy"
---
::

### 1. 应用 D1 迁移

正文说明命令做了什么。

```bash
npm run db:migrate:remote
```

### 2. 部署 blog-api

::collapse{title="完整 wrangler.toml 变更"}
```toml
# 只贴发生变化的段落，不要贴整个文件
```
::

::alert{type="warning"}
顺序错了会 500：Worker 先于迁移部署时，新代码查不到新表。
::

### 3. 部署 router

...

## 验证

怎么确认成功 —— 具体命令 + 期望输出。

::tabs
---
labels: ["命令行", "浏览器"]
---
#tab-0
```bash
curl -s https://wasd09090030.top/api/steam/overview | head -c 200
```
#tab-1
登录 `/admin/gaming`，点「立即同步」，观察状态变化。
::

## 回滚

::collapse{title="回滚步骤"}
...
::
```

**组件取舍**

- `steps` 只放 3–5 个**主要阶段**，不要把每个命令都变成一步。
- `alert` 用在「顺序错了会坏」「需要额外授权」这类真正会造成损失的地方，一段一个足够。
- `collapse` 收完整配置和回滚步骤 —— 读者第一次读要主线，出问题时才展开。
- `tabs` 用在「同一件事有两种验证方式」的地方，不要为了好看把顺序内容塞进标签页。

---

## 二、游戏评测（`/games` 相关）

读者目标：决定买不买 / 玩不玩。组件用来强化结论、隔离剧透。

```markdown
## 第一印象

两三段正文。

::image-enhanced{src="https://cfimg.wasd09090030.top/games/xxx.webp" alt="游戏画面" caption="图 1：开场场景" border rounded}
::

## 评分

::star-rating{rating="4.5" maxStars="5" label="综合" showScore}
::

::star-rating{rating="4" maxStars="5" label="玩法" size="small"}
::

::star-rating{rating="3.5" maxStars="5" label="剧情" size="small"}
::

::alert{type="success"}
#title
值得买
#default
20 小时以内打完，节奏紧凑，DLC 不必补。
::

## 玩法

正文。

## 剧情

::spoiler{label="⚠ 剧情剧透" clickText="点击查看结局"}
剧透内容。
::

## 优缺点

用表格，不用 alert 堆叠：

| 优点 | 缺点 |
| --- | --- |
| ... | ... |
```

**组件取舍**

- 评分最多 4 行（综合 + 三个分项），再多就该换表格。`rating` 按 0.5 取整，写 `4.3` 实际显示 4.5。
- 剧情、结局、关键反转一律进 `spoiler`，不要在正文里「暗示结局」。
- 结论用一条 `alert{type="success"|"warning"}`；「不推荐」用 `warning`，「推荐」用 `success`，别用 `error`（error 是给故障提示的）。
- 游戏截图优先 `image-enhanced`，带 `caption`；对比不同画质设置再用 `image-comparison`。

---

## 三、踩坑记录 / 故障复盘

读者目标：认出同样的现象，找到根因，避免重犯。这类文章最有价值的组件是 `collapse` 和 `tabs`（复现路径）。

```markdown
## 现象

具体错误信息，用围栏贴原文。

```text
415 Unsupported Media Type
```

::alert{type="error"}
#title
影响范围
#default
后台所有 DELETE 操作全部失败，`api.del` 与无参 `api.post` 首当其冲。
::

## 根因

先说结论，再给证据链。证据指向具体文件行时用行内代码标出，例如
`nuxt-admin/server/utils/assertSafeMutation.ts` 里的 `hasRequestBody()`。

## 修复

```diff
- if (getHeader(event, 'content-type') !== 'application/json') throw createError({statusCode: 415})
+ if (hasRequestBody(event) && getHeader(event, 'content-type') !== 'application/json') throw createError({statusCode: 415})
```

::collapse{title="完整上下文"}
...
::

## 验证

::tabs
---
labels: ["回归命令", "线上确认"]
---
#tab-0
```bash
curl -X DELETE -H "Cookie: ..." https://wasd09090030.top/admin/api/articles/1 -i
```
#tab-1
后台逐项点删，确认返回 204 而不是 415。
::

::alert{type="info"}
#title
同源校验也有类似陷阱
#default
Origin 校验必须用 `runtime.request.url` 判断，硬编码 env 会让 www/blog 入口全 403。
::
```

**组件取舍**

- `alert{type="error"}` 只描述**故障本身**，不写建议；建议放在文末。
- 修复前后的对比用 diff 围栏，比一段解释有效得多。
- 文末留一条 `alert{type="info"}` 指向同类陷阱 —— 复盘文章的价值在于把「下一次」也挡住。

---

## 四、更新日志 / 版本记录

读者目标：快速扫过知道自己要不要留意。

```markdown
## 本次更新

- 展柜改为预览模式
- 新增评分 / 时长 / 愿望单详情页

::alert{type="warning"}
#title
需要手动操作
#default
本次改了 D1 结构，发布前先跑 `npm run db:migrate:remote`。
::

::collapse{title="完整变更清单"}
- ...
- ...
::

## 破坏性变更

没有就删掉这一节。有就用表格：影响项 / 旧行为 / 新行为 / 处理方式。
```

这类文章不要用 `star-rating`、`type-writer`、`spoiler`，也不要用 `steps` —— 读者不是来跟着做的。

---

## 通用排版原则

1. **一个组件解决一个信息问题**，不要把 alert 当装饰。连续两个以上同类 alert 说明应该改成小标题或列表。
2. **主线用普通段落和列表**，组件负责「分支」：要展开的细节（collapse）、要对比的方案（tabs）、要警告的风险（alert）、要遮住的内容（spoiler）。
3. **块组件之间留空行**，Markdown 解析对紧邻的块更脆弱，空行是免费的保险。
4. **标题层级从 `##` 开始**，最深用到 `####`。h5/h6 不生成锚点，也不进 TOC。
5. **代码一定要用围栏**，不仅为了高亮 —— `code-playground` 和 `type-writer` 读的是解析后的文本，裸写 `*` 和 `_` 会被当成强调语法。
