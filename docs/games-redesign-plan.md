# `/games` 游戏页改版方案

> 配套原型：`docs/games-redesign-prototype.html`（直接用浏览器打开，桌面/移动都会自适应）
> 原型里的评分与短评是示例数据，其余数据取自真实接口快照。

---

## 1. 现状诊断

| 位置 | 现在长什么样 | 问题 |
| --- | --- | --- |
| 页头 | 大标题 + 简介 + 右侧「已同步 / 在 Steam 查看」 | 重心在别处，页面一进来没有"主角" |
| 最爱游戏 | 12 栏网格里占 7 栏的白卡，高 236px，封面 460×215 的 `header.jpg` 铺满后被渐变压暗，文字挤左下角 | 放大后模糊；层级和平级展柜一样，显不出"最爱"；没有主观评价的位置 |
| 最近在玩 | 12 栏卡片里 3 个小卡（16:9 封面约 300px 宽） | 和其它模块同一张白卡、同一个节奏，bento 变成了"整齐的表格" |
| 收藏家 | 书架缩略图 **34×20px** | 2x 屏上等于马赛克（用户提到的"太小太小"） |
| 完美通关 | 封面缩略图 **34×20px** | 同上 |
| 愿望单 | 封面缩略图 **34×20px** | 同上 |
| 游玩时长 | 纯文字条，没有封面 | 有 `headerUrl` 却不用 |
| 最稀有成就 | 纯文字，没有图 | 成就本身有 `icon_url`，但接口没吐出来 |
| 图标 | 只有 `mdi:` + `heroicons:`，每个展柜都是同一个 12px 小方块图标 | 模块之间没有性格差异，"图标"没起到识别作用 |

一句话：所有模块长得一样，所以**没有一个模块是重点**；而需要图的地方，图太小。

---

## 2. 设计目标

1. **重心**：最爱游戏升级为整页的"封面故事"，居中、可读、有情绪。
2. **层级**：`档案条 → 英雄区 → 我的评分 → Now Playing → 其余展柜`，视觉权重逐级下降。
3. **封面**：任何出现游戏的地方，封面都要"够看"——16:9 不小于 84px 宽，竖版不小于 42px 宽，大图统一走 616×353 / 600×900 的高清源。
4. **不新增运行时依赖**：仍静态站 + `overview` 只读快照；图片继续用 Steam CDN，不落库。

---

## 3. 版式总览

```
┌──────────────────────────────────────────────────────────┐
│ 页头：eyebrow / 游戏档案 / 一句话简介      [已同步 · 2h] │
├──────────────────────────────────────────────────────────┤
│ 档案条：头像 昵称 LV50 │ 708 游戏 · 8309h · 39.9h · 1104 │
├──────────────────────────────────────────────────────────┤
│ ★ 最爱游戏（居中英雄区，深色，铺满 12 栏）                │
│      eyebrow · 超大标题 · 引语 · 居中封面 + 评分徽章       │
│      4 项数据 · 3 个标签                                   │
├──────────────────────────────────────────────────────────┤
│ ✦ 我的评分（12 栏卡片）  最高分 / 分布直方图 │ 评分行列表  │
├──────────────────────────────────────────────────────────┤
│ ▶ 最近在玩 Now Playing（深色通栏，1 大 + N 竖版海报）      │
├──────────────────────────────────────────────────────────┤
│ 收藏家（12 栏，大数字 + 6 连封面书架）                     │
├───────────────────────────────┬──────────────────────────┤
│ 游玩时长（7 栏，竖版小海报）   │ 完美通关（5 栏，84px 封面）│
├───────────────────────────────┴──────────────────────────┤
│ 最稀有成就（12 栏，成就徽章 46~58px）                      │
├──────────────────────────────────────────────────────────┤
│ 愿望单（12 栏，3 列 16:9 大图）                            │
└──────────────────────────────────────────────────────────┘
```

实现上不拆网格：`GamingPageContainer` 仍按 D1 里的顺序渲染，`favorite` / `rating` / `recent` 三个模块各自带 `grid-column: 1 / -1`（通栏），其余照旧走 bento 栏位。这样后台的拖拽排序依然生效。

