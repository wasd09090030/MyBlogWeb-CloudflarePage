# nav-ai.cn 文章页排版设计参考

> **文档性质**：外部参考站点排版拆解。目标是为 `nuxt-public` 文章页的排版（字体、字号、行高、段间距、标题层级）提供可落地的数值参考。
>
> **来源页面**：<https://nav-ai.cn/astrbot-zero-code-wechat-qq-ai-bot/>
> **来源主题**：WordPress `onenav`（v5.56），样式文件 `assets/css/main.min.css`
> **抓取日期**：2026-08-07
> **抓取方式**：`curl` 拉取 HTML + `main.min.css`，解析 `.panel-body`、`.card`、`.h3` 等选择器的计算样式

---

## 一、整体版式

该站是 WordPress `onenav` 主题的默认文章页，采用**「单栏正文 + 右侧边栏」**布局：

| 项目 | 值 | 说明 |
| --- | --- | --- |
| 页面最大宽度 | `--main-max-width: 1260px` | 整个内容区上限 |
| 文章卡片宽度 | `max-width: 1200px` | 正文卡片比页面略窄 |
| 卡片圆角 | `--main-radius: 12px` | 卡片四角 |
| 卡片阴影 | `0 5px 20px var(--main-shadow)` | 轻悬浮阴影（阴影色 `rgba(0,0,0,.1)`） |
| 卡片内边距 | `padding: 0 20px 20px`（`card-body`） | 左右 20px，下 20px |
| 卡片背景 | `--main-bg-color`（浅色模式 `#fff`，深色模式 `#2D2E2F`） | 跟随主题切换 |
| 正文文字色 | `--main-color: #484b4f` | 近黑灰，非纯黑，降低对比刺眼感 |

设计基调：**内容卡片悬浮式** —— 正文装在一张浅色卡片里，浮在页面背景上，与侧边栏并列。

---

## 二、字体

```css
body {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
}
```

- **无自定义 web 字体**，全部走系统字体栈。中文由系统渲染（Windows 默认为微软雅黑），不额外加载字体文件，首屏更快。
- 正文颜色不是纯黑，而是 `#484b4f`，长时间阅读更柔和。

---

## 三、正文排版（核心）

这是整个页面最值得借鉴的部分 —— **一行 CSS 同时定义了字号、行高和段间距**：

```css
.panel-body p, .site-content p {
  margin-bottom: 1.25rem; /* 段间距 20px */
  font-size: 1rem;        /* 字号 16px */
  line-height: 2;         /* 行高 = 字号 × 2 = 32px */
  word-wrap: break-word;
}
```

| 参数 | 值 | 换算（基准 16px） |
| --- | --- | --- |
| 正文字号 | `1rem` | **16px**，各断点一致，无响应式缩放 |
| 行高 | `2` | **32px**，极为宽松 |
| 段间距 | `1.25rem` | **20px** |

**关键特征**：行距（32px）与段间距（20px）接近 1:1.6 的节奏，段与段之间有清晰分界，但又不靠空一整行来分隔。整段阅读时行与行松而不散，是页面显得「疏朗清爽」的主因。

---

## 四、标题体系

文章标题使用 `<h1 class="h3 mb-3">`，即**标题尺寸由 `.h3` 类控制**，带响应式切换：

```css
/* 桌面端 ≥768px */
@media screen and (min-width: 768px) {
  .h3 { font-size: 1.525rem; }  /* 文章标题 24.4px */
}
/* 默认（移动端） */
.h3 { font-size: 1.25rem; }     /* 文章标题 20px */
```

正文内的章节标题由 `.panel-body h*` 规则控制：

| 元素 | 字号 | 视觉特征 |
| --- | --- | --- |
| h2（章节标题） | `1.25rem` = **20px** | 左侧 3px 主题色竖条（高 0.9em） |
| h3 | `1.125rem` = **18px** | 左侧 3px 主题色竖条（高 0.8em） |
| h4 | `1rem` = **16px** | 下边框线 + 左侧 2em 短横线（主题色） |
| h5 / h6 | `1rem` = 16px | 无装饰 |
| 所有标题下边距 | `margin-bottom: 1rem` = **16px** | — |

