# 个人博客系统 (MyBlogWeb)

现代化全栈个人博客系统，采用 **混合架构**：静态博客（Cloudflare Pages）+ 动态应用（SSR 云服务器）+ .NET 8 后端 API，通过 Cloudflare Worker 统一域名路由。

## 架构总览

```
用户访问 wasd09090030.top / www.wasd09090030.top
                    ↓
          Cloudflare Worker（路由分发）
           ├── 静态路由 → Cloudflare Pages（nuxt-public/）
           │   ├── /                 首页
           │   ├── /article/*        文章详情
           │   ├── /gallery          图片画廊
           │   ├── /tutorials        教程列表
           │   └── /about            关于页面
           │
           └── 动态路由 → 云服务器 Nginx → Nuxt SSR（nuxt/）
               ├── /admin/*          管理后台
               ├── /tools/*          工具箱
               ├── /mania/*          音游功能
               ├── /api/*            → .NET 后端 (port 5000)
               ├── /images/*         图片资源
               └── /_ssr/*           SSR 静态资源
```

## 域名架构

| 域名 | 用途 | 指向 |
|------|------|------|
| `wasd09090030.top` | 用户访问主域名 | Cloudflare Worker |
| `www.wasd09090030.top` | 同上（别名） | Cloudflare Worker |
| `server.wasd09090030.top` | 云服务器（Worker 内部转发） | 云服务器 IP |
| `backend.wasd09090030.top` | 后端 API（构建时 & 客户端） | 云服务器 IP |

- `server.wasd09090030.top` 不面向用户，robots.txt 已设置 `Disallow: /`
- Cloudflare Pages 使用默认域名，无需自定义域名（通过 `env.ASSETS` 内部调用）

## 项目结构

```
MyBlogWeb-CloudflarePage/
├── nuxt-public/                    # 静态博客（Cloudflare Pages）
│   ├── app/
│   │   ├── features/              # 业务模块
│   │   │   ├── article-list/      # 文章列表
│   │   │   ├── article-detail/    # 文章详情
│   │   │   ├── gallery-public/    # 画廊展示
│   │   │   ├── home/              # 首页
│   │   │   └── tutorials/         # 教程
│   │   ├── shared/                # 共享层（api/cache/errors/types/ui）
│   │   ├── layouts/               # 布局（default/blank）
│   │   ├── pages/                 # 路由入口
│   │   └── components/            # 通用组件
│   ├── nuxt.config.ts             # 静态生成配置（nitro.preset: 'static'）
│   └── .env.production            # 生产环境变量
│
├── nuxt/                           # 动态 SSR 应用（云服务器）
│   ├── app/
│   │   ├── features/              # 业务模块（含 admin 相关）
│   │   │   ├── article-admin/     # 文章管理
│   │   │   ├── gallery-admin/     # 画廊管理
│   │   │   └── ...                # 其他公共模块
│   │   ├── shared/                # 共享层
│   │   ├── layouts/               # 布局（default/admin/blank）
│   │   ├── pages/                 # 路由（admin/tools/mania + 公共页面）
│   │   ├── stores/                # Pinia 状态管理
│   │   └── middleware/            # 路由中间件（认证等）
│   ├── nuxt.config.ts             # SSR 配置（buildAssetsDir: '/_ssr/'）
│   ├── NuxtNginx.txt              # Nginx 配置参考
│   └── ecosystem.config.js        # PM2 部署配置
│
├── cloudflare-worker/
│   ├── router.js                  # Worker 路由分发逻辑
│   └── wrangler.toml              # Worker 部署配置
│
├── backend-dotnet/BlogApi/         # .NET 8 后端 API
│   ├── Controllers/               # API 控制器
│   ├── Services/                  # 业务逻辑
│   ├── Models/                    # 数据模型
│   ├── DTOs/                      # 数据传输对象
│   └── Data/                      # 数据库上下文（SQLite）
│
├── .github/workflows/
│   └── release.yml                # CI/CD（支持 SSR/静态站独立构建）
│
└── doc/
    ├── CloudflarePages-Deploy-Guide.md
    └── Hybrid-Architecture.md
```

## 两个前端项目对比

| | nuxt-public/（静态站） | nuxt/（SSR 动态站） |
|---|---|---|
| **部署位置** | Cloudflare Pages（CDN） | 云服务器（PM2 + Nginx） |
| **渲染方式** | 构建时静态生成（SSG） | 服务端渲染（SSR） |
| **负责页面** | 首页、文章、画廊、教程、关于 | 管理后台、工具箱、音游 |
| **数据获取** | 构建时从 API 拉取，写入静态 HTML | 运行时实时请求 API |
| **资源路径** | `/_nuxt/`（默认） | `/_ssr/`（避免冲突） |
| **SEO** | sitemap.xml、robots.txt | sitemap 已禁用，robots 禁止索引 |
| **更新方式** | 重新 generate + 部署到 Pages | 重新 build + 重启 PM2 |
| **互不影响** | 重新部署不影响 SSR 站 | 重新部署不影响静态站 |

