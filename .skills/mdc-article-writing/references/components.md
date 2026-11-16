# MDC 组件完整参考

> 快照来源：`nuxt-public/app/components/content/*.vue` 的 `defineProps`。组件改动后以源码为准。
> 所有组件的根元素都带 `*-mdc` 类，样式由 `shared/article-typography/mdc-contract.*.css` 统一接管。

目录

- [alert](#alert)
- [tabs](#tabs)
- [collapse](#collapse)
- [spoiler](#spoiler)
- [steps](#steps)
- [code-playground](#code-playground)
- [image-enhanced](#image-enhanced)
- [image-comparison](#image-comparison)
- [star-rating](#star-rating)
- [github-card](#github-card)
- [link-card](#link-card)
- [type-writer](#type-writer)
- [web-embed](#web-embed)

---

## alert

四种语义色的提示框。左侧 3px 色条 + 图标，颜色取文章主题 token。

**Props**

| 名称 | 类型 | 默认 | 取值 |
| --- | --- | --- | --- |
| `type` | String | `info` | `info` \| `success` | `warning` | `error` |

注意：`type` 有 validator，且组件内部直接用 `alertConfig[type].icon` 取值 —— 写 `danger`、`tip`、`note` 会让取值变成 `undefined` 并在渲染时抛错，整篇文章可能白屏。只用那四个值。

**槽位**：`#title`（可选，`<h4>` 渲染）、默认槽（正文）。

**最小用法**

```markdown
::alert{type="info"}
正文内容。
::
```

**完整用法**

```markdown
::alert{type="warning"}
#title
D1 写额度
#default
单轮同步最多 40 次上游请求，库内只写发生变化的行。
::
```

**何时用**：结论前置、踩坑警告、版本兼容说明。不要连续三段以上的 alert —— 提示框多了会失去强调作用，改用小标题组织。

---

## tabs

多方案并列。**必须用 YAML 提供 `labels`**，每个标签的内容放在 `#tab-<索引>` 槽里，索引从 0 开始。

**Props**

| 名称 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `labels` | Array | `['Tab 1','Tab 2','Tab 3']` | 标签文字数组，长度决定标签数 |

**槽位**：`#tab-0`、`#tab-1`、`#tab-2`…… 由 `labels` 长度推导，**没有默认槽**。

**最小用法**

```markdown
::tabs
---
labels: ["pnpm", "npm"]
---
#tab-0
```bash
pnpm add -D wrangler
```
#tab-1
```bash
npm install -D wrangler
```
::
```

**注意**

- `labels` 有 3 个就写 3 个槽，漏写的标签点开是空白。
- 标签头在大屏是横排按钮，宽度不够时 `overflow-x: auto` 横向滚动；标签文字别超过 6 个字，否则移动端要滑。
- 键盘支持 `←` `→` `Home` `End`。
- **panel 里可以嵌套块组件**（`Tabs.vue` 用 `<slot :name="tab.slot" />` 渲染，子组件能正常挂载），但内层必须**多一个冒号**：外层 `::tabs` 配 `::`，内层 `:::link-card` 配 `:::`。这是数冒号最容易出错的地方 —— 写完一定要跑 `check-mdc.mjs`。不嵌套的另一个理由是 `star-rating` 这类需要读者逐个点开才看全的内容不该进标签页（见 `patterns.md` 的组合禁忌），那是内容取舍，不是技术限制。

---

## collapse

可折叠的补充内容，基于原生 `<details>`。收起来时只露标题行。

**Props**

| 名称 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `title` | String | `点击展开` | 标题行文字 |
| `defaultOpen` | Boolean | `false` | 是否默认展开（布尔 prop 直接写名字即可） |

**槽位**：`#title`（覆盖 `title` prop，可写 Markdown）、默认槽。

**最小用法**

```markdown
::collapse{title="展开查看完整配置"}
补充内容放在这里，可以是任意 Markdown。
::
```

**默认展开**

```markdown
::collapse{title="排错步骤" defaultOpen}
1. 先看 `wrangler tail`
2. 再查 D1 迁移是否执行
::
```

**何时用**：长代码、完整配置清单、排错步骤、可跳过的背景知识。正文主线不该被大段细节打断时，都放进 collapse。

---

## spoiler

剧透遮罩。未展开时内容加 blur 遮罩，点警告条或遮罩展开。

**Props**

| 名称 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `label` | String | `⚠ 剧透警告` | 顶部警告条文字 |
| `clickText` | String | `点击展示剧透内容` | 遮罩中央提示文字 |
| `open` | Boolean | `false` | 是否默认展开 |

**槽位**：仅默认槽。

```markdown
::spoiler{label="⚠ 剧情剧透" clickText="点击查看结局"}
主角最终**活了下来**。
::
```

**何时用**：游戏剧情、结局、关键反转。技术文章里用 `collapse` 而不是 spoiler —— spoiler 是给「不该被误读到的内容」用的，不是给「太长了收起来」用的。

---

## steps

分步流程条。渲染成 Nuxt UI 的 `UStepper`；移动端自动转竖排。

**Props**

| 名称 | 类型 | 默认 | 取值 |
| --- | --- | --- | --- |
| `current` | Number \| String | `1` | 当前步骤，**1-based** |
| `status` | String | `process` | `process` \| `finish` \| `error` \| `wait`（保留字段，实际颜色由 `current` 决定） |
| `vertical` | Boolean | `false` | 强制竖排 |
| `size` | String | `medium` | `small` \| `medium` |
| `steps` | Array | `[]` | 步骤数组，**必须走 YAML** |
| `showControls` | Boolean | `false` | 显示「上一步 / 下一步」按钮 |
| `clickable` | Boolean | `false` | 允许点步骤跳转 |

**槽位**：无。内容全部来自 YAML。

```markdown
::steps{current="2" showControls}
---
steps:
  - title: "应用 D1 迁移"
    description: "npm run db:migrate:remote"
  - title: "部署 blog-api"
    description: "npm run deploy:api"
  - title: "部署 router"
    description: "npx wrangler deploy"
---
::
```

**注意**

- `current` 是 1-based（延续旧 NaiveUI 语义），别按 0 开始写。
- `steps` 为空时 `UStepper` 拿到空数组，外观退化成一条空进度条 —— 一定要确认 YAML 被正确解析（`---` 前后各占一行）。
- 步骤标题保持动词短语，描述放具体命令或判据。

---

## code-playground

带标题栏、复制按钮的高亮代码框；`runnable` 时额外出现运行按钮，JS 在 Worker 沙箱里跑（5 秒超时）。

**Props**

| 名称 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `lang` | String | `javascript` | Shiki 语言 id |
| `title` | String | `Code Playground` | 标题栏文字 |
| `runnable` | Boolean | `false` | 仅 `javascript` / `js` / `node` 生效 |

**槽位**：默认槽，内容会被当成 Markdown 解析后再取 `textContent`。

**推荐写法 —— 用围栏包住代码**

````markdown
::code-playground{lang="typescript" title="类型守卫"}
```typescript
function isString(value: unknown): value is string {
  return typeof value === 'string'
}
```
::
````

围栏本身不会显示（组件读的是文本内容），但能保护 `*`、`_`、`[`、`<` 这些 Markdown 元字符。`lang` 要和围栏语言一致，否则高亮和标签对不上。

**可运行示例**

````markdown
::code-playground{lang="javascript" title="数组去重" runnable}
```javascript
const unique = [...new Set([1, 2, 2, 3, 3, 3])]
console.log(unique)
```
::
````

**注意**

- 沙箱里只有注入的 `console`，没有 `document`、`window`、`fetch`，也没有 `await` 顶层支持 —— 示例要自包含且同步。
- 高亮走 Shiki，主题固定 `material-theme-darker`，与站点的其他代码块主题一致。
- 只需要展示、不需要运行的代码用普通围栏就够，不必套 `code-playground`。

---

## image-enhanced

带说明文字、可选点击放大的插图。**正文配图的默认选择**。

**Props**

| 名称 | 类型 | 默认 | 取值 |
| --- | --- | --- | --- |
| `src` | String | 必填 | 图片地址 |
| `alt` | String | `''` | 替代文本 |
| `title` | String | `''` | 悬停提示 |
| `caption` | String | `''` | 图注，渲染在图片下方 |
| `width` | String \| Number | `100%` | 图片宽度 |
| `height` | String \| Number | `auto` | 高度 |
| `align` | String | `center` | `left` \| `center` \| `right` |
| `shadow` | Boolean | `false` | 阴影 |
| `border` | Boolean | `false` | 边框 |
| `rounded` | Boolean | `false` | 圆角 |
| `zoomable` | Boolean | `true` | 点击打开灯箱 |
| `lazy` | Boolean | `true` | 懒加载 |

**槽位**：无。

```markdown
::image-enhanced{src="https://cfimg.wasd09090030.top/xxx.webp" alt="D1 控制台" caption="图 1：D1 迁移执行结果" border rounded}
::
```

**注意**

- 图片二进制走独立图床 `cfimg.wasd09090030.top`，`blog-api` 没有 R2 —— 不要写本地 `/images/` 路径，除非确认该路径由图床服务。
- `zoomable` 默认开，灯箱支持 `Esc` 关闭并有焦点管理；纯装饰图可以关掉。
- 灯箱和 blur 遮罩都依赖客户端，SSG 产物静态 HTML 里只有 `<img>`，不影响 SEO。

---

## image-comparison

前后对比滑块，可拖拽或用方向键移动分割线。

**Props**

| 名称 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `before` | String | — | 「之前」图 URL |
| `after` | String | — | 「之后」图 URL |
| `aspectRatio` | String | `16/9` | 容器宽高比 |
| `showLabels` | Boolean | `true` | 显示 Before/After 标签 |
| `beforeLabel` | String | `Before` | 左侧标签文字 |
| `afterLabel` | String | `After` | 右侧标签文字 |

**槽位**：`#before`、`#after`（两个 slot 都写了会覆盖对应 prop）。

```markdown
::image-comparison{before="/img/old.png" after="/img/new.png" beforeLabel="改版前" afterLabel="改版后"}
::
```

或：

```markdown
::image-comparison{aspectRatio="4/3"}
#before
![](/img/old.png)
#after
![](/img/new.png)
::
```

**注意**：两张图必须**同尺寸同比例**，否则拖动时对不齐。`aspectRatio` 要和图片实际比例一致，不然会裁切。

---

## star-rating

星级评分，支持 0.5 步进填充。默认只读（展示用）。

**Props**

| 名称 | 类型 | 默认 | 取值 |
| --- | --- | --- | --- |
| `rating` | Number \| String | `0` | 评分，0.5 步进，上限 `maxStars` |
| `maxStars` | Number \| String | `5` | 星数，内部上限 10 |
| `size` | String | `medium` | `small` \| `medium` \| `large` |
| `readonly` | Boolean | `true` | `false` 时可点击交互 |
| `showScore` | Boolean | `true` | 显示 `4.5 / 5` 数字 |
| `label` | String | `''` | 星级前的说明文字 |

**槽位**：无。

```markdown
::star-rating{rating="4.5" maxStars="5" label="综合评分" showScore}
::
```

**注意**

- `rating` 超出范围会被夹到 `[0, maxStars]`，不会报错但也不提示 —— 写错了看不出来。
- 写 `4.7` 会被取整到 `4.5`（`Math.round(x*2)/2`）。想表达 4.7 就直接标 4.5，或者关掉 `showScore` 只用星。
- 游戏评测里成组的评分建议用 `tabs` 或表格编排，不要在一段里堆五行 star-rating。

---

## github-card

GitHub 仓库卡片，**运行时**向 GitHub API 取 star / fork / issue 数和主语言。

**Props**

| 名称 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `repo` | String | 必填 | `owner/repo` 格式 |

**槽位**：无。

```markdown
::github-card{repo="nuxt/nuxt"}
::
```

**注意**

- 取数发生在浏览器，未认证请求有 GitHub 的 60 次/小时 IP 限额。文章里放太多卡片会互相拖累，一篇最多两张。
- 加载时显示骨架屏，失败时显示错误条 —— 卡片不是静态快照，star 数每次访问都变。
- SSG 首次渲染只有骨架屏，LCP 不算它；但离线或 GitHub 不可达时卡片会长期停在错误态。

---

## link-card

单个外链的按钮样式卡片。

**Props**

| 名称 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `url` | String | 必填 | 链接地址 |
| `text` | String | 必填 | 按钮文字 |
| `icon` | String | `fa6-solid:cloud-arrow-down` | Iconify 图标名 |

**槽位**：无。

```markdown
::link-card{url="https://developers.cloudflare.com/d1/" text="D1 官方文档" icon="fa6-solid:database"}
::
```

**注意**：默认图标属于 `fa6-solid` 集合。`nuxt.config.ts` 的 `icon.serverBundle.collections` 白名单是 `heroicons`、`mdi`、`ph`、`game-icons`、`simple-icons` —— 不在白名单的集合在静态产物里会退化成运行时向 api.iconify.design 拉取。想稳妥就用 `mdi:` 或 `heroicons:` 前缀的图标。

---

## type-writer

打字机动画文字。标题区或开场白装饰用。

**Props**

| 名称 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `text` | String | `''` | 要输出的文字，优先于槽内容 |
| `speed` | Number \| String | `60` | 每字间隔（ms） |
| `cursor` | Boolean | `true` | 显示光标 |
| `loop` | Boolean | `false` | 打完后循环重播 |
| `delay` | Number \| String | `0` | 开始前等待（ms） |

**槽位**：默认槽（无 `text` 时读槽文本）。

```markdown
::type-writer{text="欢迎来到我的博客" speed="60" cursor}
::
```

**注意**

- 槽文本和 `code-playground` 一样先过 Markdown 解析，含 `*`、`_` 时用反引号包住。
- 渲染在 `<span>` 里，是行内元素 —— 放在段落中间，不要单独成段当标题用。
- 动画在客户端跑，SSG 首帧是空文本。用于首屏显眼位置会影响信息立即读取，正文里偶尔点缀即可。
- `loop` 会无限重播，一页最多一个，否则很吵。

---

## web-embed

站外视频 / 在线沙箱嵌入。**有域名白名单**。

**Props**

| 名称 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `url` | String | — | 完整链接，自动识别平台 |
| `platform` | String | — | `bilibili` \| `youtube` \| `codepen` \| `codesandbox` \| `stackblitz` |
| `vid` | String | — | 配合 `platform` 的 id |
| `width` | String | `100%` | 仅在不传 `aspectRatio` 时生效 |
| `height` | String | `500px` | 同上 |
| `aspectRatio` | String | `16/9` | 有默认值，所以 `width`/`height` 实际几乎不生效 |
| `title` | String | — | iframe title（无障碍必填的实际值） |
| `caption` | String | — | 图注 |
| `allow` | String | 见源码 | iframe `allow` 属性 |
| `allowFullscreen` | Boolean | `true` | 允许全屏 |

**允许的域名**：`bilibili.com`、`youtube.com`、`youtu.be`、`codepen.io`、`codesandbox.io`、`stackblitz.com` 及其子域。其余 URL 被静默丢弃，显示「无效的 URL」。

**槽位**：无。

```markdown
::web-embed{url="https://www.bilibili.com/video/BV1xx411c7mD" caption="演示录屏"}
::
```

```markdown
::web-embed{platform="youtube" vid="dQw4w9WgXcQ" title="Reference talk"}
::
```

**注意**

- 想改比例写 `aspectRatio="4/3"` 或 `aspectRatio="1/1"` 都行，CSS `aspect-ratio` 接受这种写法。
- iframe 带 `sandbox="allow-scripts allow-same-origin ..."` —— 白名单外的站点即使绕过 URL 校验也拿不到同源权限。
- 嵌入内容不受明暗主题控制，深色稿里一个白底视频会很突兀，必要时给 `caption` 说明。

---

## 已废弃 / 不可用

| 标签 | 状态 |
| --- | --- |
| `::related-articles` | 组件已从 `app/components/content/` 移到 `app/features/article-detail/components/RelatedArticles.vue`，不在组件自动扫描范围内，MDC 标签渲染不出来。相关推荐现在由 `Content.vue` 在正文下方自动挂载。后台模板里仍残留这一条，别照着写。 |
