## 实施状态：路径 C（仅范围收缩，UI 迁移延后）

**实施时间**：2026-07-22
**路径 C 决策原因**：`@nuxt/ui@3.0.0` / `3.3.7` 均把 `@tailwindcss/vite@4.3.3` 作为传递依赖拉入，与用户"tailwind 暂不同步"决策互斥。UI 迁移延后至 Tailwind v3→v4 升级联动 change。

---

## 1. 预研与依赖摸排（Phase 0）— 已完成

- [x] 1.1 在 `nuxt/app/` 全量 grep `pixi.js` 引用 → **无引用**，从 `package.json` 卸除
- [x] 1.2 在 `nuxt/app/` 全量 grep `keen-slider` 引用 → **仅 FadeSlideshow.vue 引用**（已随 gallery-public 一起删除），从 `package.json` 卸除
- [x] 1.3 `MarkdownRenderer.vue` + `MdEditorWrapper.client.vue` 内 n-xxx 残留 → MarkdownRenderer 无 n- 组件（保持原样）；MdEditorWrapper 有 20+ n- 组件（Phase 3 迁移，本 change 延后）
- [x] 1.4 admin 页面 `definePageMeta({ layout: 'admin' })` 全量确认 → 9 个页面都有
- [x] 1.5 新建 git 分支 `feature/nuxt-shrink-to-pure-admin` → 已建
- [x] 1.6 安装 Nuxt UI 依赖 → **已尝试** `@nuxt/ui@^4.9` / `@nuxt/ui@^3` / `@nuxt/ui@3.0.0`，**均发现 Tailwind v4 传递依赖冲突**，最终回退到原依赖状态
- [x] 1.7 `app.config.ts` 新增 `ui.colors` → **已回退**（UI 库未迁移，暂不引入）
- [x] 1.8 创建 `main.css` → **已回退**（同上）
- [x] 1.9 `nuxt.config.ts` 加入新模块 + main.css → **已回退**（同上）
- [x] 1.10 验证 build 成功 → ✅ 路径 C 最终 build 验证通过

## 2. 删除公共模块（Phase 1）— 已完成

### 2.1 叶子组件与 composable 清理

- [x] 2.1.1 删除 `components/CommentSection.vue`
- [x] 2.1.2 删除 `components/LoadingBar.vue`
- [x] 2.1.3 删除 `composables/useTheme.ts`
- [x] 2.1.4 grep 验证无残留引用

### 2.2 公共 layout 清理

- [x] 2.2.1 删除 `layouts/default.vue`
- [x] 2.2.2 grep 验证 admin 无引用

### 2.3 公共 features + pages 清理

- [x] 2.3.1 删除 `features/home/`
- [x] 2.3.2 删除 `features/article-list/`
- [x] 2.3.3 删除 `features/article-detail/`
- [x] 2.3.4 删除 `features/gallery-public/`
- [x] 2.3.5 删除 `features/tutorials/`
- [x] 2.3.6 删除 `pages/index.vue`
- [x] 2.3.7 删除 `pages/about.vue`
- [x] 2.3.8 删除 `pages/article/[id].vue`
- [x] 2.3.9 删除 `pages/gallery.vue`
- [x] 2.3.10 删除 `pages/tutorials.vue`
- [x] 2.3.11 grep 验证无引用

### 2.4 app.vue 清理

- [x] 2.4.1 删除 `router.afterEach` gallery 滚动守卫（72-84 行）
- [x] 2.4.2 简化 `useSeoMeta`（去 og/twitter 等公共 SEO 字段，改为 admin 基础 meta + `robots: noindex, nofollow`）
- [x] 2.4.3 简化 `shouldKeepAlive`（恒为 false）+ `getPageKey`（恒为 `route.fullPath`）
- [x] 2.4.4 grep 验证无 gallery 残留

### 2.5 额外清理（超出原 tasks.md）

