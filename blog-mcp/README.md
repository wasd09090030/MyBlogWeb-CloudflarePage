# blog-mcp

把博客后台的能力包装成 MCP 工具，让 Claude Code / Claude Desktop 直接读写文章、画廊、日记、图床并触发公开站重建。它在本机以 **stdio** 子进程运行，自身不碰数据库，所有请求都打到线上 `blog-api` 的 `/api/mcp/*`（Bearer 鉴权）。

## 前置条件

- Node.js **>= 20.19**（`package.json` 的 `engines` 要求；`api.js` 用到 `node:fs` 的 `openAsBlob`）
- 一个能登录博客后台的管理员账号密码
- `blog-api` 已经应用过 `nuxt-admin/migrations/0011_mcp_tokens.sql`（见文末「维护者：部署顺序」）

## 首次使用（新机器）

### 1. 安装依赖

```powershell
cd D:\Work_space\MyBlogWeb-CloudflarePage\blog-mcp
npm install
```

`node_modules/` 已被根 `.gitignore` 的 `**/node_modules/` 覆盖，不会被提交。

### 2. 登录换 token

```powershell
cd D:\Work_space\MyBlogWeb-CloudflarePage\blog-mcp
node src/index.js login --label my-laptop
```

把 `my-laptop` 换成能认出这台机器的名字（PowerShell 里 `<...>` 是重定向语法，不要照抄尖括号）。

命令会依次提示 `用户名:` 和 `密码:`（密码回显为 `*`）。成功后打印标签、到期时间和 scope，并把凭证写到：

- Windows：`%APPDATA%\blog-mcp\credentials.json`
- 其他平台：`$XDG_CONFIG_HOME/blog-mcp/credentials.json`（回退 `~/.config/blog-mcp/`）

**token 明文只在这个文件里，任何命令都不会把它打印到终端。** 凭证文件与仓库无关，删掉 `blog-mcp/` 目录不会带走它。

`login` 的可选参数：

| 参数 | 作用 |
| --- | --- |
| `--label <name>` | 凭证标签，用于认出是哪台机器。省略时取主机名，最长 64 字符 |
| `--read-only` | 只申请 `mcp:read`。之后调用任何写工具都会得到 `403 Insufficient scope: mcp:write` |
| `--days <1-90>` | 有效期天数，默认 30。CLI 直接拒绝越界值（服务端另有一层 90 天夹取） |
| `--help` | 打印用法 |

### 3. 确认登录成功

```powershell
node src/index.js status
```

输出用户名、标签、scope、到期时间和当前服务器地址。失败时按下面的「排错」处理。

`logout` 会先用自身 token 调 `POST /api/mcp/token/revoke` 吊销服务端记录，再删除本机凭证文件；若因网络问题吊销失败，本机凭证会保留，可稍后重试。

## 注册到 Claude Code

在任意目录执行（`--` 之后是真正要启动的命令）：

```powershell
claude mcp add blog --scope user -- node D:\Work_space\MyBlogWeb-CloudflarePage\blog-mcp\src\index.js serve
```

- `--scope user`：对本机所有项目生效。只想在某个项目里用就换成 `--scope project`。
- 上面的路径指向主检出目录。若你在某个 `git worktree` 里工作，换成那个 worktree 的绝对路径，例如 `D:\Work_space\MyBlogWeb-CloudflarePage\.claude\worktrees\feat-blog-mcp\blog-mcp\src\index.js`。
- 需要自定义环境变量时用 `-e`：

```powershell
claude mcp add blog --scope user -e BLOG_MCP_UPLOAD_ROOTS=D:\Pictures -- node D:\Work_space\MyBlogWeb-CloudflarePage\blog-mcp\src\index.js serve
```

注册后用 `claude mcp list` 确认状态，重启会话即可看到 13 个工具。

## 注册到 Claude Desktop

编辑 `%APPDATA%\Claude\claude_desktop_config.json`（Windows），在 `mcpServers` 下加一项。JSON 里的反斜杠要写两次：

```json
{
  "mcpServers": {
    "blog": {
      "command": "node",
      "args": [
        "D:\\Work_space\\MyBlogWeb-CloudflarePage\\blog-mcp\\src\\index.js",
        "serve"
      ],
      "env": {
        "BLOG_MCP_UPLOAD_ROOTS": "D:\\Pictures"
      }
    }
  }
}
```

