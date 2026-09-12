# Task Record: 生产环境性能分析（现状与优化建议）

## Date

- Local date: 2026-09-11 (UTC+8)
- 目标站点: https://wasd09090030.top （Cloudflare Pages + `blog-api` Worker）
- 可视化版本（含瀑布图、体积分布、主线程阶段图）: [`2026-09-11_production-performance-report.html`](./2026-09-11_production-performance-report.html)

## Goal

- 用 Chrome DevTools Protocol（等价于 DevTools Performance 面板）实测**生产环境**当前性能，形成可复核的现状基线。
- 定位关键路径上的具体瓶颈，并给出按收益排序的优化建议。
- **本次只做测量与记录，不修改任何业务代码。**

## 采集方法

自建零依赖 CDP 采集管线（受管 Node 22 + Playwright 自带 Chromium `--headless=new --no-sandbox`）：

- 采集：`Tracing.start/end` + `Performance`/`Network`/`Page`/`Runtime`/`Emulation`，产出完整 trace（`devtools.timeline`、`blink.user_timing`、`disabled-by-default-v8.cpu_profiler`、`loading`、`v8`、`viz` 等分类）。
- 分析：主线程取 `CrRendererMain`；阶段自耗时用嵌套事件自减；长任务 >50 ms；V8 CPU 采样按主进程采样线程归集。
- 终端渲染：`Runtime.evaluate` 读取 LCP / CLS / 长任务 / PerformanceNavigationTiming。

样本与设备档位：

| 样本 | 页面 | 设备档位 |
|---|---|---|
| `home-desktop-cold` | 首页 | 1440×900 DPR1，不限速，冷启动 |
| `home-desktop-warm` | 首页 | 同上，热缓存 |
| `article-desktop-cold` | 文章详情页 `/article/100-adjust-paper-format-with-docx-mcp` | 同上，冷启动 |
| `gallery-desktop-cold` | 画廊页 `/gallery` | 同上，冷启动 |
| `home-mobile-cold` | 首页 | 390×844 DPR3，**CPU 4× 降速 + Slow 4G**（RTT 150 ms / 1.6 Mbps 下行 / 750 Kbps 上行） |

## 现状：核心指标

| 样本 | TTFB | FCP | LCP | TBT | CLS | 长任务 | 传输量 | 阻塞资源 | DOM 节点 |
|---|---|---|---|---|---|---|---|---|---|
| 首页·桌面·冷 | 663 ms | 2664 ms | **5428 ms** | 161 ms | 0.00003 | 2 | 1142 KB | **8** | 475 |
| 首页·桌面·热 | 1415 ms | 3160 ms | **5708 ms** | 162 ms | 0.00002 | 2 | 1141 KB | **8** | 475 |
| 文章详情·桌面·冷 | 932 ms | 2524 ms | **7340 ms** | 74 ms | **0.0788** | 3 | 821 KB | 7 | 498 |
| 画廊·桌面·冷 | 1077 ms | 1896 ms | — | 19 ms | 0.00016 | 1 | 692 KB | 5 | 937 |
| 首页·移动·冷 | 624 ms | 4532 ms | **10200 ms** | **1207 ms** | 0.00008 | **8** | 1193 KB | **8** | 469 |

结论概要：

- **桌面端 LCP 5428–7340 ms、移动端 10200 ms，均未达「良好」（≤2500 ms）**，甚至在移动端未达「需改进」（≤4000 ms）。
- **TTFB 663 ms（桌面）vs 624 ms（移动）几乎一致** → 与设备无关，是网络/边缘路径成本，不是前端问题。
- **TBT 桌面 161 ms 尚可，移动端 1207 ms 明显超标**。
- **文章页 CLS 0.0788**，接近但是尚未超过 0.1 的「需改进」阈值。

## 现状：主线程画像

各样本主线程阶段自耗时（ms）：