---

## 4. 逐模块设计

### 4.1 最爱游戏 → 居中英雄区

- **结构（自上而下，全部居中）**
  1. eyebrow：`♛ All-time Favorite · 从 708 款里选出的这一款`（icon `game-icons:laurel-crown`）
  2. 标题：`clamp(30px, 4.4vw, 56px)`，Playfair 800，`text-wrap: balance`
  3. 引语：一句主观评价（43 字以内，来自评分表的 `comment`，缺省则退回"时长 + 成就"的客观描述）
  4. 居中封面：`capsule_616x353.jpg`，520px 宽、radius 18、外发光 + 1px 高光描边
  5. 评分徽章：84px 圆形，压在封面下沿（`translate(-50%, 46%)`），显示 `9.6 / 10`
  6. 数据行：总时长 / 成就 / 近两周 / 上次游玩，等宽数字 + 字距放大的小标签
  7. 标签行：`生涯时长第一` `全部成就已集齐`（均为可推导事实，不是硬编码）
- **背景**：沿用现有的 `header.jpg`（460×215，约 30KB）放大 + `blur(26px)` + 深色渐变遮罩 + 顶部橙色径向光。**不额外下载大图**，模糊后清晰度足够。
- **为什么敢用深色**：整页是暖米色纸感，中间插一块深色，才能把"封面故事"和下面的白卡区分开；暗色模式下改用 `--bg-secondary` 的深棕，对比度仍然够（原型里只演示浅色）。
- **移动端（≤576）**：封面占满宽度（去掉 520px 上限），标题 26~30px，数据行两行两列，徽章缩到 68px。

### 4.2 新增：我的评分

- **左栏（208px）**：最高分大数字（serif 58px）+ 游戏名 + 4 档分布直方图（9–10 / 8–9 / 7–8 / <7）。
- **右栏**：每款一行 `封面 92×52 │ 游戏名 + 一句短评 │ 10 段刻度尺 │ 分数`。
  - 刻度尺是 10 个 15px 高的小方块，按分数填亮；颜色分档：`≥9` 玫红、`≥8` 橙、`<8` 青。这是本模块的"记忆点"，比五角星更符合"打分"的语义。
  - 分数用 serif 24px、右对齐、同色，行间虚线分隔。
- **悬停**：整行浅底 + 刻度尺微微加深（不做位移，避免长列表晃动）。
- **空态**：如果一条评分都没有，整个模块不渲染（沿用现有 `empty` 约定），不出现空卡片。
- **数据**：见第 6 节，两种取数方式。
- **无障碍**：刻度尺 `role="img"` + `aria-label="9.6 分，满分 10 分"`，不让读屏逐格念方块。

### 4.3 最近在玩 → Now Playing 剧场

- **形态**：整块深色通栏（`#33241f → #241a17`），**不是白卡**；带左上角玫红辉光。这是"大胆一点"的主要落点。
- **排布**：`1.72fr : 1fr : 1fr`，高度固定 `clamp(360px, 36vw, 468px)`，让三张图等高：
  - 第 1 款：`library_hero.jpg`（1920×620）横向铺满，大标题 + 本周时长 + 成就进度 + "本周最久"胶囊
  - 第 2、3 款：`library_600x900_2x.jpg`（600×900）竖版海报，接近 Steam 库的观感
- **每张卡的固定信息层**：序号 `01/02/03`、本周时长大数字、成就进度条、上次游玩。底部渐变压暗保证可读。
- **悬停**：卡整体上浮 4px + 图片 `scale(1.05)`；`prefers-reduced-motion` 下全部关掉。
- **数量与滚动**（已定：默认 4 款，支持横向滚动）：
  - 1 款 → 单张大图（拉伸铺满）
  - 2~3 款 → 按 `flex-grow` 铺满整行
  - 4 款 → 一张主卡 + 3 张海报，正好占满，右侧边缘略露"还有内容"
  - 5~8 款 → 主卡固定、其余进横向滚动轨（`scroll-snap`），一次露 3 张
  - 移动端：**只做横向滚动**，每张卡 `78vw`，不折行、不换布局
