# 混合架构部署方案

## 架构概览

```
wasd09090030.top (Cloudflare Worker 路由分发)
│
├── /                    → Cloudflare Pages (nuxt-public 静态)
├── /article/*           → Cloudflare Pages
├── /gallery             → Cloudflare Pages
├── /tutorials           → Cloudflare Pages
├── /about               → Cloudflare Pages
│
├── /admin/*             → 云服务器 (nuxt 动态 SSR)
├── /tools/*             → 云服务器
├── /mania/*             → 云服务器
│
└── backend.wasd09090030.top → 云服务器 (.NET 后端 API)
```

## 核心原理

使用 Cloudflare Worker 作为统一入口，根据 URL 路径将请求分发到不同后端：
- 静态页面 → Cloudflare Pages（全球 CDN，快速加载）
- 动态页面 → 云服务器（SSR，需要认证/实时数据）

两个项目独立部署、独立构建，互不影响。

## 部署步骤

### 第一步：部署 Cloudflare Pages（静态站）

参考 `CloudflarePages-Deploy-Guide.md`，将 `nuxt-public/` 部署到 Pages。

部署完成后记录 Pages 域名，如 `myblog-public.pages.dev`。

> 此时先不绑定自定义域名，自定义域名由 Worker 统一管理。

### 第二步：确保云服务器可访问

云服务器上的 `nuxt/` 项目需要通过一个地址可达，两种方式：

**方式 A：子域名（推荐）**
- 配置 `server.wasd09090030.top` 指向云服务器 IP
- Nginx 反向代理到 Nuxt SSR 端口

**方式 B：直接 IP + 端口**
- 如 `http://你的服务器IP:3000`

### 第三步：部署 Cloudflare Worker

1. 修改 `cloudflare-worker/router.js` 中的配置：
   ```js
   const PAGES_ORIGIN = 'https://myblog-public.pages.dev'  // 你的 Pages 地址
   const SERVER_ORIGIN = 'https://server.wasd09090030.top'  // 你的云服务器地址
   ```

2. 部署 Worker：
   ```bash
   cd cloudflare-worker
   npx wrangler deploy
   ```

3. 在 Cloudflare Dashboard 配置路由：
   - Workers & Pages → blog-router → Settings → Triggers
   - 添加 Route: `wasd09090030.top/*`
   - 添加 Route: `www.wasd09090030.top/*`（如需要）

### 第四步：统一导航

两个项目的 `layouts/default.vue` 使用相同的导航菜单：

```
首页 (/)  |  画廊 (/gallery)  |  教程 (/tutorials)  |  工具箱 (/tools)  |  关于 (/about)
```

由于都在同一域名下，NuxtLink 和 `<a>` 标签都能正常跳转：
- 从 `/tools`（云服务器）点击"首页" → 浏览器请求 `/` → Worker 分发到 Pages
- 从 `/`（Pages）点击"工具箱" → 浏览器请求 `/tools` → Worker 分发到云服务器

> 跨项目跳转会触发完整页面加载（非 SPA 导航），这是正常的。
> 同项目内的跳转仍然是 SPA 导航，体验流畅。

## 独立部署互不影响

| 场景 | 操作 | 影响范围 |
|------|------|----------|
| 发布新文章 | 触发 Pages 重建 | 仅静态站更新，云服务器不受影响 |
| 修改工具箱代码 | 推送 nuxt/ 并重启服务器 | 仅动态站更新，Pages 不受影响 |
| 修改 Worker 路由规则 | `wrangler deploy` | 仅路由层更新，两个站点不受影响 |
| 后端 API 更新 | 重启 .NET 服务 | 两个前端都不需要重新部署 |

## 注意事项

### 跨项目跳转的体验优化

跨项目跳转是全页面刷新，可以通过以下方式减少感知：

1. **共享 CSS 变量和主题**：两个项目使用相同的 `theme-variables.css`，切换时视觉一致
2. **共享 favicon 和 logo**：品牌元素一致
3. **Loading 动画**：两个项目都配置相同的页面加载动画

### Cookie 和认证

同一域名下 Cookie 自动共享，所以：
- 用户在 `/admin/login` 登录后，Cookie 对所有路径可用
- 如果 Pages 站点需要读取登录状态（如显示用户头像），可以通过客户端 JS 读取 Cookie

### 静态资源缓存

Worker 会透传 Cloudflare Pages 的缓存头，静态资源（JS/CSS/图片）仍然享受 CDN 缓存。

### 备选方案：不用 Worker

如果不想引入 Worker，也可以用 **Nginx 在云服务器上做路由分发**：

```nginx
server {
    listen 443 ssl;
    server_name wasd09090030.top;

    # 动态路由 → 本地 Nuxt SSR
    location ~ ^/(admin|tools|mania) {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 其余路由 → Cloudflare Pages
    location / {
        proxy_pass https://myblog-public.pages.dev;
        proxy_set_header Host myblog-public.pages.dev;
        proxy_ssl_server_name on;
    }
}
```

但这种方式所有流量都经过云服务器，失去了 CDN 加速的优势。推荐使用 Worker 方案。
