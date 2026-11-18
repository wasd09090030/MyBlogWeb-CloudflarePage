# blog-mcp

把博客后台的能力包装成 MCP 工具，让 Claude Code / Claude Desktop 直接读写文章、画廊、日记、图床并触发公开站重建。它在本机以 **stdio** 子进程运行，自身不碰数据库，业务请求都打到线上 `blog-api` 的 `/api/mcp/*`（Bearer 鉴权）。登录与 token 管理是这条规则的例外：`POST /api/mcp/token` 用账号密码换 token，`/api/mcp/tokens` 两条管理路由只认后台 Cookie 会话。

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
| `--read-only` | 只申请 `mcp:read`。之后所有写操作——包括不落库的 `article_summarize`——都会得到 `403 Insufficient scope: mcp:write` |
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
- 上面的路径指向主检出目录。若你在某个 `git worktree` 里工作，换成那个 worktree 的绝对路径，例如 `D:\Work_space\MyBlogWeb-CloudflarePage\.claude\worktrees\feat+blog-mcp\blog-mcp\src\index.js`。
- 需要给 `serve` 传环境变量时用 `-e`。目前只有 `BLOG_MCP_UPLOAD_ROOTS` 属于这一类（`BLOG_MCP_URL` 是在 `login` 时读的，见「环境变量」）：

```powershell
claude mcp add blog --scope user -e BLOG_MCP_UPLOAD_ROOTS=D:\Pictures -- node D:\Work_space\MyBlogWeb-CloudflarePage\blog-mcp\src\index.js serve
```

注册后用 `claude mcp list` 确认状态，重启会话即可看到 16 个工具。

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

两个变量的**生效时机不同**，这一点很容易搞错：

- `BLOG_MCP_URL` 在 **`login` 时**读取，并被写进 `credentials.json` 的 `baseUrl`。之后 `serve` 只从凭证文件里取这个值，**不再用环境变量决定请求目标**。所以要改服务器地址，必须带着新值重新 `login`。
- `BLOG_MCP_UPLOAD_ROOTS` 在**每次 `image_upload` 调用时**读取，所以它属于 `serve` 进程，要通过注册命令的 `-e`（Claude Code）或 `env`（Claude Desktop）传进去。

| 变量 | 何时读取 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `BLOG_MCP_URL` | 仅在 `login` 时（决定并持久化请求目标；错误文案也用它） | `https://wasd09090030.top` | API 基址，末尾斜杠会被去掉。`status` 输出里的「服务器」就是它 |
| `BLOG_MCP_UPLOAD_ROOTS` | 每次调用 `image_upload` 时 | 未设置（不限制目录） | 允许读取的本地根目录白名单。Windows 用 `;` 分隔，macOS/Linux 用 `:` 分隔。**这是唯一需要在注册时用 `-e` / `env` 传递的变量** |

`BLOG_MCP_URL` 用在哪台服务器，从登录那一刻就固定了。注册 `serve` 时再加 `-e BLOG_MCP_URL=...` **不会**改变请求目标，网络失败或超时的提示也仍然报凭证文件里的地址。**不要给 `serve` 传 `BLOG_MCP_URL`。**

设置 `BLOG_MCP_UPLOAD_ROOTS` 的意义：模型被提示注入后可以把任意本地文件上传成一个公开 URL，这是本客户端最现实的一条外泄路径。把它限制在图片目录里，能挡住绝大部分误操作。校验会按 `realpath` 再比一次，白名单目录里的符号链接/junction 逃不出去。

### 本地联调

先带着本地地址登录，再注册一个不带 `-e BLOG_MCP_URL` 的 `serve`：

```powershell
cd D:\Work_space\MyBlogWeb-CloudflarePage\blog-mcp
$env:BLOG_MCP_URL = 'http://localhost:3000'
node src/index.js login --label local-dev
```