- **顺带**：现在 3 款是硬上限（`shared/steam-showcases.ts` 的 `limitRange: [1, 3]`），改成 `[1, 8]`、默认 4，后台滑块即可调。

### 4.4 其余展柜：把封面放大

| 模块 | 现在 | 改后 | 用图 |
| --- | --- | --- | --- |
| 收藏家（5→**12 栏**） | 书架 4 张 34×20 | 大数字 708 + 6 张 137×77 的 16:9 连排书架，图上叠游戏名 | `header.jpg` |
| 游玩时长（8→**7 栏**） | 无图 | 每行 42×56 竖版小海报 | `library_600x900.jpg` |
| 完美通关（4→**5 栏**） | 34×20 缩略图 | 84×47 封面 + 底部青色 "100%" 压条 | `header.jpg` |
| 最稀有成就 | 无图 | 成就徽章 46px（hero 58px）金色圆形 + 3 行文字 | `steam_achievements.icon_url`（需接口补字段） |
| 愿望单 | 34×20 + 文字 | 3 列 16:9 大图卡，右上角"等了 N 天"胶囊，图下叠游戏名 | `header.jpg` |

> 收藏家从 5 栏变成 12 栏，是为了让"6 连书架"里每张图都有 130px 以上；游玩时长 8→7、完美通关 4→5 是为了这一对的高低节奏更舒服。三处都只改 `shared/steam-showcases.ts` 的 `span`，前端按 `item.span` 自动跟随。

### 4.5 取图规范（统一走一个工具）

新增 `features/steam-gaming/utils/steam-artwork.ts`：

```ts
type ArtworkVariant = 'hero' | 'capsule' | 'poster' | 'poster2x' | 'header'
// appid + variant → https://cdn.cloudflare.steamstatic.com/steam/apps/{appid}/{file}
```

- 已用 7 个真实 appid 逐个验证：`header.jpg` 460×215、`capsule_616x353.jpg` 616×353、`library_600x900.jpg` 300×450、`library_600x900_2x.jpg` 600×900、`library_hero.jpg` 1920×620 **全部存在**。
- `GameCover` 增加 `variant` / `ratio` / `srcset` 属性；加载失败按 `poster2x → poster → capsule → header → 首字母兜底` 逐级降级（`@error` 时换下一档，现有 `failed` 逻辑扩展）。
- 竖版/横版用 `srcset` 给移动端降规格（300×450 vs 600×900），省一半流量。
- 英雄区封面 `fetchpriority="high"`，其余保持 `loading="lazy"`。

### 4.6 图标方案

**先装包 + 改配置**（`@nuxt/icon` v2 的 `serverBundle.collections` 是白名单，不登记新集合的话，SSG 产物里这些图标会在运行时去 `api.iconify.design` 拉，首屏先空一下再补 —— 必须登记）：

```bash
cd nuxt-public
npm i -D @iconify-json/ph @iconify-json/game-icons @iconify-json/simple-icons
```

```ts
// nuxt.config.ts
icon: {
  serverBundle: { collections: ['heroicons', 'mdi', 'ph', 'game-icons', 'simple-icons'] },
  ...
}
```

`ph` 是 Phosphor（256×256，有 fill/duotone 变体，和现有暖色调最搭），`game-icons` 补游戏语汇，`simple-icons` 只用来放 Steam 标志。`npm run lint:icons` 的规则（必须带 collection 前缀）全部满足。

| 模块 | 图标 | 语义 |
| --- | --- | --- |
| 最爱（eyebrow） | `game-icons:laurel-crown` | 冠冕 → 第一名 |
| 最爱（角标） | `ph:star-four-fill` | 星芒 → 偏爱 |
| 我的评分 | `ph:seal-check-fill` | 认证章 → 我的判定 |
| 我的评分（最高分） | `ph:medal-fill` | 奖牌 |
| 最近在玩 | `ph:game-controller-fill` | 手把 → 正在玩 |
| 最近在玩（时间） | `ph:clock-countdown-fill` | 倒计时 → 近 14 天 |
| 火热 / 本周最久 | `ph:fire-fill` | 火 → 热的 |
| 收藏家 | `ph:books-fill` | 书架 |
| 游玩时长 | `ph:chart-bar-fill` | 榜单 |
| 完美通关 | `ph:trophy-fill` | 奖杯 → 100% |
| 最稀有成就 | `game-icons:achievement` / `ph:diamond-fill` | 成就徽章 / 稀有度 |
| 愿望单 | `ph:heart-straight-fill` | 心愿 |
| Steam 外链 | `simple-icons:steam` | 平台标识 |
| 同步状态 | `ph:arrows-clockwise-fill` | 同步中/已同步 |
| 数据来源 | `ph:database` | 快照来源 |

