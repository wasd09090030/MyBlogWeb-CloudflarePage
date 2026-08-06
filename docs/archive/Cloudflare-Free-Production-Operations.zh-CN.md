# Cloudflare Free 生产上线操作手册

> 状态：生产环境步骤尚未执行。本手册是 `cloudflare-admin-d1-migration` 的人工操作清单，目标是在不升级 Workers Paid、不为博客 Admin 绑定 R2 的前提下上线。

## 0. 已完成与未完成

已在本地完成：Admin 静态 SPA 构建、`blog-api` Worker 构建、D1 本地迁移/导入校验、路由测试和本地冒烟。

尚未完成：真实 Free Worker 的 PBKDF2 canary、生产 D1 创建与最终导入、Worker Secrets、Pages/Worker 部署、公共域名绑定和生产冒烟。完成下文全部步骤前，**不要推送到 `main`**；该分支的 push 会触发真实部署，而不是演练。

以下内容永远不应提交、发送给其他人或填入 Pages 前端变量：`IMAGE_API_TOKEN`、`SESSION_PEPPER`、`ADMIN_RESET_TOKEN`、`CLOUDFLARE_API_TOKEN`、管理员密码。

## 1. 操作地点总览

| 事项 | 在哪里操作 | 选择/填写内容 |
| --- | --- | --- |
| Cloudflare 账户与资源 | [Cloudflare Dashboard](https://dash.cloudflare.com/) | 使用现有 Free 账户；不要升级 Workers Paid，不要为博客新建 R2 bucket |
| D1 数据库 | Dashboard -> Workers & Pages -> D1 SQL Database，或 PowerShell | 名称：`blog-db` |
| Admin Pages | Dashboard -> Workers & Pages -> Create -> Pages，或 Wrangler | 选择 **Direct Upload**；项目名：`myblog-admin` |
| Public Pages | Dashboard -> Workers & Pages -> Create -> Pages，或 Wrangler | 选择 **Direct Upload**；项目名：`myblogweb-cloudflarepage` |
| API Worker Secrets | PowerShell 中的 `wrangler secret put` | 配置到 `blog-api`，不是 Pages 项目 |
| GitHub 部署凭据 | [GitHub Actions Secrets](https://github.com/wasd09090030/MyBlogWeb-CloudflarePage/settings/secrets/actions) | `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID` |
| GitHub 非敏感变量 | [GitHub Actions Variables](https://github.com/wasd09090030/MyBlogWeb-CloudflarePage/settings/variables/actions) | Pages 项目名、D1 名称；`BLOG_DB_ID` 需先完成第 2 节的工作流调整 |
| 部署结果 | [GitHub Actions 工作流](https://github.com/wasd09090030/MyBlogWeb-CloudflarePage/actions/workflows/release.yml) | 观察 `deploy-api -> deploy-admin-pages -> deploy-router -> deploy-public` |
| 公共域名路由 | Dashboard -> Workers & Pages -> `blog-router` -> Settings -> Domains & Routes | 将 `wasd09090030.top/*` 绑定到 `blog-router` |

官方参考： [Workers Free 限制](https://developers.cloudflare.com/workers/platform/limits/)、[D1](https://developers.cloudflare.com/d1/)、[Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)、[Wrangler 配置](https://developers.cloudflare.com/workers/wrangler/configuration/)、[Worker Routes](https://developers.cloudflare.com/workers/configuration/routing/routes/)。

## 2. 先解决 D1 ID 注入问题

当前 `nuxt-admin/wrangler.toml` 的 `database_id` 是 `REPLACE_WITH_D1_DATABASE_ID`。GitHub 工作流只读取 `BLOG_DB_NAME`，**尚未读取 `BLOG_DB_ID`**，因此只在 GitHub 添加变量不会生效。

在创建 D1 前，选择一种方式：

1. 推荐：修改工作流，在构建时从 GitHub Actions Variable `BLOG_DB_ID` 注入 D1 ID。这样生产 ID 不进入仓库；完成修改后，在 Variables 新建 `BLOG_DB_ID`。
2. 快速方式：把 D1 ID 写入 `nuxt-admin/wrangler.toml` 并随部署提交。D1 ID 不是密钥，但这与仓库当前“不提交生产标识符”的文档约定不一致，因此不推荐。

没有完成此项时，工作流会在远程 D1 迁移或 `blog-api` 部署阶段失败。

## 3. 创建 Cloudflare 资源

### 3.1 登录并创建 D1

在 PowerShell 中：

```powershell
cd D:\Work_space\MyBlogWeb-CloudflarePage\nuxt-admin
npx wrangler login
npx wrangler d1 create blog-db
```

浏览器授权时选择目标 Cloudflare 账户。命令输出中的 `database_id` 是第 2 节所需的 `BLOG_DB_ID` 值。数据库名称必须与 `nuxt-admin/wrangler.toml` 和 GitHub Variable `BLOG_DB_NAME` 一致，即 `blog-db`。

不要执行 `wrangler r2 bucket create`：图片二进制属于独立图床项目，本项目只保存图片 URL、对象 key 和画廊等元数据。

### 3.2 创建两个 Pages 项目

本仓库由 GitHub Actions 调用 Wrangler 上传静态产物，因此选择 **Direct Upload**，不要给这两个 Pages 项目连接 Git 仓库，以免产生第二条部署链路。

可在 Dashboard 创建，也可执行两次：

```powershell
npx wrangler pages project create
```

交互选项如下：

| 次序 | Project name | Production branch | 部署目录（由 CI 使用） |
| --- | --- | --- | --- |
| 1 | `myblog-admin` | `main` | `nuxt-admin/.output/public/admin` |
| 2 | `myblogweb-cloudflarepage` | `main` | `nuxt-public/.output/public` |

项目创建后确认默认域名分别为：

- `https://myblog-admin.pages.dev`
- `https://myblogweb-cloudflarepage.pages.dev`

若名称或默认域名不同，先更新 `cloudflare-worker/wrangler.toml` 中的 `ADMIN_PAGES_ORIGIN`、`PUBLIC_PAGES_ORIGIN`，以及 GitHub Variables 中对应的项目名，再部署。

### 3.3 核对非敏感 Worker 变量

在 `nuxt-admin/wrangler.toml` 中，以下值会部署到 `blog-api`，上线前必须确认真实有效：

| 变量 | 当前预期 | 核对要点 |
| --- | --- | --- |
| `ADMIN_ORIGIN` | `https://wasd09090030.top` | 必须是浏览器访问 Admin 的公共源站 |
| `PUBLIC_SITE_ORIGIN` | `https://wasd09090030.top` | 用于公开 URL 和 Origin 校验 |
| `PUBLIC_ASSET_ORIGIN` | `https://cfimg.wasd09090030.top` | 独立图床公开文件域名 |
| `IMAGE_API_BASE_URL` | `https://cfimg.wasd09090030.top` | 独立图床 API 基地址，不能是 `blog-api` 自身 |
| `DEFAULT_UPLOAD_FOLDER` | `uploads` | 图床允许的默认目录 |

若公共域名不是 `wasd09090030.top`，还必须同时更新 `.github/workflows/release.yml` 中的 `NUXT_PUBLIC_ADMIN_ORIGIN`、`NUXT_API_BASE_URL`、`NUXT_PUBLIC_SITE_URL`。

## 4. 配置 `blog-api` Worker Secrets

在 `nuxt-admin/` 目录执行。每条命令会交互式读取值，输入不会显示在终端：

```powershell
npx wrangler secret put IMAGE_API_TOKEN --config wrangler.toml
npx wrangler secret put SESSION_PEPPER --config wrangler.toml
npx wrangler secret put ADMIN_RESET_TOKEN --config wrangler.toml
```

可选能力按需配置：

```powershell
npx wrangler secret put PAGES_DEPLOY_HOOK_URL --config wrangler.toml
npx wrangler secret put DEEPSEEK_API_KEY --config wrangler.toml
```

选项说明：

| Secret | 必需性 | 值的来源 | 不配置时的结果 |
| --- | --- | --- | --- |
| `IMAGE_API_TOKEN` | 图片上传/列表/删除必需 | 独立图床项目的 API Token | 图床管理接口返回 `503` |
| `SESSION_PEPPER` | 登录必需 | 随机高熵字符串 | 有 Cookie 的会话校验返回 `503` |
| `ADMIN_RESET_TOKEN` | 首次管理员创建/重置必需 | 随机高熵字符串 | 重置接口返回 `503` |
| `PAGES_DEPLOY_HOOK_URL` | 可选 | Pages Deploy Hook URL | 应用内触发 Pages 部署不可用 |
| `DEEPSEEK_API_KEY` | 可选 | DeepSeek 密钥 | AI 摘要不可用 |

设置完后，在 Dashboard -> Workers & Pages -> `blog-api` -> Settings -> Variables and Secrets 中确认名称存在；不要在该页面、GitHub Variables、D1 或 SPA 中填写图床 token。

## 5. 配置 GitHub Actions

### 5.1 创建 Cloudflare API Token

打开 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)，选择 **Create Token** -> **Create Custom Token**。

选择目标账户，并授予最小所需权限：

- Account -> **Workers Scripts** -> **Edit**
- Account -> **D1** -> **Edit**
- Account -> **Cloudflare Pages** -> **Edit**

公共域名 Route 由 Dashboard 手工配置时，不必为 CI 增加 Workers Routes 权限。若将来改为 CI 管理 Route，再增加 Account -> **Workers Routes** -> **Edit**。

### 5.2 写入 GitHub Secrets 和 Variables

在 [GitHub Secrets 页面](https://github.com/wasd09090030/MyBlogWeb-CloudflarePage/settings/secrets/actions) 选择 **New repository secret**：

| 名称 | 值 |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | 第 5.1 节创建的 Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard 目标账户的 Account ID |

在 [GitHub Variables 页面](https://github.com/wasd09090030/MyBlogWeb-CloudflarePage/settings/variables/actions) 选择 **New repository variable**：

| 名称 | 值 |
| --- | --- |
| `BLOG_DB_NAME` | `blog-db` |
| `ADMIN_PAGES_PROJECT_NAME` | `myblog-admin` |
| `PAGES_PROJECT_NAME` | `myblogweb-cloudflarepage` |
| `BLOG_DB_ID` | 第 3.1 节的 database ID；仅在第 2 节推荐方案完成后添加 |

不要把 Worker Secrets 放到 GitHub Variables。变量会传给构建环境，Secrets 也不应被用作图床 Token 的浏览器运行时配置。

## 6. 生产 D1 数据导入

在维护窗口执行。开始前：备份 SQLite；停止旧后台写入；确保独立图床仍可读取已有对象。

```powershell
cd D:\Work_space\MyBlogWeb-CloudflarePage\nuxt-admin
npm run db:export
npm run db:migrate:remote
node scripts/sqlite-d1-import.mjs --input .data/d1-import.sql --database blog-db --config wrangler.toml --remote --chunk-size 400000
npx wrangler d1 execute blog-db --remote --command "PRAGMA foreign_key_check" --config wrangler.toml
```

通过以下标准后才继续：外键检查无输出；文章、评论、画廊计数与导出 manifest 一致；代表性的 slug、画廊排序、图片 URL/对象 key 可用；D1 中不存在 `cf_image_configs`、`beatmap_sets`、`beatmap_difficulties`。

首次导入前，工作流没有公开流量时可回退路由。D1 接受生产写入后，回退必须先导出/恢复或制定反向同步方案。

## 7. 首次部署、域名路由和 Free canary

### 7.1 触发部署

检查以下项目都完成后，才将部署提交推送到 `main`：D1 ID 注入、Pages 项目、Worker Secrets、生产数据导入、GitHub Secrets/Variables。

```powershell
git status --short
git push origin main
```

不要暂存或提交现有未跟踪文件 `docs/Cloudflare-Production-Cutover.zh-CN.md`，除非它经过单独审阅。推送后在 [Build and Release](https://github.com/wasd09090030/MyBlogWeb-CloudflarePage/actions/workflows/release.yml) 查看顺序：

1. `deploy-api`
2. `deploy-admin-pages`
3. `deploy-router`
4. `deploy-public`

`workflow_dispatch` 的 `target` 目前不会选择性跳过下游部署，因此不能当作 dry-run 或仅部署单个项目的安全替代方案。

### 7.2 绑定公共域名

在 Cloudflare Dashboard 中打开 `blog-router`：**Workers & Pages -> blog-router -> Settings -> Domains & Routes -> Add**。

添加 Worker Route：

```text
wasd09090030.top/*
```

选择 Worker：`blog-router`。若同时提供 `www`，再单独添加 `www.wasd09090030.top/*`。确认 DNS 记录由 Cloudflare 代理；不要把公共域名直接绑定到任一 Pages 项目，否则 `/admin/api/*` 与 `/api/*` 不会到达 `blog-api`。

### 7.3 真实 Free PBKDF2 canary

在 `blog-api` 已部署、但正式切流前执行一次管理员 reset/login，并在 Dashboard -> Workers & Pages -> `blog-api` -> Logs 中查看该请求的 CPU 时间。必须保持当前 PBKDF2 `210000` iterations；若超过 Free Worker 可接受预算，停止切换并单独评审，不得静默降低迭代次数。

## 8. 上线后冒烟和回滚

通过公共域名检查：

```powershell
curl.exe -sS -o NUL -w "articles=%{http_code}`n" https://wasd09090030.top/api/articles?limit=1
curl.exe -sS -o NUL -w "admin=%{http_code}`n" https://wasd09090030.top/admin/login
curl.exe -sS -o NUL -w "beatmap=%{http_code}`n" https://wasd09090030.top/api/beatmaps/test
```

预期：文章 API `200`；Admin 登录页 `200`；Beatmap `410`。随后验证登录、登出、改密、画廊写入、图床上传/查询/删除，以及 `/images/<public-id>` 返回到已验证图床 URL 的 `302`。

观察期内保持旧 .NET 和旧 Nuxt 只读。若 D1 尚无新写入，回滚是将公共域名 Route 指回旧入口；一旦 D1 已有新写入，先执行数据恢复或反向同步决策，不能只切回旧路由。

## 9. 官方资料

- [Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)
- [D1 documentation](https://developers.cloudflare.com/d1/)
- [Wrangler configuration: D1 and service bindings](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Workers CLI commands](https://developers.cloudflare.com/workers/wrangler/commands/workers/)
- [Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)
- [Pages continuous integration deployment](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)
- [Worker Routes](https://developers.cloudflare.com/workers/configuration/routing/routes/)