改完完全退出并重启 Claude Desktop。

## 环境变量

这些变量由**启动 `serve` 的那个进程**读取，所以要在注册命令里通过 `-e`（Claude Code）或 `env`（Claude Desktop）传进去，而不是只在当前 PowerShell 窗口里 `$env:`。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `BLOG_MCP_URL` | `https://wasd09090030.top` | API 基址，末尾斜杠会被去掉。本地联调指向 `http://localhost:3000` |
| `BLOG_MCP_UPLOAD_ROOTS` | 未设置（不限制目录） | 允许 `image_upload` 读取的本地根目录白名单。Windows 用 `;` 分隔，macOS/Linux 用 `:` 分隔 |

设置 `BLOG_MCP_UPLOAD_ROOTS` 的意义：模型被提示注入后可以把任意本地文件上传成一个公开 URL，这是本客户端最现实的一条外泄路径。把它限制在图片目录里，能挡住绝大部分误操作。校验会按 `realpath` 再比一次，白名单目录里的符号链接/junction 逃不出去。

## 工具清单（13 个，没有删除类工具）

| 工具 | 作用 | 关键入参 |
| --- | --- | --- |
| `article_list` | 分页列出文章元信息（不含正文） | `page?`、`pageSize?`（默认 20，≤50） |
| `article_get` | 按 id 读单篇全文 | `id` |
| `article_create` | 新建文章 | `title`\*、`contentMarkdown`\*、`slug?`、`category?`、`tags?`、`coverImage?`、`aiSummary?` |
| `article_update` | 按 id 增量更新文章 | `id`\* + 上述任意字段 |
| `article_summarize` | 调服务端 AI 生成摘要与建议 slug，不写库 | `title`\*、`content`\*（≤80000 字符） |
| `image_list` | 列出图床文件 | `dir?`、`search?`、`start?`、`count?`（≤100）、`recursive?` |
| `image_upload` | 上传本机图片到图床（上传后公开可访问） | `filePath`\*（绝对路径） |
| `gallery_list` | 分页列出画廊条目 | `page?`、`pageSize?`（默认 100，≤200） |
| `gallery_create` | 新增画廊条目 | `imageUrl`\*、`tag?`、`sortOrder?`、`isActive?` |
| `gallery_update` | 按 id 更新画廊条目 | `id`\* + 上述任意字段，外加 `createdAt?` |
| `diary_list` | 分页列出日记元信息（含未公开） | `page?`、`pageSize?`（默认 50，≤100） |
| `diary_upsert` | 按日期写入/覆盖日记，一天一条 | `date`\*、`contentMarkdown`\*、`mood?`、`weather?`、`location?`、`tags?`、`isPublic?`（**默认 false**） |
| `rebuild_public_site` | 触发公开站重建 | — |

\* 必填。

**没有删除类工具。** `blog-mcp` 这一侧没有任何工具能删文章、画廊、图床文件或日记；服务端 `/api/mcp/*` 上也没有 DELETE 分支（恒为 404）。删除仍然只能去后台手动操作。

几条行为约定：

- `image_upload` 只接受**绝对路径**，扩展名限 `.jpg` / `.jpeg` / `.png` / `.webp` / `.gif` / `.avif`，单文件 ≤ 50 MB。校验在读取文件内容之前完成，被拒的路径一个字节都不会上传。
- `diary_upsert` 不传 `isPublic` 时一律**不公开**，只有显式传 `true` 才会发到公开站。
- 写操作改的是线上数据，但公开站是静态生成的：文章/画廊/日记改动后要调 `rebuild_public_site`（或后台按钮）才会出现在公开站，通常需要几分钟。
- 工具失败时返回的是给人看的中文/英文原因，不是异常堆栈。

## 安全说明

- token 是 `bmcp_` 开头的随机串，服务端只存 `SHA-256(pepper:token)`，明文只在签发时返回一次。
- 默认有效期 30 天，最长 90 天；scope 分 `mcp:read` / `mcp:write`。
- 每台机器用不同 `--label`，丢机器时可以单独吊销那一枚。
- 修改或重置管理员密码会**吊销该账号的全部 MCP token**，所有机器都需要重新 `login`。
- 拥有 Worker 部署权限的人可以替换 `SESSION_PEPPER`，属于平台边界；不要把部署权限交给不受信任的人。

