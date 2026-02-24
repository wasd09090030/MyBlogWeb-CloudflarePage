# Cloudflare Pages 部署指南

## 一、首次部署

### 1.1 Cloudflare Dashboard 创建项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages → Create
2. 选择 **Connect to Git** → 授权 GitHub → 选择 `MyBlogWeb-CloudflarePage` 仓库
3. 配置构建设置：

| 配置项 | 值 |
|--------|-----|
| Production branch | `main` |
| Root directory (advanced) | `nuxt-public` |
| Build command | `npm ci && npm run generate` |
| Build output directory | `.output/public` |

4. 添加环境变量（Production + Preview 都配）：

| 变量名 | 值 |
|--------|-----|
| `NUXT_PUBLIC_API_BASE_URL` | `https://backend.wasd09090030.top/api` |
| `NUXT_API_BASE_URL` | `https://backend.wasd09090030.top/api` |
| `NUXT_PUBLIC_SITE_URL` | `https://blog.wasd09090030.top` |
| `NODE_VERSION` | `18` |

5. 点击 **Save and Deploy**，等待首次构建完成

### 1.2 绑定自定义域名

1. Pages 项目 → Custom domains → Add domain
2. 输入 `blog.wasd09090030.top`
3. Cloudflare 会自动配置 DNS CNAME 记录和 SSL 证书

---

## 二、触发重新构建 + 部署

### 2.1 代码推送自动触发

推送到 `main` 分支时，Cloudflare Pages 自动触发构建：

```bash
git add nuxt-public/
git commit -m "update: 修改前端代码"
git push origin main
```

> 注意：只有 `nuxt-public/` 目录下的变更才需要重新部署。Cloudflare Pages 目前不支持路径过滤，每次 push 都会触发构建。

### 2.2 Deploy Hook（后端发布文章后自动触发）

这是最关键的场景：后端发布/更新/删除文章后，需要触发前端重新构建以更新静态页面。

**创建 Deploy Hook：**

1. Pages 项目 → Settings → Builds & deployments → Deploy hooks
2. 点击 **Add deploy hook**
3. 名称填 `backend-article-update`，分支选 `main`
4. 复制生成的 Webhook URL（格式：`https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/xxx`）

**后端调用方式：**

在 .NET 后端的文章 CRUD 操作完成后，发送 POST 请求触发重建：

```csharp
// 在 ArticlesController 的 Create/Update/Delete 方法末尾调用
private async Task TriggerCloudflarePagesRebuild()
{
    using var http = new HttpClient();
    await http.PostAsync("你的_DEPLOY_HOOK_URL", null);
}
```

或者用 curl 手动触发：

```bash
curl -X POST "你的_DEPLOY_HOOK_URL"
```

### 2.3 手动触发

- **Dashboard**：Pages 项目 → Deployments → 点击最近一次部署的 **Retry deployment**
- **Wrangler CLI**：

```bash
cd nuxt-public
npm run generate
npx wrangler pages deploy .output/public --project-name=你的项目名
```

### 2.4 GitHub Actions 自动化（可选）

在 `.github/workflows/pages-public.yml` 中配置定时或手动触发：

```yaml
name: Deploy Public Site

on:
  # 代码变更触发
  push:
    branches: [main]
    paths: ['nuxt-public/**']
  # 手动触发
  workflow_dispatch:
  # 定时重建（每天凌晨 3 点，保持文章数据最新）
  schedule:
    - cron: '0 19 * * *'  # UTC 19:00 = 北京时间 03:00

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: npm
          cache-dependency-path: nuxt-public/package-lock.json
      - run: npm ci
        working-directory: nuxt-public
      - run: npm run generate
        working-directory: nuxt-public
        env:
          NUXT_PUBLIC_API_BASE_URL: https://backend.wasd09090030.top/api
          NUXT_API_BASE_URL: https://backend.wasd09090030.top/api
          NUXT_PUBLIC_SITE_URL: https://blog.wasd09090030.top
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy nuxt-public/.output/public --project-name=你的项目名
```

需要在 GitHub 仓库 Settings → Secrets 中添加：
- `CLOUDFLARE_API_TOKEN`：Cloudflare API Token（需要 Pages 编辑权限）
- `CLOUDFLARE_ACCOUNT_ID`：Cloudflare 账户 ID

---

## 三、原 Nuxt 应用功能兼容方案

当前 `nuxt-public/` 只包含前台公开页面。以下是将原 `nuxt/` 中其他功能逐步迁入的方案：

### 3.1 功能分类与迁移策略