（实现时逐个用 `api.iconify.design` 校验存在性，再跑 `lint:icons`。）

---

## 5. 结构与文件改动

### 前端 `nuxt-public/app/features/steam-gaming/`

| 文件 | 动作 |
| --- | --- |
| `utils/steam-artwork.ts` | **新增**：变体 → CDN URL、srcset、降级链 |
| `components/GameCover.vue` | 扩展：variant / ratio / srcset / 多级兜底 |
| `components/SectionHeader.vue` | **新增**：icon + 标题 + 右侧 meta 的统一表头（替代每个模块里的重复标记） |
| `showcases/FavoriteShowcase.vue` | 重写为居中英雄区 |
| `showcases/RatingShowcase.vue` | **新增** |
| `showcases/RecentShowcase.vue` | 重写为 Now Playing 剧场（含 1~6 自适应） |
| `showcases/CollectorShowcase.vue` | 改成大数字 + 6 连书架 |
| `showcases/PlaytimeRankingShowcase.vue` | 加竖版小海报 |
| `showcases/CompletionistShowcase.vue` | 封面 34→84 |
| `showcases/RarestAchievementShowcase.vue` | 成就徽章 + 紧凑三列 |
| `showcases/WishlistShowcase.vue` | 3 列大图卡 |
| `containers/GamingPageContainer.vue` | 档案条从卡片改为细条；hero/score/now 三个模块通栏；页脚不变 |
| `types.ts` | `SteamGame.rating?`、`SteamRating`、`SteamAchievement.iconUrl?` |
| `assets/css/components/SteamGaming.desktop.css` / `.mobile.css` | 按注释分区扩写（仍是一对文件；单模块体积过大再拆 `SteamRating.{desktop,mobile}.css`） |

### 后端 `nuxt-admin/`（选方案 A 时）

| 文件 | 动作 |
| --- | --- |
| `migrations/0010_steam_ratings.sql` | 新表 + 把 `rating` 插到 position 2 |
| `shared/steam-showcases.ts` | 加 `rating` 类型；`recent.limitRange` `[1,3]→[1,6]`；`collector.span 5→12`、`top-playtime 8→7`、`completionist 4→5`；默认顺序改为 最爱→评分→最近→收藏家→… |
| `server/domain/steam/ratings.ts` | **新增**：读取 / 校验 / 保存（0.5 分档、1~10、短评 ≤43 字） |
| `server/routes/admin/api/steam/ratings.get.ts` / `.put.ts` | **新增** |
| `server/domain/steam/showcases.ts` | 新增 `ratingData()`；`favoriteData()` 附带 `rating`；`rarestAchievementData()` 附带 `iconUrl` |
| `server/routes/admin/api/steam/status.get.ts` 等 | 不动 |
| `app/pages/admin/gaming/index.vue` | 新增「我的评分」面板（搜索库存 → 打分 → 写短评 → 排序） |

---

## 6. 评分板块的数据方案

| | A. D1 表 + 后台可编辑（**已采用**） | B. 前端静态文件 | C. 不做评分 |
| --- | --- | --- | --- |
| 改分数 | 后台点几下，刷新即生效 | 改 `ratings.ts` → 重新 `generate` + 部署 Pages | — |
| 新增表/迁移 | 需要 `0010` | 无 | 无 |
| 后台工作量 | 一个面板（约 120 行 Vue） | 无 | 无 |
| 和「最爱」联动 | 英雄区自动显示该游戏分数 | 需要在两处同步 | 无 |
| 适合 | 长期维护、想随手改 | 一次定终身 | — |