| 样本 | Scripting | Style | Layout | Painting | Compositing | Other | ParseHTML | 观测窗口 / 忙占比 |
|---|---|---|---|---|---|---|---|---|
| 首页·桌面 | 56.3 | 207.1 | 270.9 | 178.8 | 142.5 | 48.7 | 5.6 | 8008 ms / **14 %** |
| 文章·桌面 | 217.2 | 217.9 | 290.6 | 132.7 | 158.0 | 42.3 | 4.0 | 11515 ms / 11.4 % |
| 画廊·桌面 | 111.1 | 144.0 | 88.2 | 73.3 | 103.9 | 42.2 | 2.4 | 6768 ms / 10.3 % |
| 首页·移动 | 260.9 | **818.6** | **598.8** | **847.9** | 553.5 | 186.4 | 31.2 | 12623 ms / **35.5 %** |

**关键判断：这不是一个「JS 太慢」的站点。** 桌面首页 Scripting 自耗时仅 56 ms；V8 采样中 `/_nuxt/` 下所有代码合计约 116 ms（最大单文件 `D2mlwmgT.js` 116.7 ms）。移动端瓶颈在 **Style + Layout + Paint 合计约 2.27 s**，指向 CSS 选择器面、DOM 规模与图片解码/绘制，而非脚本执行。

> 采样口径说明：V8 CPU profile 的 `(garbage collector)` / `(program)` 是 V8 根桶，包含线程空闲时间，**不可直接解读为 GC 耗时**。本报告的耗时结论基于阶段自耗时与长任务事件。

移动端 8 个长任务（>50 ms）：

| 起点 | 时长 | 主要构成 |
|---|---|---|
| t+3431 ms | 596 ms | `ProxyMain::BeginMainFrame` 591 |
| t+5397 ms | 75 ms | `ProxyMain::BeginMainFrame` 75 |
| t+8164 ms | 131 ms | `v8.evaluateModule` 109 + 15 |
| t+8846 ms | 177 ms | `v8.callFunction` 5/4 + `evaluateModule` 3 |
| t+9324 ms | 351 ms | `MinorGC` 3/3（其余为模块求值） |
| t+9876 ms | **120 ms** | `UpdateLayoutTree` + 模块求值（紧接 `/api/articles` 返回） |
| t+9996 ms | 81 ms | `ProxyMain::BeginMainFrame` 80 |
| t+10447 ms | 87 ms | `ProxyMain::BeginMainFrame` 86 |

移动端 `domInteractive` 在 t+4073 ms，但 `DOMContentLoaded` 被推迟到 **t+8290 ms**、`load` 在 t+8292 ms。

## 关键发现（按影响排序）

### F1 —【最严重】文章详情页封面图走 302 跳向 630 KB 原图，单张图决定整页 LCP

文章页的 LCP 元素是封面图 `IMG.w-full.h-full`（面积 470400 px²），HTML 中直接写死：

```html
<img src="/images/i_tvrehtqGZco89Q6Q" alt="…"
     class="w-full h-full object-cover"
     loading="eager" decoding="async" fetchpriority="high">
```

实测该 URL 的实际行为：

```
GET /images/i_tvrehtqGZco89Q6Q
→ 302 Location: https://cfimg.wasd09090030.top/file/gallery/1778772287719_20260102_225334.webp
→ 200  Content-Length: 645236 (630 KB)  image/webp
```

- 意味着**一次额外跳转 + 一次到图片域的 TLS 握手**（实测该次 `tls=0.94 s`），最终下载一张**未按展示尺寸裁剪的原图**。
- 同一资源的缩略图变体 `/images/thumb/card/i_tvrehtqGZco89Q6Q.webp` 只有 **50 KB**，且直出 200、无跳转 —— **体积相差约 12.9 倍**。
- 轨迹中该请求 t+951 ms 发起、耗时 **6.35 s** 才结束；LCP 记录 `loadTime 7304 ms` / `renderTime 7340 ms`，与页面 `load` 事件（7304 ms）几乎同时。**整页 LCP 与 load 都在等这一张图。**

**代码层根因**（`nuxt-public/app/features/article-detail/components/CoverImage.vue:42-47`）：

```js
const coverImageUrl = computed(() => {
  const native = props.article?.coverImageUrl      // "/images/i_tvrehtqGZco89Q6Q" → 302 → 630 KB
  const thumbnailUrl = props.article?.thumbnailUrl // "/images/thumb/card/…webp" → 49 KB，直出
  const coverImage = props.article?.coverImage
  return native || thumbnailUrl || (coverImage && coverImage !== 'null' ? coverImage : '')
  //     ^^^^^^ 「原生大图」永远压过「缩略图」
})
```