| 功能 | 当前状态 | 迁移策略 | 优先级 |
|------|----------|----------|--------|
| 首页 + 文章列表 | ✅ 已迁移 | — | — |
| 文章详情页 | ✅ 已迁移 | — | — |
| 画廊 | ✅ 已迁移 | — | — |
| 关于页 | ✅ 已迁移 | — | — |
| 教程页 | ✅ 已迁移 | — | — |
| 评论系统 | ✅ 已迁移 | 客户端运行时调用后端 API | — |
| 搜索功能 | ✅ 已迁移 | Web Worker 客户端搜索 | — |
| **工具箱** | ❌ 未迁移 | 纯前端，可直接复制 | 高 |
| **Mania 音游** | ❌ 未迁移 | 纯前端，可直接复制 | 中 |
| **后台管理** | ❌ 不迁移 | 保留在原 nuxt/ 部署 | — |
| **图床管理** | ❌ 不迁移 | 保留在原 nuxt/ 部署 | — |

### 3.2 迁移工具箱页面

工具箱页面（base64 转换、图片处理、密码生成等）是纯前端功能，不依赖后端 API，可以直接迁入：

```bash
# 1. 复制页面
cp -r nuxt/app/pages/tools nuxt-public/app/pages/

# 2. 复制依赖的组件（如果有）
# ImageProcessor.vue 和 MarkdownConverter.vue 需要检查依赖

# 3. 添加导航链接
# 在 nuxt-public/app/layouts/default.vue 的导航中添加工具箱链接
```

注意事项：
- 工具箱页面应配置为 **客户端渲染**（不需要 SSG），在 `nuxt.config.ts` 中添加：
  ```ts
  routeRules: {
    '/tools/**': { ssr: false }  // 工具页纯客户端渲染
  }
  ```
- 检查是否依赖 naive-ui 组件，如有需替换

### 3.3 迁移 Mania 音游

```bash
# 1. 复制页面和组件
cp -r nuxt/app/pages/mania nuxt-public/app/pages/
cp -r nuxt/app/components/mania nuxt-public/app/components/

# 2. 复制游戏资源
cp -r nuxt/public/assets/textures nuxt-public/public/assets/
cp -r nuxt/public/pointer nuxt-public/public/

# 3. 添加 pixi.js 依赖
cd nuxt-public && npm install pixi.js
```

同样配置为客户端渲染：
```ts
routeRules: {
  '/mania/**': { ssr: false }
}
```

### 3.4 后台管理保持独立

后台管理（`/admin/*`）不应迁入 Cloudflare Pages，原因：
- 需要认证状态（Pinia auth store）
- 依赖 naive-ui 完整组件库
- 需要实时数据，不适合静态化
- 安全考虑：管理接口不应暴露在 CDN 上

**推荐方案**：后台管理继续使用原 `nuxt/` 项目，部署在云服务器上，通过 `admin.wasd09090030.top` 或 `wasd09090030.top/admin` 访问。

### 3.5 客户端动态功能说明

以下功能在静态页面中通过客户端 JS 运行，无需特殊处理：

- **评论提交/加载**：页面加载后客户端调用 `https://backend.wasd09090030.top/api` 获取评论
- **文章搜索**：Web Worker 在客户端执行全文搜索
- **主题切换**：localStorage 存储，纯客户端
- **画廊交互**：Slider、缩放拖拽等均为客户端行为
- **分页/筛选**：客户端路由导航，Nuxt 会自动 fetch 对应的 payload

---

## 四、架构总览

```
用户浏览器
    │
    ├── blog.wasd09090030.top (Cloudflare Pages)
    │   ├── 首页、文章、画廊、教程、关于 (静态 HTML)
    │   ├── 工具箱、音游 (客户端渲染，可选迁入)
    │   └── 客户端 JS → 调用后端 API (评论、搜索等)
    │
    └── wasd09090030.top (云服务器)
        ├── /admin/* (后台管理，SSR)
        └── 后端 API (backend.wasd09090030.top)
            └── .NET 后端 (80 端口)
```

## 五、常见问题

### Q: 发布新文章后前端没更新？
A: 静态站点需要重新构建。使用 Deploy Hook 或手动触发重建。

### Q: 构建失败怎么排查？
A: Cloudflare Pages → Deployments → 点击失败的部署查看构建日志。常见原因：
- 后端 API 不可达（构建时需要拉取文章数据）
- Node.js 版本不匹配
- 依赖安装失败

### Q: 文章页面 SEO 效果如何？
A: 每篇文章都是完整的静态 HTML，包含标题、描述、Open Graph、Schema.org 结构化数据，对搜索引擎非常友好。

### Q: Cloudflare Pages 免费额度够用吗？
A: 免费计划包含每月 500 次构建、无限带宽、无限请求。对于博客完全够用。
