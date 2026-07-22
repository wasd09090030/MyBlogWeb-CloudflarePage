# 项目记忆索引

> 个人博客站（Nuxt 4 静态生成 + Cloudflare Pages 前端 / ASP.NET Core 后端 / Cloudflare Worker）。
> 详细变更提案与设计以 `openspec/`（changes + specs）为准，本目录只存跨会话状态与经验。

## 项目核心

- **nuxt-public**：对外博客前端，Nuxt 4.3 静态生成（nitro static preset），部署 Cloudflare Pages。UI 依赖 Naive UI + Tailwind CSS。
- **nuxt**：云服务器 SSR 项目，**纯 admin 容器**（仅服务 `/admin/*` 路由）。UI 依赖 Naive UI + Tailwind v3。后端通过 `NUXT_API_BASE_URL=http://127.0.0.1:5000/api` 直连。
- 其他子项目：backend-dotnet、cloudflare-worker。

## 关键架构决策

- **Tailwind CSS v4（2026-07-03 完成升级）**：经 `@tailwindcss/vite` 集成，无 PostCSS 链、无 JS 配置；typography 定制在 `app/assets/css/components/prose-theme.css`；暗色模式为 class 策略（自建 useTheme 切 `.dark`，`@custom-variant dark`）。详见 `openspec/changes/tailwind-v4-upgrade/`（proposal/design/specs/tasks）。状态：已实施、已验证（构建 + 目视回归）。
- **UI 演进路线（用户决策，2026-07-03）**：暂时保留 Naive UI（用户不喜欢其审美，属过渡方案）→ 稳定后调研引入 Nuxt UI v4 替换设计语言（独立 change）；Inspira UI 不依赖 Nuxt UI，Tailwind v4 就绪后可随时按需复制引入（需 motion-v + tw-animate-css）。
- **nuxt/ 收缩为纯 admin 容器（2026-07-22 完成）**：`openspec/changes/nuxt-shrink-to-pure-admin-and-nuxt-ui-v4/` 路径 C（仅范围收缩，UI 迁移延后）。详见 `.memory/progress/current.md`。
- **Nuxt UI v3/v4 与 Tailwind v3 互斥（2026-07-22 验证）**：`@nuxt/ui@3.0.0` 与 `3.3.7` 均把 `@tailwindcss/vite@4.3.3` 作为**传递依赖**拉入。Nuxt UI 迁移必须**先**升级 Tailwind v3→v4（或推迟到 v4 升级联动做）。用户"tailwind 暂不同步"决策直接导致 UI 迁移延后。

## 当前进度

- 入口：`progress/current.md`

## 经验与教训

- 见 `progress/current.md` 内“已验证结论”小节（量少暂不单独建目录）。