API 返回的字段确实同时提供两者（`coverImageUrl=/images/i_tvrehtqGZco89Q6Q`、`thumbnailUrl=/images/thumb/card/i_tvrehtqGZco89Q6Q.webp`），所以这不是数据缺失，而是**取值优先级错误 + 缺少按展示尺寸的变体**。

### F2 — LCP 底图「图片已就绪」与「实际绘制」之间存在 2711 ms（桌面）/ 4955 ms（移动）空窗

首页 LCP 元素是 CSS `mask` 元素 `DIV.hero-girl`，其底图 `girl-full-silhouette.webp` **只被 CSS 的 `mask-image` 引用**（生产 HTML 中该文件名出现次数为 **0**）。trace 中 LCP 候选的完整时序：

| 阶段 | 桌面 | 移动 |
|---|---|---|
| `imageDiscoveryTime`（浏览器发现图片） | **1838 ms** | **3461 ms** |
| `imageLoadStart` | 2018 ms | 3462 ms |
| `imageLoadEnd` / `loadTime` | 2717 ms | 5245 ms |
| `renderTime`（实际计入 LCP 的绘制） | **5428 ms** | **10196 ms** |

对照同页一个**普通 `<img>`**（`loading.gif`）的对应值 `866 → 2252 → 2777`，即普通图片在加载完成后约 **528 ms** 内就完成绘制，而 `.hero-girl` 要多等 **2711 / 4955 ms**。

相关 CSS（`nuxt-public/app/assets/css/components/WelcomeSection.desktop.css:52-69`）：

```css
.hero-girl {
  -webkit-mask-image: url('/hero/girl-full-silhouette.webp');
  mask-image: url('/hero/girl-full-silhouette.webp');
  aspect-ratio: 1365 / 1617;
  will-change: transform;
  animation: hero-girl-float 8s ease-in-out infinite;
}
```

**两个问题叠在一起**：① 因只被 CSS 引用，浏览器要到 CSS 解析后才「发现」它；② 该元素带 `will-change: transform` + 无限动画（合成层），其绘制疑似被推迟到后续某次主线程重绘帧。第②点的机制**本次未能确证，列为待复测项**。

该图本身仅 16 KB（无损 WebP，mask 只取 alpha 通道）——**这是时机问题，不是体积问题**。

### F3 — 首张 LCP 候选其实是「加载中」占位 GIF；它被写进 HTML 8 次，并被 sitemap 采集成文章配图

首页 LCP 候选顺序是**先占位图、后 hero 剪影**：

| 候选 | 桌面 | 移动 |
|---|---|---|
| `Picture/loading.gif` | t+2777 ms，面积 20033 px² | t+6496 ms，面积 14266 px² |
| `.hero-girl` | t+5427 ms | t+10196 ms |

即 **hero 剪影绘制出来之前，页面献给 LCP 的最大内容块是一个 57.8 KB 的占位动图**。

- `/Picture/loading.gif` 实测 **59,208 字节**，`Cache-Control: public, max-age=31536000, immutable`。
- 移动端 Slow 4G 下该请求耗时 **5.59 s**，是整页最慢的单个请求。
- 首页 HTML 中该 `<img>` 标签出现 **8 次**（浏览器会去重，只发 1 个请求，但会绘制 8 次）。
- 组件 `nuxt-public/app/shared/ui/ImageLoadingPlaceholder.vue:10-16` 在 `show`（默认 `true`）时直接渲染 `<img src="/Picture/loading.gif">`，因此被 **SSR 进页面 HTML**。

**连带 SEO 缺陷**：`sitemap.xml`（31,742 B）共有 **312 条 `image:loc`，其中 74 条指向 `/Picture/loading.gif`**。搜索引擎会把这些页面的代表性图片认成「加载中」动图。根因同上：占位图在构建期被写进了预渲染 HTML，被 `@nuxtjs/seo` 的图片发现机制采集。

### F4 — 8 个渲染阻塞 CSS 串在关键路径上（共 57 KB），其中多个与首页首屏无关

首页 `<head>` 中的阻塞样式（实测 `renderBlockingStatus=blocking`）：

