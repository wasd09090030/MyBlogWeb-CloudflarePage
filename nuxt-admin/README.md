# Nuxt Admin

`nuxt-admin/` 是当前唯一活动的 `/admin/*` 管理后台。它使用 Nuxt 4 SSR、Nuxt UI v4、Tailwind CSS v4、CodeMirror 和 Nuxt MDC。

## 运行方式

```powershell
npm install
npm run dev
npm run typecheck
npm run build
```

本地入口为 `http://localhost:3000/admin/login`。后端默认在 `http://127.0.0.1:5000` 运行。

## 环境变量

```env
NUXT_API_BASE_URL=http://127.0.0.1:5000/api
NUXT_PUBLIC_ADMIN_ORIGIN=http://localhost:3000
```

生产环境将 `NUXT_PUBLIC_ADMIN_ORIGIN` 设为公开站域名，例如 `https://wasd09090030.top`。

浏览器请求始终发往同源 `/admin/api/*`。Nitro BFF 在服务器端转发到 `NUXT_API_BASE_URL`，并透传认证 Cookie；前端不会直接调用后端登录或受保护 API。

## 部署

构建产生 `.output/`。将其部署到云服务器，由 `ecosystem.config.cjs` 通过 PM2 启动。Nginx 必须：

- 将 `/admin/*` 代理到 Nuxt Admin；
- 提供 `/_ssr/*` 静态资源；
- 不缓存登录、会话和其他 `/admin/*` 响应。

Cloudflare Worker 已将 `/admin/*`、`/api/*`、`/images/*` 与 `/_ssr/*` 路由到云服务器。详细的发布与回滚检查清单见 [DEPLOYMENT.md](DEPLOYMENT.md)。
