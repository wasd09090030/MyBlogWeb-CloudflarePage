# Cloudflare 生产环境切换手册

本手册用于在没有独立 .NET API 或 PM2/Nginx 运行时依赖的情况下部署博客。发布顺序固定：

```text
D1 migrations -> blog-admin Worker -> blog-router Worker -> Pages
```

在所有前置条件和下述冒烟测试完成之前，切勿切换流量。

## 1. 唯一部署负责人

使用 GitHub Actions 作为生产部署的唯一负责人。仓库工作流已经按依赖顺序部署 D1、`blog-admin`、`blog-router` 和 Pages。

在 Cloudflare 控制台中，断开现有 `blogworkermixed` Worker 的 Git 构建集成：

1. 打开 **Workers & Pages**，选择 `blogworkermixed`。
2. 打开 **Settings** -> **Builds**。
3. 选择 **Disconnect**（断开连接）。

当前连接的 Worker 名称为 `blogworkermixed`，而本仓库在 `cloudflare-worker/wrangler.toml` 中声明的是 `blog-router`。Cloudflare Workers Builds 要求控制台中的 Worker 名称与 Wrangler 名称一致。同时启用 Workers Builds 和 GitHub Actions 也会产生两条相互竞争的部署路径。

如果必须保留 Workers Builds，请在此处停止，并在部署前同时修改 Wrangler Worker 名称、CI 引用和相关文档。请勿部署名称不匹配的配置。

## 2. GitHub Actions 凭据

在 GitHub 仓库中，打开 **Settings** -> **Secrets and variables** -> **Actions**，创建仓库密钥（Secrets）：

| Secret | 用途 |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | 运行 D1 迁移并部署 Workers 和 Pages |
| `CLOUDFLARE_ACCOUNT_ID` | 选择目标 Cloudflare 账户 |

在 Cloudflare 中创建账户级（account-scoped）API Token，将其限制在生产账户，并授予以下权限：

- Account：**Workers Scripts - Edit**
- Account：**D1 - Edit**
- Account：**Pages - Edit**
- Account：**Workers Routes - Edit**，仅当 CI 也负责 Worker Routes 时

不要将 Token 存储在 `wrangler.toml`、`.env`、D1 或任何已提交的文件中。GitHub 会在工作流日志中遮蔽仓库密钥。Token 缺失或受环境限制时，Wrangler 会在运行 `d1 migrations apply` 之前就失败。

## 3. Cloudflare 资源

在目标账户中创建或复用生产资源：

```powershell
cd nuxt-admin
npx wrangler d1 create blog-db
npx wrangler r2 bucket create <production-bucket-name>
```

使用返回的 D1 `database_id` 和现有生产 R2 bucket 名称更新 `nuxt-admin/wrangler.toml`。已提交的 `REPLACE_WITH_D1_DATABASE_ID` 和 `blog-media-dev` 值不是可部署的生产配置。

针对 `blog-admin` Worker 设置运行时密钥（secrets），逐个交互式输入每个值；切勿将其粘贴到源文件中。

```powershell
npx wrangler secret put SESSION_PEPPER --config wrangler.toml
npx wrangler secret put ADMIN_RESET_TOKEN --config wrangler.toml
npx wrangler secret put DEEPSEEK_API_KEY --config wrangler.toml
npx wrangler secret put PAGES_DEPLOY_HOOK_URL --config wrangler.toml
```

当 AI 摘要被禁用时，`DEEPSEEK_API_KEY` 是可选的。对于 Pages 重建，配置 `PAGES_DEPLOY_HOOK_URL` 或受范围限制的 Cloudflare API 回退方案，但不要使用 D1 中无范围限制的凭据。切换前请轮换（rotate）现有的遗留 Token。

## 4. D1 数据切换

在维护窗口之前，先在本地导出并验证：

```powershell
cd nuxt-admin
npm run db:export
npm run db:migrate:local
node scripts/sqlite-d1-import.mjs --input .data/d1-import.sql --database blog-db --config wrangler.toml --chunk-size 400000
npx wrangler d1 execute blog-db --local --command "PRAGMA foreign_key_check" --config wrangler.toml
```

在维护窗口期间：

1. 备份 SQLite 源数据库。
2. 停止旧后台的写入，或将遗留部署切换为只读模式。
3. 导出最终的 SQLite 快照。
4. 应用远程迁移并导入该快照。
5. 验证计数、外键、具有代表性的文章 ID/slug 以及具有代表性的 R2 对象键。