### 跨项目导航

- nuxt-public 中访问 `/tools`、`/mania` 使用 `<a>` 标签（全页面跳转到 SSR）
- nuxt 中访问 `/`、`/gallery`、`/tutorials`、`/about` 使用 `<a>` 标签（全页面跳转到 Pages）
- 同项目内部导航使用 `NuxtLink`（SPA 路由）

## 技术栈

**前端**: Nuxt 3 + Vue 3 (Composition API) + NaiveUI + TailwindCSS + MDC
**后端**: ASP.NET Core 8.0 + Entity Framework Core + SQLite
**基础设施**: Cloudflare Pages + Cloudflare Worker + Nginx + PM2
**CI/CD**: GitHub Actions（双目标构建）

## 开发命令

### nuxt-public/（静态站）

```bash
cd nuxt-public
npm install
npm run dev          # 本地开发
npm run generate     # 静态生成（构建时拉取 API 数据）
```

### nuxt/（SSR 动态站）

```bash
cd nuxt
npm install
npm run dev          # 本地开发
npm run build        # 生产构建
npm run preview      # 预览构建结果
```

### 后端

```bash
cd backend-dotnet/BlogApi
dotnet run                              # 开发运行
dotnet publish -c Release -o ./publish  # 生产发布
```

## 部署

### 静态站（Cloudflare Pages）

1. Cloudflare Pages 连接 GitHub 仓库，构建命令：
   - 构建命令: `cd nuxt-public && npm install && npm run generate`
   - 输出目录: `nuxt-public/.output/public`
2. 或通过 GitHub Actions 手动触发 `nuxt-public` 构建

### SSR 动态站（云服务器）

1. 推送 tag（`v*.*.*`）自动触发构建，下载 `nuxt-build.tar.gz`
2. 解压后用 PM2 启动: `pm2 start ecosystem.config.js --env production`
3. Nginx 配置参考 `nuxt/NuxtNginx.txt`

### Worker 部署

```bash
cd cloudflare-worker
npx wrangler deploy
```

### GitHub Actions 构建目标

通过 `workflow_dispatch` 手动触发，可选：
- `nuxt-ssr` — 仅构建 SSR 动态站
- `nuxt-public` — 仅构建静态站并部署到 Pages
- `both` — 同时构建两者

## 环境变量

### nuxt-public/.env.production

```env
NUXT_PUBLIC_API_BASE_URL=https://backend.wasd09090030.top/api
NUXT_API_BASE_URL=https://backend.wasd09090030.top/api
NUXT_PUBLIC_SITE_URL=https://wasd09090030.top
```

### nuxt/ 生产环境

```env
NUXT_PUBLIC_API_BASE_URL=/api
NUXT_API_BASE_URL=http://127.0.0.1:5000/api
NUXT_PUBLIC_SITE_URL=https://wasd09090030.top
```

## 关键配置说明

- **SSR 资源路径**: `nuxt/nuxt.config.ts` 中 `app.buildAssetsDir: '/_ssr/'`，避免与 Pages 的 `/_nuxt/` 冲突
- **预渲染路由**: `nuxt-public/nuxt.config.ts` 的 `prerender:routes` hook 在构建时从 API 获取所有文章 ID + slug，生成 `/article/{id}-{slug}` 路由
- **Nginx 重定向**: `server.wasd09090030.top` 上的公共路由（`/`、`/article/*`、`/gallery` 等）会 301 到 `wasd09090030.top`
- **Worker 路由**: `cloudflare-worker/router.js` 中 `SERVER_ROUTES` 定义哪些路径转发到云服务器

## 编码规范

- Vue/Nuxt: 2 空格缩进，组件 PascalCase，组合式函数 `useXxx`
- C#: 4 空格缩进，PascalCase 公开成员，camelCase 局部变量
- 样式: Tailwind + 组件样式文件（`assets/css/components/*.styles.css`）
- 新增前端业务代码优先进入 `features/*`

## 相关文档

- [Cloudflare Pages 部署指南](doc/CloudflarePages-Deploy-Guide.md)
- [混合架构说明](doc/Hybrid-Architecture.md)
- [API 接口文档](API_INTERFACE_DOCUMENTATION.md)
- [图床实现说明](IMAGEBED_IMPLEMENTATION.md)
- [MDC 组件指南](MDC_COMPONENTS_GUIDE.md)

---

**开发者**: WyrmKk
**最后更新**: 2026-02-25
