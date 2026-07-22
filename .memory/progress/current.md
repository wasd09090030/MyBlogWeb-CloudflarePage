# 当前进度
最后更新：2026-07-22

## 当前阶段
`nuxt/` 收缩为纯 admin 容器（路径 C）已完成并 build 验证通过。**工作区改动尚未提交**（等用户自行 commit）。下一阶段：观察稳定性 → 后续 change 评估 Nuxt UI v4 迁移（与 Tailwind v3→v4 同步）。

## 最近完成
- `nuxt-shrink-to-pure-admin-and-nuxt-ui-v4`（change: `openspec/changes/nuxt-shrink-to-pure-admin-and-nuxt-ui-v4/`，**仅范围收缩子集**完成）：
  - **删除**：8 个公共 features/pages/layouts 文件 + 6 个公共组件/composables/utils/plugins + 4 个 effects + 1 个 sidebar 残留 + 1 个公共 plugin
  - **配置清理**：`nuxt.config.ts` 删 `sitemap` 块 / `prerender` 块 / 6 个公共路径 `routeRules`（/, /article/**, /gallery, /about, /tutorials）/ `keen-slider` CSS 引用 / `@nuxtjs/seo` 模块 / `robots` 块 / 简化 `schemaOrg`
  - **依赖清理**：卸 `@nuxtjs/seo` / `keen-slider` / `pixi.js`（78 个传递包移除）
  - **app.vue 清理**：删 `router.afterEach` gallery 滚动守卫；简化 `useSeoMeta`（去 og/twitter 等公共 SEO 字段）；`shouldKeepAlive` 恒为 false；`getPageKey` 简化为 `route.fullPath`
  - **MarkdownRenderer 修复**：移除 `useMarkdownWorker` 依赖（公共 worker 已删）+ 删除 `workerPrefetch.client.ts` 插件
  - **SSR 修正**：`pages/admin/imagebed/index.vue` 补 `definePageMeta({ ssr: false })`（与 admin 其他页面一致）
  - **验证**：`npm run build` 通过（22.7 MB / 5.13 MB gzip）
- **关键决策（路径 C）**：原 OpenSpec change 范围包含 NaiveUI→NuxtUI 迁移，但 `@nuxt/ui@3.0.0` / `3.3.7` 均强依赖 `@tailwindcss/vite@4.3.3`（传递），与"tailwind 暂不同步"决策互斥。**UI 迁移延后**，待 Tailwind v3→v4 升级联动做。

## 下一步
1. 用户确认后提交本次改动（变更 OpenSpec change 元数据 + 删除文件 + 配置调整 + MarkdownRenderer 修复）。
2. 部署前同步更新云服务器 Nginx / Cloudflare Worker 路由：`server.wasd09090030.top` 上对 `/` `/article/*` `/gallery` `/tutorials` `/about` 的转发移除（这些路径已由 `nuxt-public/` 处理），Worker 的 `SERVER_ROUTES` 同步精简。
3. 后续 change 候选：
   - **Tailwind v3→v4 升级（nuxt/）**：可参考 `openspec/changes/archive/2026-07-14-tailwind-v4-upgrade/`（nuxt-public 已完成）
   - **Nuxt UI v4 迁移（nuxt/）**：在 Tailwind v4 升级**之后**做
   - **NaiveUI 全面卸（nuxt/）**：UI 迁移完成后

## 已验证结论（勿重复踩坑）
- v4 下 prose 类进入 cascade layer：若用未分层 CSS 定义 `.prose` 亮色变量会压死 `dark:prose-invert` 的变量切换 → 解法是按 `.prose` / `.dark .prose` 两态直接写死最终值（本项目 prose 与 dark:prose-invert 恒成对出现，见 MarkdownRenderer.vue）。
- v4 默认主题变量按需生成（tree-shaken），自定义 CSS 引用 `var(--color-*)` 必须带字面值 fallback，或直接用字面值。
- 旧 JS 配置里的 typography `blog` 变体是死配置（MarkdownRenderer size 校验器不含 'blog'）；`.dark code` 等嵌套选择器在 v3 typography 配置中生成 `.prose .dark code`，从未匹配过（伪暗色规则）。
- link-checker 报 `/tools`、`/mania` 404 是 default.vue 中历史硬编码外链（target=_blank 的站外工具页），与样式无关。
- `nuxt-public/dist/` 是 `.output/public` 的镜像/链接，不是历史构建，不能当基线对比。
- node_modules 曾残留手动试装的 tailwind v4 包（extraneous）导致升级工具误判版本；`npm install && npm prune` 恢复一致后才能正常跑 v3→v4 迁移。
- **Nuxt UI v3/v4 强依赖 Tailwind v4**：`@nuxt/ui@3.0.0` 与 `3.3.7` 都把 `@tailwindcss/vite@4.3.3` 作为**传递依赖**。"UI 迁移"+"Tailwind 不同步"两条决策互斥，须联动规划。
- **admin 页面 ssr: false 防线**：`pages/admin/imagebed/index.vue` 原本缺 `ssr: false`，其他 8 个 admin 页面都设了——本次同步补齐避免 hydration mismatch。

## 风险与待确认
- Inspira UI 引入时：其主题模板 `--radius-sm/md/lg/xl`（@theme inline）与 `theme-variables.css` 同名变量冲突，会改变 `rounded-*` 取值——引入前必须先解决命名空间。
- v4 原生 @layer 使未分层样式（Naive UI/手写 CSS）优先级高于 utilities：本次回归未见异常，但长尾页面仍可能有个别差异。
- `nuxt/` 现在仍依赖 NaiveUI（UI 迁移延后）——技术债分裂仍在，待 Tailwind v4 升级后联动做 Nuxt UI 迁移。

## 关键入口
- 构建（nuxt-public）：`cd nuxt-public && npm run generate`；预览：`npx serve .output/public -l 4173`
- 构建（nuxt）：`cd nuxt && npm run build`；启动：`npm run dev`（http://localhost:3000/admin/login）
- nuxt-public 样式入口：`nuxt.config.ts` css 数组；`app/assets/css/tailwind.css`（引擎配置）；`prose-theme.css`（typography 主题）
- nuxt 样式入口：`nuxt.config.ts` css 数组；`app/assets/css/tailwind.css`（v3 引擎配置）；`theme-variables.css`（手写 token）