```
entry.B1P0OSUR.css               37,341 B
vendor-katex.Dn67XXJ1.css         7,916 B   ← 仅文章公式需要
default.CTsR2ryP.css              2,390 B
index.CaJfzrfq.css                3,383 B
HomeWelcomeSection.Dnw1vJve.css   2,398 B
ImageLoadingPlaceholder.*.css       227 B
SearchBar.BnUd7MYy.css              892 B
SideBar.DFxdOTzK.css              4,171 B
────────────────────────────────────────
合计 8 个，58,718 B
```

- 桌面端它们几乎同时发起（t+669 ms），每个耗时 603–1154 ms 才完成，把首次渲染推到 2664 ms。
- 移动端 Slow 4G 下**单文件耗时 1.94–2.74 s**。
- `vendor-katex` 由 `nuxt.config.ts` 的 `manualChunks` 显式切出（`node_modules/katex`），但**仍被无条件挂在全局入口的阻塞路径上**，即使首页没有任何公式。
- `SideBar` / `SearchBar` / `ImageLoadingPlaceholder` 也都是非首屏或不关键部件的样式。
- 8 个文件同时意味着 **8 次额外往返**。

### F5 — 大 JS chunk 没做 `modulepreload`，被排到 CSS 之后才开始下载

- 首页 JS 编码体积合计 **573.4 KB（587,153 字节，32 个文件）**，前三名：`D2mlwmgT.js` **226.6 KB**、`B1PWenEp.js` **184.9 KB**、`BmQ9923M.js` **77.7 KB**。
- 首屏 HTML 里只有一个 module 入口 `/_nuxt/D7rAhObJ.js`（26.3 KB，与 CSS 同期在 t+670 ms 发起）；但上述三个大 chunk 直到 **t+2026 ms（桌面）/ t+4074 ms（移动）** 才开始下载，**即 CSS 全部下载完之后**；移动端每个大 chunk 下载 1.1–1.5 s。
- 生产 HTML 中 **`modulepreload` 数量为 0**，唯一的 `preload` 是 `/_payload.json` —— 大 chunk 的发现完全依赖运行时模块图求值。
- **根因在配置**：`nuxt-public/nuxt.config.ts` 中

  ```ts
  vitalizer: {
    disablePrefetchLinks: 'dynamicImports',
    disablePreloadLinks: true,   // ← 关闭了 modulepreload 注入
    disableStylesheets: false,
  }
  ```

  这是为了修正「CSS 排在 JS 之后」而做的取舍，代价是大 chunk 的发现时机被推迟。
- 补充：`D2mlwmgT.js` 未压缩体积实测 782,488 字节（约 764 KB），压缩后 226.6 KB。

### F6 — SSG 站点在首屏运行时请求 `/api/articles`

- `/api/articles?summary=true&page=1&limit=100`：桌面 t+5257 ms 发出、耗时 1100 ms、**43 KB**；移动端 **t+9904 ms** 发出、耗时 1534 ms。
- 该请求在移动端**紧接**一个 t+9876 ms 的 `UpdateLayoutTree` 长任务（120 ms），**存在因果嫌疑**。
- 对一个 `nuxt-public` 这类纯 SSG 站点，这份数据完全可以在构建期注入（`_payload.json` 机制已在用），却发生在运行时。
- 文章页同样存在运行时请求：`/api/articles/featured?limit=4`、`/api/comments/article/100`；且根 `/_payload.json`（6,804 B）在**同一时刻被重复请求了 2 次**，连同各路由 payload 共发出 5 个 `_payload.json` 请求。

### F7 — 关键资源的缓存策略不一致，两个「非哈希 + 首屏必需」的资源反而最短缓存

实测响应头：

| 资源 | 体积 | `Cache-Control` |
|---|---|---|
| `/hero/girl-full-silhouette.webp`（**LCP 底图**） | 16,112 B | `public, max-age=0, must-revalidate` ❌ |
| `/fonts/open-sans-400.woff2` | 18,640 B | `public, max-age=0, must-revalidate` ❌ |
| `/_nuxt/D2mlwmgT.js` | 782,488 B | `public, max-age=31536000, immutable` ✅ |
| `/icon/logo.webp` | 21,282 B | `…, immutable` ✅ |
| `/flower/f01.webp` | 10,464 B | `…, immutable` ✅ |
| `/Picture/loading.gif` | 59,208 B | `…, immutable` ✅ |
| `/images/thumb/card/*.webp` | 50,146 B | `…, immutable` ✅（`cf-cache-status: HIT`） |
| `/images/i_tvrehtqGZco89Q6Q`（封面） | — | `public, max-age=300`（302 本身） |