- [x] 2.5.1 删除 `components/IconMarquee.vue`（孤儿，仅 WelcomeSection 引用）
- [x] 2.5.2 删除 `components/LoadingSpinner.vue`（公共首页用）
- [x] 2.5.3 删除 `components/WelcomeSection.vue`（公共首页用）
- [x] 2.5.4 删除 `components/GalleryLoadingAnimation.vue`（公共画廊用）
- [x] 2.5.5 删除 `components/Effects/`（SakuraFalling/SearchBar/StarryNight 公共装饰）
- [x] 2.5.6 删除 `composables/useArticleNavigation.ts`（公共文章导航）
- [x] 2.5.7 删除 `composables/useImagePreloadWorker.ts`（公共图预取）
- [x] 2.5.8 删除 `composables/useMarkdownWorker.ts`（公共 markdown worker）
- [x] 2.5.9 删除 `composables/useSearchWorker.ts`（公共搜索 worker）
- [x] 2.5.10 删除 `utils/articlePreloadCache.ts`
- [x] 2.5.11 删除 `utils/excerpt.ts`
- [x] 2.5.12 删除 `plugins/workerPrefetch.client.ts`（公共首页文章预取插件）
- [x] 2.5.13 修复 `MarkdownRenderer.vue` — 移除 `useMarkdownWorker` 依赖，单线程 `parseMarkdown`

### 2.6 nuxt.config.ts 清理（超出原 tasks.md）

