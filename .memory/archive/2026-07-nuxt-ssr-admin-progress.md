---
name: archived-2026-07-nuxt-ssr-admin-progress
description: 2026-07 期间 nuxt/ SSR admin 收缩 + Tailwind v4 升级的进度记录，已被 2026-08 Cloudflare Free 迁移取代
metadata:
  type: archive
---

# 归档：nuxt/ SSR admin 进度（2026-07，已过时）

> 归档时间：2026-08-05。此阶段内容已被 **Cloudflare Free admin 迁移**（见 `features/completed/cloudflare-free-admin-migration.md`）取代。
> `nuxt/` 云服务器 SSR 后台已冻结待删，不再新增功能。

## 原内容（2026-07-22 快照）
- 阶段：`nuxt/` Tailwind v3→v4 升级 Phase A 完成并验证；下一步 Phase B（NaiveUI → Nuxt UI v4 迁移，独立 change `nuxt-ssr-nuxt-ui-v4-migration/`）。
- 最近完成：`nuxt-shrink-to-pure-admin-and-nuxt-ui-v4`（仅范围收缩子集）——删除 8 公共 features/pages/layouts + 6 组件/composables/utils/plugins + 配置/依赖清理（卸 `@nuxtjs/seo`/`keen-slider`/`pixi.js`）；MarkdownRenderer 修复；admin 页面补 `ssr:false`。
- 关键决策：`@nuxt/ui@3.0.0`/`3.3.7` 强依赖 `@tailwindcss/vite@4.3.3`，与"tailwind 暂不同步"决策互斥 → UI 迁移延后。
- 下一步：提交 + 同步云服务器 Nginx/Worker 路由 + 联动 Tailwind v4 升级做 Nuxt UI 迁移。

## 已验证结论（勿重复踩坑）
- v4 下 prose 类进入 cascade layer；`.prose`/`.dark .prose` 两态直接写死最终值。
- v4 默认主题变量按需生成，自定义 CSS 引用 `var(--color-*)` 需带字面值 fallback。
- 旧 JS typography `blog` 变体是死配置；`.dark code` 等嵌套选择器从未匹配。
- link-checker 报 `/tools`、`/mania` 404 是 default.vue 历史硬编码外链。
- `nuxt-public/dist/` 是 `.output/public` 镜像，不能当基线。
- node_modules extraneous 包需 `npm install && npm prune` 恢复。
- Nuxt UI v3/v4 强依赖 Tailwind v4；"UI 迁移"与"Tailwind 不同步"两条决策互斥。
- admin 页面 `ssr: false` 防线：缺则 hydration mismatch。

## 风险（原阶段遗留，迁移后已不再适用）
- Inspira UI `--radius-*` 变量冲突；v4 原生 @layer 影响未分层样式；nuxt/ 仍依赖 NaiveUI（技术债）。