h2/h3 左侧竖条样式：

```css
.panel-body h2:not(.item-title)::before,
.panel-body h3:not(.item-title)::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 0.8em;
  background: var(--theme-color);
  border-radius: 2px;
  margin-right: 5px;
  vertical-align: -0.1em;
}
.panel-body h2:not(.item-title)::before {
  width: 3px;
  height: 0.9em;
  margin-right: 8px;
  box-shadow: 1px 2px 3px var(--theme-color);
}
```

**核心思想**：标题不靠大字号刷存在感 —— **h2 只比正文大 4px**（20 vs 16），层级靠「左侧主题色竖条 + 加粗」区分，而非巨大字号差。整个标题体系非常收敛、统一。

---

## 五、列表、引用、代码、图片

```css
/* 列表比正文小一号 */
.panel-body ul, .panel-body ol { font-size: .875rem; }          /* 14px */
.panel-body ul li, .panel-body ol li { margin: .5rem 0; }       /* 项间 8px */

/* 引用块 */
blockquote {
  position: relative;
  padding: .9375rem 0 .9375rem 1.75rem;  /* 上下 15px，左 28px */
  margin: 1.5rem 0;                       /* 上下 24px */
  border-left: 5px solid rgba(136,136,136,.2);
  background-color: rgba(136,136,136,.1);
  border-radius: var(--theme-border-radius-lg);
}
blockquote p:last-of-type { margin: 0; padding: 0; }

/* 行内代码 */
code {
  color: var(--theme-color);
  background: var(--muted-bg-a-color);
  border-radius: 3px;
  font-size: 0.9em;
  padding: 0.1em 0;
  margin: 0 2px;
  line-height: 1;
  vertical-align: 0.05em;
}

/* 图片 */
.panel-body img { max-width: 100%; height: auto; }
```

| 元素 | 字号 | 间距 | 视觉特征 |
| --- | --- | --- | --- |
| ul / ol | 14px（比正文小） | 项间上下 8px | 形成第三个层级阶梯 |
| blockquote | 继承正文 | 上下 24px | 左 5px 灰竖线 + 浅灰底 |
| code | 0.9em（≈14.4px） | — | 主题色文字 + 浅底 + 小圆角 |

---

## 六、可借鉴要点（落地建议）

如果要把这套排版落到 `nuxt-public` 文章页，核心是这 5 条：

1. **正文 = 16px / 行高 2 / 段间距 20px**。一行声明，无需额外组件；「行距 ≈ 段距」的组合是疏朗感来源。
2. **标题不靠字号分级，靠装饰与加粗**。h2 = 20px 只比正文大 4px，加左侧主题色 3px 竖条。
3. **文章标题 24px（移动端 20px）**，与章节标题（20px）层级差小，整体统一。
4. **列表比正文小一号（14px）**，形成字号三级阶梯：正文 16 → 列表 14 → 说明/辅助 12。
5. **无自定义字体、无超大字号**。呼吸感来自行高 2 的留白，而非字号放大。

---

## 七、原始 CSS 出处（便于追溯）

关键选择器与来源文件：

| 规则 | 来源文件 | 备注 |
| --- | --- | --- |
| `body { font-family }` | `main.min.css` | 全局字体栈 |
| `.panel-body p, .site-content p` | `main.min.css` | 正文核心排版 |
| `.panel-body h1~h6` | `main.min.css` | 章节标题与装饰 |
| `.card { max-width: 1200px }` | `main.min.css` | 卡片容器 |
| `--main-max-width: 1260px` | HTML `:root` 内联 | 页面宽度上限 |
| `.h3 { font-size }` | `main.min.css` + `@media` | 文章标题响应式 |

> 注意：该站正文内的实际标题字号取的是 `.h3` 类（文章标题）与 `.panel-body h2~h6`（章节标题），两者体系独立，落地时需分别对应到 Nuxt 的文章标题组件与 Markdown 渲染的标题标签。