确认 `node src/index.js status` 的「服务器」显示 `http://localhost:3000` 后，按上面的命令注册 `serve` 即可（不需要 `-e`）。注意 `status` 的「服务器」行只有在成功连上服务端后才会打印；如果它只报 `无法连接 …`，报错里已经写出了本次真正请求的地址（见「排错」表）。

联调结束想回到线上，重新跑一次 `login` 并让它不再看到该变量——**同一份凭证文件里只存一个地址**，所以本地联调会顶掉线上的凭证。`$env:BLOG_MCP_URL` 在当前 PowerShell 窗口里是持续生效的，直接重跑 `login` 仍会读到旧值；用下面任一方式清掉它：

```powershell
Remove-Item Env:BLOG_MCP_URL     # 在本窗口清掉，再 login
```

或者干脆**新开一个 PowerShell 窗口**（新窗口没有这个变量），在那里执行 `cd D:\Work_space\MyBlogWeb-CloudflarePage\blog-mcp` 和 `node src/index.js login --label my-laptop`。

## 工具清单（16 个，含 3 个删除工具）

| 工具 | 作用 | 关键入参 |
| --- | --- | --- |
| `article_list` | 分页列出文章元信息（不含正文） | `page?`、`pageSize?`（默认 20，≤50） |
| `article_get` | 按 id 读单篇全文 | `id` |
| `article_create` | 新建文章 | `title`\*、`contentMarkdown`\*、`slug?`、`category?`、`tags?`、`coverImage?`、`aiSummary?` |
| `article_update` | 按 id 增量更新文章。`coverImage` / `aiSummary` 传 `null` 可清空 | `id`\* + 上述任意字段 |
| `article_delete` | ⚠️ **危险、不可恢复**：删除文章。只删 D1 行，不动图床文件 | `id`\*、`confirm`\*（必须等于 `id`） |
| `article_summarize` | 调服务端 AI 生成摘要与建议 slug。**不写库，但需要 `mcp:write`**（服务端 `/ai/summary` 挂在写 scope 下） | `title`\*、`content`\*（≤80000 字符） |
| `image_list` | 列出图床文件。**不是纯只读**：服务端会把列出的文件登记进图片资源表 | `dir?`、`search?`、`start?`、`count?`（≤100）、`recursive?` |
| `image_upload` | 上传本机图片到图床（上传后公开可访问） | `filePath`\*（绝对路径）、`folder?`（图床目录，如 `Study`；省略时用后台配置的上传目录） |
| `gallery_list` | 分页列出画廊条目 | `page?`、`pageSize?`（默认 100，≤200） |
| `gallery_create` | 新增画廊条目 | `imageUrl`\*、`tag?`、`sortOrder?`、`isActive?` |
| `gallery_update` | 按 id 更新画廊条目 | `id`\* + 上述任意字段，外加 `createdAt?` |
| `gallery_delete` | ⚠️ **危险、不可恢复**：删除画廊条目并**真删图床原文件**；文件仍被引用时服务端 409 拒绝 | `id`\*、`confirm`\*（必须等于 `id`） |
| `diary_list` | 分页列出日记元信息（含未公开） | `page?`、`pageSize?`（默认 50，≤100） |
| `diary_upsert` | 按日期写入/覆盖日记，一天一条 | `date`\*、`contentMarkdown`\*、`mood?`、`weather?`、`location?`、`tags?`、`isPublic?`（**默认 false**） |
| `diary_delete` | ⚠️ **危险、不可恢复**：删除某天的日记 | `date`\*、`confirm`\*（必须等于 `date`） |
| `rebuild_public_site` | 触发公开站重建 | — |

\* 必填。

**删除只覆盖三类：** 文章、画廊条目、日记。三个删除工具都要求 `confirm` 回填目标值，不匹配时客户端直接拒绝。图床文件没有被暴露成删除工具，删除仍然只能去后台手动操作。


几条行为约定：