## 维护者：部署顺序

`/api/mcp/*` 只由 `blog-api` 处理，所以首次启用或后续改动都要按仓库固定顺序发布。**迁移必须先于 Worker 部署**：`mcp_tokens` 表若不存在，签发 token 与所有 Bearer 校验都会失败。

```powershell
cd nuxt-admin
npm run db:migrate:remote   # 先应用 0011_mcp_tokens.sql
npm run deploy:api
```

这两个命令会改线上数据库和线上 Worker，需由有权限的人执行。本地验证用：

```powershell
cd nuxt-admin
npm run check:free-config
npm run check:mcp

cd ../blog-mcp
npm run smoke
```

## 排错

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `凭证已失效或已被吊销，请重新运行 blog-mcp login` | token 过期、被单独吊销，或改密/重置密码吊销了全部 token | 重新执行 `node src/index.js login --label my-laptop` |
| `403 Insufficient scope: mcp:write` | 这枚 token 是 `--read-only` 签发的，只有 `mcp:read` | 重登一次（不带 `--read-only`），或用另一台机器的读写 token |
| `403 Password reset is required`（工具调用）/ `管理员密码需要重置，请先在后台完成重置`（`login`） | 账号被标记为必须重置密码 | 先在后台完成密码重置，再重新 `login` |
| `无法连接 …，检查网络或 BLOG_MCP_URL` | `BLOG_MCP_URL` 写错、代理/网络不通，或线上 Worker 未部署 | 确认 `BLOG_MCP_URL`；浏览器打开 `https://wasd09090030.top` 看是否可达；本地联调时确认 `nuxt dev` 已启动 |
| `尚未登录，请先运行 blog-mcp login` | 本机没有凭证文件（`serve` / `status` 会遇到） | 先 `login`；若已登录过，检查是不是在另一个用户账户下运行的 |
| 工具提示凭证已失效，但手动 `status` 正常 | 客户端启动的进程读不到凭证（例如用了不同的 `APPDATA`） | 用 `claude mcp list` 确认注册的命令，与手动 `node src/index.js status` 用同一环境 |
| 机器丢失 / 需要远程吊销 | 凭证文件在那台机器上，本地无法操作 | 见下方「吊销某台机器的 token」 |

### 吊销某台机器的 token

用浏览器登录 `https://wasd09090030.top/admin`，打开开发者工具的 **Console**，在**当前同源页面**里执行（不要切到别的标签页）：

```js
// 1. 列出本账号所有 token，按 label 认出要吊销那条，记下它的 id
console.table((await (await fetch('/api/mcp/tokens')).json()).tokens)

// 2. 把下面的 ID 换成上一步看到的 id（纯数字），执行吊销
const ID = 3
await fetch(`/api/mcp/tokens/${ID}/revoke`, { method: 'POST' })
```

两条都依赖后台的 Cookie 会话，所以必须在已登录的同源页面里执行。第一条返回 `{ tokens: [...] }`，每项含 `id`、`tokenPrefix`、`label`、`scopes`、`createdAt`、`lastUsedAt`、`expiresAt`、`revokedAt`（**不含 token 明文**），按 `label` 认机器。

或者更省事：**直接修改管理员密码**，它会一次性吊销该账号的全部 MCP token（以及其它浏览器会话），所有机器重新 `login` 即可。

## 相关文件

| 路径 | 作用 |
| --- | --- |
| `blog-mcp/src/index.js` | CLI：`login` / `logout` / `status` / `serve` |
| `blog-mcp/src/tools.js` | 13 个工具的定义（新增/修改工具改这里，并同步本 README） |
| `blog-mcp/src/upload.js` | `image_upload` 的本地路径校验（扩展名、根目录白名单、50 MB） |
| `blog-mcp/src/api.js` | HTTP 客户端与错误文案 |
| `nuxt-admin/server/routes/api/mcp/[...path].ts` | 服务端 `/api/mcp/*` 端点与鉴权 |
| `nuxt-admin/server/domain/mcp-token.ts` | token 签发、校验、吊销 |
| `nuxt-admin/migrations/0011_mcp_tokens.sql` | `mcp_tokens` 表 |