`/hero/*` 与 `/fonts/*` 是唯二不享受长缓存的首屏资源，**hero 图恰好就是 LCP 底图**，每次访问都要发条件请求 —— 这是可直接消除的一次往返。仓库内没有 `_headers` 文件，推测规则配置在 Cloudflare Pages 项目侧。

### F8 — 文章页 CLS 0.0788 有明确可定位的来源

位移集中在 5 处（合计约 0.053，占总量 68 %；全部 218 条位移中其余均为极小值）：

| 时刻 | 值 | 来源 |
|---|---|---|
| t+6041 ms | 0.01223 | `""`（未归因） |
| **t+7309 ms** | **0.00813** | `DIV, SPAN, SPAN, SPAN, BUTTON` |
| t+7557 ms | 0.01288 | `""` + `BUTTON` |
| t+9057 ms | 0.01250 | `""` |
| t+10608 ms | 0.00767 | `""` |

t+7309 ms 这次与**封面图加载完成时刻（7340 ms）吻合**，根因在 `CoverImage.vue`：

```js
const containerAspectRatio = ref(1.5)                      // 初始固定 3:2
function handleImageLoad(event) {
  const imageRatio = naturalWidth / naturalHeight
  containerAspectRatio.value = Math.max(imageRatio, 1.5)   // ← 图片到达后改写容器比例
}
```

容器**先以 1.5 渲染，收到图片后再改写比例**，高度必然发生变化 → 布局位移。正确做法是在 SSR 阶段就写出真实的 `aspect-ratio` / `width` / `height`。

其余四处来源为空（`""`），发生在水合与异步内容插入之后，需要在真实浏览器里开启 DevTools 的 Layout Shift 区域逐个复现定位。

### F9 — 两个第三方运行时依赖

- `api.iconify.design/lucide.json?icons=copy,hash`：桌面 t+4825 ms 发起的**跨域运行时**图标拉取，移动端耗时 731 ms。等于把首屏图标渲染绑在第三方请求上。
- `static.cloudflareinsights.com/beacon.min.js`：移动端解析执行约 10 ms 主线程时间；另有**每个样本各 7 次 `/cdn-cgi/rum?`（204）** 上报请求。

### F10 — 移动端 35.5 % 主线程忙 ≠ JS 慢

移动端长任务里出现大量 `ProxyMain::BeginMainFrame`（合成/提交阶段），叠加 Style 818.6 / Layout 598.8 / Paint 847.9 ms。指向的方向是：**CSS 选择器与层数、DOM 规模（469–937 节点）、图片解码与大面积重绘**，而不是打包体积或执行逻辑。

## 优化建议（按优先级）

### P0-1 文章封面图改用按展示尺寸的变体（收益最大、改动最小）

- **为什么**：单张 630 KB 原图 + 302 跳转，直接决定文章页 7340 ms 的 LCP 与 7304 ms 的 load。缩略图变体只有 50 KB 且直出，差 12.9 倍。
- **怎么做**：
  1. 改 `CoverImage.vue`：把 `coverImageUrl || thumbnailUrl` 改为优先 `thumbnailUrl`；更稳妥的是新增一个按容器实际宽度（桌面约 1160 px、移动约 390 px）生成的 hero 变体字段。
  2. 用 `<img srcset/sizes>` 提供多档位，让浏览器按 DPR 与视口选择，避免移动端下载桌面尺寸原图。
  3. 若必须使用原图，至少让 `/images/:id` 直接 200 返回（去掉 302），省掉一次跨域 TLS 握手。
- **怎么验证**：封面请求编码体积 ≤100 KB、无 3xx 跳转；文章页 LCP ≤2500 ms（桌面），并复测 CLS。

### P0-2 消除封面图容器比例在 onload 后被改写导致的布局位移