```powershell
npm run db:migrate:remote
node scripts/sqlite-d1-import.mjs --input .data/d1-import.sql --database blog-db --config wrangler.toml --remote --chunk-size 400000
npx wrangler d1 execute blog-db --remote --command "PRAGMA foreign_key_check" --config wrangler.toml
```

导入器会刻意拆分较大的文本字段，因为 D1 将单条 SQL 语句限制为 100 KB。请勿用原始 SQLite dump 替换它。

## 5. 部署并切换流量

将已审阅的提交推送到 `main`，然后从 GitHub Actions 运行 **Build and Release**。工作流必须按顺序显示以下成功的作业：

1. `deploy-admin`：应用 D1 迁移并部署 `blog-admin`。
2. `deploy-router`：使用 `BLOG_ADMIN -> blog-admin` Service Binding 部署 `blog-router`。
3. `deploy-public`：生成并部署 Pages 产物。

在 `blog-admin` 存在之前，不要重试 router 构建。出现类似 `Service binding 'BLOG_ADMIN' references Worker 'blog-admin' which was not found` 的 router 失败，是后台部署失败或缺失的下游症状。

在首次成功部署后，将公共主机名绑定到 `blog-router`，或在 Cloudflare 控制台中更新其路由。`blog-router` 将 `/admin`、`/api`、`/images` 和 `/_ssr` 转发给 `blog-admin`；所有其他路径转发到 Pages。

## 6. 生产冒烟测试

通过公共主机名运行以下测试，而不是通过 workers.dev 子域名：

```powershell
curl.exe -sS -o NUL -w "articles=%{http_code}`n" https://<public-host>/api/articles?limit=1
curl.exe -sS -o NUL -w "admin=%{http_code}`n" https://<public-host>/admin/login
curl.exe -sS -o NUL -w "beatmap=%{http_code}`n" https://<public-host>/api/beatmaps/test
```

预期结果：

| 检查项 | 预期结果 |
| --- | --- |
| 公共页面 | `200` 且带有 Cloudflare 响应头 |
| `/api/articles` 和 `/api/gallery` | `200`，D1 支撑的数据 |
| `/admin/login` | `200`，且具有 private/no-store 缓存行为 |
| 重置、登录、会话、登出 | 成功；登出会使不透明会话失效 |
| `/api/beatmaps/test` | `410`，带 `BEATMAP_API_RETIRED` |
| `/images/<public-id>` | 现有 R2 图片及缓存头 |
| Pages 部署操作 | 记录了新的 Pages 部署 |

`/api/beatmaps/test` 返回 `404` 意味着公共主机名仍然访问的是旧部署或旧路由，这不是成功的迁移结果。

## 7. 故障排查指南

| 症状 | 原因 | 处理措施 |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` is required | GitHub 密钥缺失、为空或对该工作流不可用 | 创建/修复 Actions 密钥，并从 `deploy-admin` 重新运行 |
| `BLOG_ADMIN` Worker was not found | `blog-admin` 未部署成功 | 先修复后台作业；不要单独重试 router |
| Worker 名称不匹配 | Cloudflare Workers Builds 连接到一个名称不同的 Worker | 断开 Builds，或在部署前统一所有名称 |
| D1 导入内容过大 | 单条原始 SQL 语句超过 D1 的限制 | 使用 `sqlite-d1-export.mjs` 和 `sqlite-d1-import.mjs` |
| 后台变更操作返回 403 | 请求 Origin 与 `ADMIN_ORIGIN` 不匹配 | 检查 Worker 变量和公共主机名 |
| 登录返回 503 | `SESSION_PEPPER` 未配置 | 设置 Worker 密钥并重新部署/重试 |

## 8. 回滚与观察

在观察窗口期间，保持旧 .NET API 和旧 `nuxt/` 部署为只读。在检查生产环境中的会话、媒体 URL、Pages 重新生成和公共 API 契约之前，不要删除 D1、R2 或遗留源码。

如果在产生新写入之前需要回滚，请恢复之前的路由目标。一旦 D1 已接受生产写入，请将回滚视为数据迁移决策，而不仅仅是路由变更。

## 参考资料

- Cloudflare API tokens：`https://developers.cloudflare.com/fundamentals/api/get-started/create-token/`（2026-08-02 核对）
- Cloudflare Workers Builds 名称要求：`https://developers.cloudflare.com/workers/ci-cd/builds/`（2026-08-02 核对）
- Service Binding 转发：`https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/http/`（2026-08-02 核对）
- D1 查询与外键指南：`https://developers.cloudflare.com/d1/best-practices/query-d1/`（2026-08-02 核对）
