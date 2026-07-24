# Nuxt 4 Admin SSR

> WyrmKk 个人博客的 **纯 admin 后台** 运行时（Nuxt 4 SSR，部署到云服务器）。
>
> **公共浏览职责（首页/文章/画廊/教程/关于）由 `nuxt-public/` 静态站承担。**
> 详细范围收缩变更见 [`openspec/changes/nuxt-shrink-to-pure-admin-and-nuxt-ui-v4/`](../../openspec/changes/nuxt-shrink-to-pure-admin-and-nuxt-ui-v4/)。
> UI 迁移变更（NaiveUI → Nuxt UI v4）见 [`openspec/changes/nuxt-ssr-nuxt-ui-v4-migration/`](../../openspec/changes/nuxt-ssr-nuxt-ui-v4-migration/)。

## 🚀 技术栈

- Nuxt 4.3 + Vue 3.4
- Tailwind CSS v4.x（via `@tailwindcss/vite`，2026-07-24 升级完成）
- UI 库：**Nuxt UI v4**（admin-only，2026-07-24 迁移完成）；`@nuxt/ui@^4.9.0` + `valibot@^1.x` + `@vueuse/motion/nuxt@^2.x`
- 范围：本目录仅承载 admin 后台，公开页由 `nuxt-public/` 静态站承载

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

访问: http://localhost:3000/admin/login

### 构建生产版本
```bash
npm run build
```

## 📁 项目结构

- `app/pages/admin/**` — 所有 admin 页面（仪表板、文章管理、画廊管理、图床管理、评论管理、登录、密码修改）
- `app/features/article-admin/` — admin 文章编辑器（容器 + 组件 + composable）
- `app/features/gallery-admin/` — admin 画廊与图床管理（容器 + 组件 + composable）
- `app/components/` — admin 共享组件（MarkdownRenderer、MdEditorWrapper.client、SideBar、SkeletonLoader 等）
- `app/composables/` — admin 业务 composable
- `app/stores/auth.ts` — Pinia 认证 store
- `app/middleware/admin-auth.ts` — admin 路由守卫
- `app/layouts/admin.vue` — admin 主布局
- `app/layouts/blank.vue` — 登录/密码页空白布局
- `app/plugins/naive-ui.client.ts` — NaiveUI 注入式 provider
- `app/app.config.ts` — 图标别名 + Nuxt UI 主题色（待 v3 迁移后启用）
- `app/app.vue` — 根模板（`<UApp>` 包裹 + 全局 SEO）

## ⚙️ 环境配置

创建 `.env` 文件并配置：

```bash
NUXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
NUXT_PUBLIC_SITE_URL=http://localhost:3000
NUXT_API_BASE_URL=http://127.0.0.1:5000/api
```

## 🎯 功能特性

- ✅ admin 登录 / 密码修改（`n-form + rules` 表单）
- ✅ 文章管理（列表、筛选、分页、批量操作）
- ✅ 文章编辑器（Markdown + MDC + KaTeX + Mermaid + md-editor-v3）
- ✅ 画廊管理（图片列表、Cloudflare 缩略图配置）
- ✅ 图床管理（文件浏览、上传、批量导入、预览）
- ✅ 评论管理（审核、回复、删除）
- ✅ 仪表板（统计卡片）
- ✅ SSR 运行时渲染（admin 页面已统一 `ssr: false` 避免 hydration mismatch）
- ✅ 资源路径 `/_ssr/` 隔离，避免与 Cloudflare Pages `/_nuxt/` 冲突

## 🛠️ 技术栈

- **框架**: Nuxt 4.3（SSR / node-server preset）
- **运行时**: Vue 3.5 + Pinia 2
- **UI 库**: NaiveUI 2.43（当前 admin-only UI 库；后续将通过独立 OpenSpec change `nuxt-ssr-nuxt-ui-v4-migration` 替换为 Nuxt UI v4）
- **样式**: Tailwind CSS v4.x（via `@tailwindcss/vite`，2026-07-24 升级完成；无 PostCSS 链、无 JS 配置）+ 手写 `theme-variables.css`
- **范围**: 本目录仅承载 admin 后台，公开页由 `nuxt-public/` 静态站承载
- **Markdown**: `@nuxtjs/mdc` + `md-editor-v3` + KaTeX + Mermaid

## 📦 部署

1. 推送 tag（`v*.*.*`）自动触发构建，下载 `nuxt-build.tar.gz`
2. 解压后用 PM2 启动: `pm2 start ecosystem.config.js --env production`
3. Nginx 配置参考 `nuxt/NuxtNginx.txt`
4. Cloudflare Worker 路由 `cloudflare-worker/router.js` 中 `SERVER_ROUTES` 已配置 `/admin`、`/api`、`/images`、`/_ssr` 转发到云服务器

> ⚠️ **部署前外部协调**（不在本仓库范围）：移除 `server.wasd09090030.top` 上对 `/` `/article/*` `/gallery` `/tutorials` `/about` 的转发——这些路径已由 `nuxt-public/` 处理，重复转发会 404 回流。