- **为什么**：容器比例在图片到达后由 `1.5` 改写为 `Math.max(imageRatio, 1.5)`，是 t+7309 ms 那次位移的直接来源；文章页 CLS 合计 0.0788。
- **怎么做**：
  1. 在构建期或 API 中提供封面图的 `width` / `height`（或宽高比），SSR 阶段就写出正确的 `aspect-ratio` 与尺寸属性，而不是等 onload 再算。
  2. 若无法预知比例，则固定容器比例（不回写），用 `object-fit: cover` 裁切，避免高度变化。
  3. 对四处 `sources: []` 的位移，用 DevTools Performance 面板开启 Layout Shift 区域逐个定位（水合期插入的区块、按钮、异步内容）。
- **怎么验证**：文章页 CLS ≤0.1，且不再出现 onload 时刻的位移条目。

### P0-3 让 LCP 底图提前可发现，并修正它的缓存策略

- **为什么**：`girl-full-silhouette.webp` 仅由 CSS mask 引用，桌面 t+1838 ms / 移动 t+3461 ms 才被「发现」，LCP 比 FCP 晚 2764 ms（桌面）/ 5668 ms（移动）；且它是站内少数不享受长缓存的静态资源之一。
- **怎么做**：
  1. 在 `<head>` 中加 `<link rel="preload" as="image" href="/hero/girl-full-silhouette.webp">`。
  2. 或改为 `<img>` + `fetchpriority="high"` 参与 LCP 发现机制 —— 同页普通 `<img>` 从发现到绘制只需数百 ms，而当前 mask 元素存在数秒空窗。
  3. 为 `/hero/**` 与 `/fonts/**` 补上 `Cache-Control: public, max-age=31536000, immutable`（文件名带内容哈希或加版本参数），与 `/_nuxt/*` 保持一致。
  4. 保持与 CSS `aspect-ratio: 1365/1617` 的约定一致，避免 mask 缩放位移。
- **怎么验证**：LCP 元素开始时间前移到 FCP 附近；LCP ≤2500 ms（桌面）/ ≤4000 ms（移动）；**复测确认「加载完成 → 绘制」空窗是否随之消失**。

### P0-4 拆出首页关键路径上的非必需阻塞 CSS

- **为什么**：8 个阻塞样式共 57 KB，其中 `vendor-katex`、`SideBar`、`SearchBar`、`ImageLoadingPlaceholder` 与首页首屏无关；它们把 FCP 推到 2664 ms，移动端单文件耗时 2 s 级。
- **怎么做**：
  1. 把 `vendor-katex.css` 从全局入口移除，改为在文章详情页按需引入（或 `media="print" onload` 异步加载）。
  2. `SideBar` / `SearchBar` / `ImageLoadingPlaceholder` 等非首屏组件样式改为路由级或异步加载。
  3. 把首屏必需样式合并为 1–2 个文件，减少往返次数。
- **怎么验证**：重新采集首页 trace，确认 `renderBlockingStatus=blocking` 的请求数从 8 降到 ≤2，FCP ≤1800 ms。

### P1-1 替换 57.8 KB 的 `loading.gif` 占位图（同时修掉 sitemap 污染）

- **为什么**：57.8 KB（59,208 字节）动图仅用于占位，移动端单请求 5.59 s；它是首页第一个 LCP 候选（最大绘制面积）；HTML 中重复 8 次；sitemap 312 条 `image:loc` 中有 74 条指向它。
- **怎么做**：
  1. 改 `ImageLoadingPlaceholder.vue`：用内联 SVG 或纯 CSS 骨架屏替代 `<img src="/Picture/loading.gif">`（额外请求 0 字节）。
  2. 确保占位元素不参与 LCP 判定（避免大尺寸绘制），例如用背景色/渐变而非大图。
  3. 在 sitemap 配置中排除占位图，或改为只用文章 `thumbnailUrl` 作为 `image:loc`。
- **怎么验证**：首屏请求数 −1，移动端最慢资源排名中不再出现该文件；`sitemap.xml` 中不再出现 `loading.gif`。

### P1-2 把首屏文章数据挪到构建期

- **为什么**：SSG 站点在首屏运行时额外请求 43 KB 数据，移动端 t+9904 ms 才发出，并伴随 t+9876 ms 的 120 ms 长任务。
- **怎么做**：用 `useAsyncData` + prerender 产出静态 JSON，让首屏零运行时请求；若非首屏所需，改为进入视口再加载（IntersectionObserver）。同时排查文章页 `/_payload.json` 被请求两次的重复。
- **怎么验证**：首屏不再出现 `/api/articles` 请求；该时刻附近的长任务消失。

