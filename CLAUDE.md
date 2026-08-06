# CLAUDE.md

本项目个人博客采用 Cloudflare Free 混合部署。**部署不再依赖 GitHub Actions 推送自动部署**，统一通过本地 Wrangler 手动发布，或通过后台「重构 nuxt-public」按钮触发公开站重建。

项目概览、编码与提交规范见 [AGENTS.MD](AGENTS.MD)，架构说明见 [README.md](README.md)。

## 部署架构（Cloudflare Free）

| 资源 | 类型 | 部署方式 |
| --- | --- | --- |
| `blog-api` | Worker（cloudflare_module，绑定 D1） | 本地 `npm run deploy:api` |
| `myblog-admin` | Pages（Direct Upload，静态 SPA） | 本地 `npm run deploy:pages` |
| `blog-router` | Worker（统一域名路由） | 本地 `npx wrangler deploy` |
| `myblogweb-cloudflarepage` | Pages（连接 Git，SSG 静态站） | Git 推送自动构建，或后台「重构 nuxt-public」按钮，或本地 `wrangler pages deploy` |
| `blog-db` | D1 SQL 数据库 | 迁移命令 `npm run db:migrate:remote` |

依赖关系：`blog-router` 通过 Service Binding 调用 `blog-api`（`BLOG_API`），并把 `/admin/api/*`、`/api/*`、`/images/*` 转发给 `blog-api`，`/admin/*` 转发给 `myblog-admin`，其余路径转发给 `myblogweb-cloudflarepage`。

## 部署顺序与命令

**发布顺序固定为**：`D1 migrations -> blog-api -> myblog-admin Pages -> blog-router -> myblogweb-cloudflarepage Pages`。

在 `nuxt-admin/` 目录执行：

```powershell
cd nuxt-admin
npm run check:free-config       # Free 配置检查
npm run check:image-api         # 图床 API 契约检查
npm run check:image-transform   # 图片变换检查
npm run db:migrate:remote       # 1. 应用 D1 迁移（必须先于 blog-api）
npm run deploy:api              # 2. 构建并部署 blog-api Worker
npm run deploy:pages            # 3. 生成并部署 myblog-admin Pages（静态 SPA）
```

发布路由分发（在 `cloudflare-worker/` 目录）：

```powershell
cd ../cloudflare-worker
npm test
npx wrangler deploy --config wrangler.toml   # 4. 部署 blog-router
```

发布公开站（在 `nuxt-public/` 目录，仅在需要绕过 Git 构建或本地发布时）：

```powershell
cd ../nuxt-public
$env:NUXT_PUBLIC_API_BASE_URL = '/api'
$env:NUXT_API_BASE_URL = 'https://wasd09090030.top/api'
$env:NUXT_PUBLIC_SITE_URL = 'https://wasd09090030.top'
npm run generate
npx wrangler pages deploy .output/public --project-name myblogweb-cloudflarepage
```

## 公开站重建（后台 trigger 按钮）

`myblogweb-cloudflarepage` 是 SSG 静态站，文章、画廊等**内容变更后不会自动更新**。有两种重建方式：

1. **后台「重构 nuxt-public」按钮**：登录 `https://wasd09090030.top/admin` 后，在内容工作台点击「重构 nuxt-public」或 Cloudflare Pages 卡片上的「触发重构」。该操作调用 `POST /admin/api/ops/pages/deploy-hook`，由 `blog-api` Worker 触发 Cloudflare Pages 重建（静态站会重新生成并发布，通常需要几分钟）。
2. Git 推送 `nuxt-public` 代码到 `main`：由于 `myblogweb-cloudflarepage` 连接了 Git，推送会触发 Cloudflare Pages 自动构建。

**前置条件**：后台 trigger 按钮依赖 `blog-api` 的 Worker Secret。优先配置 `PAGES_DEPLOY_HOOK_URL`（Pages Deploy Hook URL）；未配置时，`blog-api` 会回退到读取 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`PAGES_PROJECT_NAME` 三个 secret。未配置任一 secret 时该接口返回 503。Secret 设置命令：

```powershell
cd nuxt-admin
npx wrangler secret put PAGES_DEPLOY_HOOK_URL --config wrangler.toml   # 推荐
# 或回退方案
npx wrangler secret put CLOUDFLARE_API_TOKEN --config wrangler.toml
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --config wrangler.toml
```

`myblog-admin`（Direct Upload）和 `blog-api`、`blog-router` 两个 Worker 没有自动构建，修改代码后必须手动按上述顺序发布。

## 关键文件

- `nuxt-admin/wrangler.toml` — `blog-api` Worker 与 D1 配置
- `cloudflare-worker/wrangler.toml` — `blog-router` 与 Service Binding
- `nuxt-admin/DEPLOYMENT.md` — 完整迁移、冒烟与回滚清单
- `docs/CloudflarePages-Deploy-Guide.md` — Pages 部署说明
- `nuxt-admin/server/domain/operations.ts` — 后台 trigger 按钮（`triggerPagesDeploy`）实现