- [x] 2.6.1 删除 `sitemap` 块
- [x] 2.6.2 删除 `prerender` 块
- [x] 2.6.3 删除 6 个公共路径 `routeRules`（/, /article/**, /gallery, /about, /tutorials）
- [x] 2.6.4 删除 `keen-slider/keen-slider.min.css` CSS 引用
- [x] 2.6.5 删除 `@nuxtjs/seo` 模块
- [x] 2.6.6 删除 `robots` 块（依赖 @nuxtjs/seo）
- [x] 2.6.7 简化 `schemaOrg` 块（去 sameAs 等公共社交链接）

### 2.7 package.json 清理（超出原 tasks.md）

- [x] 2.7.1 移除 `@nuxtjs/seo`（78 个传递包）
- [x] 2.7.2 移除 `keen-slider`
- [x] 2.7.3 移除 `pixi.js`
- [x] 2.7.4 `npm install` 同步 lockfile

### 2.8 Phase 1 验证

- [x] 2.8.1 `npm run build` 通过（22.7 MB / 5.13 MB gzip）

## 3. admin SSR 修正（Phase 2）— 已完成

- [x] 3.1 `pages/admin/imagebed/index.vue` 补 `definePageMeta({ ssr: false })`
- [x] 3.2 grep 验证 admin 9 个页面都含 `ssr: false` 或 `layout: false`
- [x] 3.3 （build 通过即视为验证完成，无需 DevTools 手测）

## 4. admin 叶子组件迁移（Phase 3）— 延后至未来 change

⏸ **延后原因**：Nuxt UI 迁移必须先升级 Tailwind v3→v4。

- ⏸ 4.1 迁移 `layouts/admin.vue` — 延后
- ⏸ 4.2 迁移 `layouts/blank.vue` — 延后
- ⏸ 4.3 迁移 `pages/admin/login.vue` — 延后
- ⏸ 4.4 迁移 `pages/admin/password.vue` — 延后
- ⏸ 4.5 迁移 `pages/admin/imagebed/index.vue` — 延后
- ⏸ 4.6 迁移 `components/MarkdownRenderer.vue` — 延后
- ⏸ 4.7 迁移 `components/MdEditorWrapper.client.vue` — 延后
- ⏸ 4.8 Phase 3 验证 — 延后

## 5. admin 容器组件 + 表单迁移（Phase 4）— 延后至未来 change

⏸ **延后原因**：同上。

- ⏸ 5.1 ~ 5.14（含 `useAdminImagebedPage.ts` composable + `ImagebedToolbar.vue`）— 全部延后

## 6. 全局 provider + 主题重构（Phase 5）— 延后至未来 change

⏸ 延后。

## 7. dark mode 切换机制迁移（Phase 6）— 延后至未来 change

⏸ 延后。`useState('isDarkMode')` 仍保留于 `layouts/admin.vue`（NaiveUI 主题未迁移）。

## 8. 清理验收（Phase 7）— 部分完成

### 8.1 配置文件清理（路径 C 子集）

- [x] 8.1.1 删除 `sitemap` 块（见 2.6.1）
- [x] 8.1.2 删除 `prerender` 块（见 2.6.2）
- [x] 8.1.3 删除公共路径 `routeRules`（见 2.6.3）
- [x] 8.1.7 删除 `@nuxtjs/seo` 模块（见 2.6.5）
- ⏸ 8.1.1 原任务"删除 naiveui 配置块" — **不执行**（NaiveUI 仍在用）
- ⏸ 8.1.2 原任务"删除 transpile naive-ui" — **不执行**（同上）
- ⏸ 8.1.3 原任务"删除 optimizeDeps include naive-ui" — **不执行**（同上）
- ⏸ 8.1.4 原任务"删除 manualChunks naive-ui 分支" — **不执行**（同上）
- ⏸ 8.1.5 原任务"删除 @bg-dev/nuxt-naiveui" — **不执行**（同上）
- ⏸ 8.1.6 原任务"删除 @nuxtjs/seo" — **已执行**（见 2.6.5）
- ⏸ 8.1.8 原任务"删除 prerender 块" — **已执行**（见 2.6.2）
- ⏸ 8.1.9 原任务"删除公共 routeRules" — **已执行**（见 2.6.3）
- ⏸ 8.1.10 原任务"评估删除 pixi.js/keen-slider" — **已执行**（见 2.7.2-2.7.3）

### 8.2 插件与依赖清理

- ⏸ 8.2.1 原任务"删除 `plugins/naive-ui.client.ts`" — **不执行**（NaiveUI 仍在用）
- ⏸ 8.2.2 原任务"移除 naive-ui/@bg-dev/nuxt-naiveui" — **不执行**（同上）
- [x] 8.2.2 移除 `@nuxtjs/seo`（见 2.7.1）
- [x] 8.2.3 移除 `pixi.js`（见 2.7.3）
- [x] 8.2.4 移除 `keen-slider`（见 2.7.2）
- [x] 8.2.5 `npm install` 同步 lockfile（见 2.7.4）

### 8.3 验证

- [x] 8.3.3 `npm run build` 通过
- ⏸ 8.3.1 grep `n-message/useMessage/n-config-provider` — **不执行**（NaiveUI 仍在用）
- ⏸ 8.3.2 grep `naive-ui` 在 `.output/` — **不执行**（同上）
- ⏸ 8.3.4 admin 关键路径全量回归 — **待 UI 迁移后做**（本 change 范围外）
- ⏸ 8.3.5 DevTools Console 验证 — **同上**
- ⏸ 8.3.6 产物体积对比 — **当前产物 22.7 MB / 5.13 MB gzip**（NaiveUI 仍在，无对比基线）

### 8.4 外部协调（PR 标注项）

- [ ] 8.4.1 部署前同步更新云服务器 Nginx 配置：移除 `server.wasd09090030.top` 上对 `/`、`/article/*`、`/gallery`、`/tutorials`、`/about` 的转发
- [ ] 8.4.2 部署前同步更新 Cloudflare Worker `SERVER_ROUTES`：精简公共浏览路径

## 9. 文档与记忆更新 — 已完成

- [x] 9.1 更新 `.memory/memory.md` — 新增 nuxt 收缩 + Nuxt UI v3/v4 互斥 finding 条目
- [x] 9.2 更新 `.memory/progress/current.md` — 当前阶段、已完成、下一步、已验证结论
- [x] 9.3 更新根目录 `README.md` — 两个前端项目对比表 + 技术栈表 + 新增 nuxt 范围收缩 + UI 迁移延后 note
- [x] 9.4 更新 `nuxt/README.md` — 整文件重写为"纯 admin 后台"说明
- [x] 9.5 更新项目根目录 `AGENTS.md` — 技术栈表 + 两个前端项目对比表
- [x] 9.6 更新 `openspec/changes/nuxt-shrink-to-pure-admin-and-nuxt-ui-v4/proposal.md` — 顶部加 Path C 状态说明
- [x] 9.7 更新 `openspec/changes/nuxt-shrink-to-pure-admin-and-nuxt-ui-v4/design.md` — 顶部加 Path C 状态说明
- [x] 9.8 更新本 `tasks.md` — 路径 C 实际执行状态

## 实施总览

| 类别 | 状态 | 数量 |
|---|---|---|
| ✅ 已完成 | 范围收缩 + 配置清理 + docs 更新 | ~60 项 |
| ⏸ 延后至未来 change | UI 迁移（依赖 Tailwind v4 升级） | ~20 项 |
| ❌ 不执行（范围外） | NaiveUI 全面卸（UI 迁移完成后才做） | ~6 项 |
| ⏳ 待部署协调 | Nginx / Worker 路由调整 | 2 项 |

**验证**：`npm run build` 通过，22.7 MB / 5.13 MB gzip。

**关键经验（写入 .memory）**：Nuxt UI v3/v4 强依赖 Tailwind v4，"UI 迁移"+"Tailwind 不同步"两条决策互斥。