### P1-3 为关键 JS chunk 增加 `modulepreload` 并复核拆分

- **为什么**：首页 JS 编码体积 573.4 KB；226.6 KB / 184.9 KB 两个大 chunk 直到 CSS 下载完（t+2026 ms）才发起，`modulepreload` 数为 0，根因是 `vitalizer.disablePreloadLinks: true`。
- **怎么做**：对首屏必需 chunk 注入 `<link rel="modulepreload">`（可保留 vitalizer 对其它链接的处理）；检查 226.6 KB chunk 是否可拆（把编辑器 / KaTeX 等重依赖移出首屏 bundle）；复核 `manualChunks` 的实际拆分结果。
- **怎么验证**：大 chunk 的 `startTime` 前移到 CSS 请求同期；移动端 JS 下载窗口缩短。

### P1-4 降低移动端样式与布局成本

- **为什么**：移动端 Style 818.6 / Layout 598.8 / Paint 847.9 ms，TBT 1207 ms，而 JS 执行不足 1 s。
- **怎么做**：检查卡片的阴影/圆角/滤镜与 `mask` 用法，避免大范围重绘；图片统一 `width`/`height` + `content-visibility: auto` 减少首屏外的布局与解码；避免在首屏阶段读取会强制同步布局的属性。
- **怎么验证**：移动端 TBT ≤600 ms；Style / Layout / Paint 自耗时显著下降。

### P2-1 移除或延后运行时第三方依赖

- `api.iconify.design` 图标改为构建期打包为本地 SVG sprite，去掉运行时跨域请求。
- `cloudflareinsights` 分析脚本改为 `defer` 且在 `load` 之后再注入。
- **验证**：首屏第三方请求数降为 0；跨域 RTT 从关键路径消失。

### P2-2 确认边缘节点与 HTML 压缩

- TTFB 稳定在 624–663 ms 且与设备无关；首页 HTML 传输 60,516 B / 解码 195,018 B（压缩比 **3.22×**，Brotli 已生效）。`Server-Timing` 显示 `cfEdge=7 ms`、`cfOrigin=0 ms`、`cfWorker=42 ms` —— **边缘与 Worker 都不是瓶颈，耗时在访客到边缘的网络路径上**。若主要访客在中国大陆，值得实测确认是否存在就近节点缺失导致的绕行。
- **验证**：重复测量 TTFB，目标 ≤800 ms。

## 证据复核记录

以下为本次用于交叉验证的**只读**实测命令与结果（未对生产环境做任何写入）：

```bash
# 封面原图：302 → 630 KB
curl.exe -s -D - -o /dev/null https://wasd09090030.top/images/i_tvrehtqGZco89Q6Q
# → HTTP/1.1 302 Found; Location: https://cfimg.wasd09090030.top/file/gallery/1778772287719_20260102_225334.webp
#   Cache-Control: public, max-age=300; CF-Cache-Status: EXPIRED

curl.exe -s -o /dev/null -w "size=%{size_download} ct=%{content_type}\n" -L \
  https://wasd09090030.top/images/i_tvrehtqGZco89Q6Q
# → effective=https://cfimg.wasd09090030.top/.../1778772287719_20260102_225334.webp
#   size=645236  ct=image/webp  ttfb=2.01s  total=3.06s  redirects=1

# 同一资源的缩略图变体
curl.exe -s -o /dev/null -w "size=%{size_download}\n" \
  https://wasd09090030.top/images/thumb/card/i_tvrehtqGZco89Q6Q.webp
# → size=50146，直出 200，无跳转

# 占位图体积与缓存策略
curl.exe -s -I https://wasd09090030.top/Picture/loading.gif
# → Content-Length: 59208; Cache-Control: public, max-age=31536000, immutable

# LCP 底图的缓存策略
curl.exe -s -I https://wasd09090030.top/hero/girl-full-silhouette.webp
# → Content-Length: 16112; Cache-Control: public, max-age=0, must-revalidate

# sitemap 统计
curl.exe -s https://wasd09090030.top/sitemap.xml -o sitemap.xml
# → 31742 B；<image:image> 312 条，<image:loc> 312 条；
#   <image:loc>https://wasd09090030.top/Picture/loading.gif</image:loc> 出现 74 次

# 生产 HTML 结构清点
# 首页 194651 B：rel="stylesheet" ×8、rel="preload" ×1(仅 _payload.json fetch)、
#   modulepreload ×0、<img src="/Picture/loading.gif"> ×8、girl-full-silhouette 出现 0 次
# 文章页 41794 B：rel="stylesheet" ×7、<img loading.gif> ×1
```