- A 的表结构（很轻）：
  ```sql
  CREATE TABLE steam_ratings (
    appid INTEGER PRIMARY KEY,      -- 与 steam_games.appid 关联
    score REAL NOT NULL,            -- 1.0 ~ 10.0，0.5 步进
    comment TEXT,                   -- ≤60 字，可为空
    position INTEGER NOT NULL,
    updated_at TEXT NOT NULL
  );
  ```
  读取时 `JOIN steam_games` 拿名字和封面，并过滤 `is_visible = 1`；游戏从库里下架也不会 500。
- B 的写法：`features/steam-gaming/data/ratings.ts` 导出一个数组，前端直接合并进视图；后端零改动。
- 无论 A 还是 B，**公开接口只多一个 `rating` 展柜 + `favorite.rating` 字段**，其余形状不变，老版本前端不会崩。

---

## 7. 实施顺序（建议 4 个可独立回滚的提交）

1. **基建**：`steam-artwork` + `GameCover` 升级 + `SectionHeader` + 三套图标集合 + `nuxt.config` 登记。此时页面外观不变，只验证取图/图标正确。
2. **英雄区 + Now Playing**：重写 `FavoriteShowcase` / `RecentShowcase`，容器改通栏；`recent.limitRange` 放宽。
3. **评分模块**：迁移 + 接口 + `RatingShowcase` + 后台面板（方案 A）；或 `ratings.ts`（方案 B）。
4. **其余展柜封面放大 + 栏位调整 + 移动端收尾**：收藏家/时长/完美/稀有/愿望单，补齐 `576/768/992` 三档覆盖。

---

## 8. 验收清单

- [ ] 1440 / 1024 / 768 / 390 四个宽度无横向滚动
- [ ] 最爱游戏在 390 宽下标题、封面、徽章不重叠，徽章不压住数据行
- [ ] 中间那块深色通栏在浅色/深色主题下文字对比度都 ≥ 4.5:1
- [ ] 断网或 Steam CDN 404 时，所有封面退到首字母兜底块，不出现破图
- [ ] 评分空态下不渲染模块；只有 1 条评分时左栏直方图不歪（最高档占满）
- [ ] `npm run lint:icons` 通过；构建产物里没有 `api.iconify.design` 运行时请求
- [ ] `npm run generate` 后 `/games` 首屏 LCP 仍是英雄区封面，且不高于当前值（Chrome DevTools 实测对比）
- [ ] 后台改一次评分 → 前端 60s 内可见（`cache-control: max-age=60`）

## 9. 风险

| 风险 | 处理 |
| --- | --- |
| Steam CDN 部分游戏缺 `capsule_616x353` / `library_hero` | 逐级降级链 + 首字母兜底，原型和实现都按这个写 |
| 竖版海报单张 200KB+ | `srcset` 移动端降 300×450；惰性加载；只给最近在玩的 2 张用 2x |
| 深色通栏在暗色模式下"糊成一片" | 暗色下边框用 `--border-color-dark`，通栏底色取 `--bg-secondary` 而非纯黑 |
| `blur(26px)` 在大图上开销 | 只用 460×215 的 header 做背景，不用 1920 宽的 hero 图 |
| 迁移改了 `steam_showcases` 顺序 | 迁移只插入 `rating` 并把后续位置 +1，不动其余相对顺序；后台仍可拖拽 |

---

## 10. 已确认的决策

1. **评分数据**：走 **A（D1 表 + 后台可编辑）**。迁移 `0010_steam_ratings.sql`，后台「游戏」页新增「我的评分」面板。
2. **最近在玩**：默认 **4 款**，上限放宽到 **8**；多出来的进横向滚动轨，移动端只做横向滚动。

## 11. 实施记录

- 图标集合：新增 `@iconify-json/ph`、`@iconify-json/game-icons`、`@iconify-json/simple-icons`，并登记到 `nuxt.config.ts` 的 `icon.serverBundle.collections`。
- 迁移 `0010` 会顺带把展柜顺序统一为：最爱 → 我的评分 → 最近在玩 → 收藏家 → 游玩时长 → 完美通关 → 最稀有成就 → 愿望单。