- `image_upload` 只接受**绝对路径**，扩展名限 `.jpg` / `.jpeg` / `.png` / `.webp` / `.gif` / `.avif`，单文件 ≤ 50 MB。校验在读取文件内容之前完成，被拒的路径一个字节都不会上传。可选 `folder` 覆盖图床目录；服务端会拒绝含 `..` 或 http(s) 前缀的值（400）。
- `diary_upsert` 不传 `isPublic` 时一律**不公开**，只有显式传 `true` 才会发到公开站。
- 写操作改的是线上数据，但公开站是静态生成的：文章/画廊/日记改动后要调 `rebuild_public_site`（或后台按钮）才会出现在公开站，通常需要几分钟。
- 工具失败时返回的是给人看的中文/英文原因，不是异常堆栈。

## 安全说明

**删除工具**：`article_delete` / `gallery_delete` / `diary_delete` 都要求 `confirm` 回填目标值（文章 id、画廊 id、日记日期），
不匹配时客户端直接拒绝、一个请求都不会发出。这是防模型误触的护栏，不是安全边界——真正的边界是 `mcp:write` scope。
`gallery_delete` 会真删图床原文件；图床文件删除（`deleteMedia`）**没有**暴露给 MCP，因为它没有引用检查，删掉被文章引用的图会直接坏图。

- token 是 `bmcp_` 开头的随机串，服务端只存 `SHA-256(pepper:token)`，明文只在签发时返回一次。
- 默认有效期 30 天，最长 90 天；scope 分 `mcp:read` / `mcp:write`。
- 每台机器用不同 `--label`，丢机器时可以单独吊销那一枚。
- 修改或重置管理员密码会**吊销该账号的全部 MCP token**，所有机器都需要重新 `login`。
- 拥有 Worker 部署权限的人可以替换 `SESSION_PEPPER`，属于平台边界；不要把部署权限交给不受信任的人。

## 维护者：部署顺序

`/api/mcp/*` 只由 `blog-api` 处理，所以首次启用或后续改动都要按仓库固定顺序发布。**迁移必须先于 Worker 部署**，否则不只是 MCP 坏掉：`mcp_tokens` 表不存在时，签发 token 和所有 Bearer 校验都会失败；更要紧的是，吊销 token 的那条 `UPDATE mcp_tokens ...` 是改密（`changeAdminPassword`）与重置（`resetOrBootstrapAdmin`）batch 里的第三条语句，表不存在会让整个 batch 回滚并返回 500——也就是说，**在 Worker 已部署、迁移还没跑的那段时间里，管理员虽然还能登录，却既改不了密码也重置不了密码**（`must_reset` 也清不掉）。

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
| `无法连接 …，检查网络或 BLOG_MCP_URL` | 登录时记下的地址不可达、代理/网络不通，或线上 Worker 未部署 | 报错里的地址就是本次真正请求的地址（登录阶段来自 `BLOG_MCP_URL` 或默认值，之后来自凭证文件）。地址不对 → 带着正确的 `BLOG_MCP_URL` 重新 `login`（给 `serve` 加 `-e` 没用）；地址对 → 排查网络，本地联调确认 `nuxt dev` 已启动 |
| `请求超时（30 秒）…` | 30 秒内没收到响应：网络很慢，或服务端仍在处理（例如公开站重建） | 不要立刻重试写操作；先用 `status` 或对应的列表工具确认上一次是否已经生效 |
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
| `blog-mcp/src/tools.js` | 16 个工具的定义（新增/修改工具改这里，并同步本 README） |
| `blog-mcp/src/upload.js` | `image_upload` 的本地路径校验（扩展名、根目录白名单、50 MB） |
| `blog-mcp/src/api.js` | HTTP 客户端与错误文案 |
| `nuxt-admin/server/routes/api/mcp/[...path].ts` | 服务端 `/api/mcp/*` 端点与鉴权 |
| `nuxt-admin/server/domain/mcp-token.ts` | token 签发、校验、吊销 |
| `nuxt-admin/migrations/0011_mcp_tokens.sql` | `mcp_tokens` 表 |