trace 内的 LCP 候选事件（`largestContentfulPaint::Candidate`）是 F2 / F3 的一手证据：

```
home-desktop-cold  idx=1  size=20033   discovery=866  loadStart=867  loadEnd=2252
home-desktop-cold  idx=2  size=203877  discovery=1838 loadStart=2018 loadEnd=2717
home-mobile-cold   idx=1  size=14266   discovery=862  loadStart=869  loadEnd=6447
home-mobile-cold   idx=2  size=66384   discovery=3461 loadStart=3462 loadEnd=5245
article-desktop    idx=1  size=470400  discovery=951  loadStart=1686 loadEnd=7303
```

## Risks and Follow-Up

**方法学局限（会影响结论强度）**

- **每个样本只采集 1 次**，不是多次中位数。网络侧抖动明显：热缓存轮 TTFB（1415 ms）反而高于冷缓存轮（663 ms），说明 TTFB 这一项的绝对值不宜过度解读。
- **TBT 是 INP 的代理指标**，本次未采集真实 INP（需要真实交互与输入延迟事件）。
- 移动端只覆盖了首页，文章页与画廊页未做移动档位采样。
- 画廊页 LCP 为空是因为其滚动式布局在观测窗口内没有产生 LCP 候选，不代表性能良好。
- V8 CPU 采样的 `(garbage collector)` / `(program)` 是 V8 根桶（含线程空闲），**不可解读为 GC 耗时**；耗时代码结论基于阶段自耗时与长任务。
- F2 中「加载完成 → 绘制」空窗的成因（合成层 + 无限动画导致绘制延后）是**推断，未确证**，需在 P0-3 修复后复测确认。

**已知未覆盖项**

- 只在桌面 Chrome headless 上测量，未覆盖 Safari / Firefox / 真机。
- 未采集真实用户数据（CrUX / Web Vitals RUM）；本次是实验室单次测量。
- 缓存规则的下发来源已在实施阶段确认（原先记为「未确认」）：`nuxt.config.ts` 的 `nitro:build:public-assets` hook 用 `writeFileSync` **整文件覆盖**生成 `_headers`。线上实测 `/` 返回 `x-frame-options` 与 `permissions-policy`，而这两项只出现在该 hook 写的 `/*` 段里，可证 hook 内容最终落地。这也解释了 `/hero/**`、`/fonts/**` 为何回落到 `must-revalidate`：它们在当时的两处配置中都不存在。**结论：新增缓存规则必须同时写入该 hook，只加 `routeRules` 不生效。**

**后续动作**

- 本次**未改动任何业务代码**，所有建议待单独开 change 实施。
- 实施 P0-1 / P0-3 后应重新执行同一套采集脚本（5 个样本 + 移动端档位），与本基线逐项对比。
- 建议把主线程阶段自耗时与 LCP 候选时序纳入回归检查项，避免后续改动重新引入阻塞样式或延后绘制。

## 产物

| 文件 | 说明 |
|---|---|
| `doc/2026-09-11_production-performance-report.md` | 本文档（现状 + 建议） |
| `doc/2026-09-11_production-performance-report.html` | 可视化报告（瀑布图、体积分布、主线程阶段图、建议卡片），自包含无外部依赖 |
| `tmp/perf/*.trace.json` | 5 份原始 trace（合计约 150 MB，`tmp/` 已被 gitignore） |
| `tmp/perf/*.raw.json` / `*.trace-analysis.json` | 终端渲染指标与主线程 CPU 分析结果 |
| `tmp/perf-collect.mjs` / `tmp/trace-analyze.mjs` / `tmp/perf-report.mjs` | 采集 → 分析 → 出报告的零依赖管线 |
