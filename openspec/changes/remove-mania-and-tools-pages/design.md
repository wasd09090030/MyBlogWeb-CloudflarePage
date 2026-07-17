# Design: 删除 mania 与 tools 公开页面

## 1. 范围边界原则

遵循 AGENTS.md 第 2.2 节"范围受控"：仅做删除 + 引用清理，不顺手重构相邻文件、不卸载独立依赖。

- **不**卸载 `nuxt/package.json` 中仅为 `pages/tools/*` 服务的依赖（如有）。首先确认：所有 `nuxt/app/pages/tools/*.vue` 都未引入工具库（`browser-image-compression` 仅在 `ImageProcessor.vue` 中使用——已随该文件删除；`@bg-dev/nuxt-naiveui`、`naive-ui` 仍被 admin 全站使用，保留）。`@nuxtjs/mdc` 仍被 `article-detail` 间接使用，保留。
- **不**修改 `nuxt/nuxt.config.ts`（除验证构建仍通过外）。
- **不**删除 admin 侧其他无关文件。

## 2. 关键引用清单（grep 已验证）

### `nuxt/` 内 4 类引用

1. **页面自身**（直接删除）：
   - `pages/tools/*` 6 个文件
   - `pages/mania/*` 2 个文件
   - `components/mania/KeyBindingModal.vue`
2. **admin 后台（删除）**：
   - `pages/admin/beatmaps/index.vue` 314 行 `navigateTo('/mania/${difficultyId}')` 与 277 行 `'上传成功，已解析 osu!mania 谱面'` 提示
   - `pages/admin/index.vue` 153 行 dashboard 入口「谱面管理」按钮
   - `layouts/admin.vue` 95 行侧边栏 `path: '/admin/beatmaps'`
3. **布局导航（修改）**：
   - `layouts/default.vue` 第 22、39、257-260、271-275、302、333-335 行
4. **共享组件（按依赖性选择性删除）**：
   - `components/ImageProcessor.vue`：仅 `pages/tools/image-processor.vue` 引用 → 整文件删除
   - `components/MarkdownConverter.vue`：仅 `pages/tools/markdown-converter.vue` 引用 → 整文件删除
   - 其余 `components/*` 仍被其他页面使用，保留

### 跨项目引用（`nuxt-public/`）

- `app/layouts/default.vue` 第 23、40、84、90 行（顶部导航 + 移动端抽屉，硬编码外链 `<a href="/tools">` 与 `<a href="/mania">`）

### 部署配置

- `cloudflare-worker/router.js` 第 14 行 `SERVER_ROUTES = ['/admin', '/tools', '/mania', '/api', '/images', '/_ssr']` → 移除 `/tools`、`/mania`
- `nuxt/NuxtNginx.txt` 注释 3 处
- `.github/workflows/release.yml` 注释 3 处

## 3. 删除后行为

### 静态站 `nuxt-public/`

- 顶部导航（桌面端）当前 6 项（首页/画廊/工具箱/其他）→ 删除后 4 项（首页/画廊/其他）
- 「其他」下拉项当前 3 项（归档/音游/关于）→ 删除后 2 项（归档/关于）
- 移动端抽屉当前 6 项 → 删除后 4 项

### SSR 站 `nuxt/`

- `layouts/default.vue` 顶部导航（桌面端）当前 4 项（首页/画廊/工具箱/其他）→ 删除后 3 项（首页/画廊/其他）
- 移动抽屉当前 4 项（首页/画廊/工具箱/其他）→ 删除后 3 项
- `mobileMenuOptions` 数组中 7 项 → 5 项
- `showSidebar` 简化：移除 `!isToolsRoute.value && !isManiaRoute.value`

### Worker 路由

- 访问 `wasd09090030.top/tools` 与 `/mania`：Worker 判定非 SERVER_ROUTES → 走 Cloudflare Pages → Cloudflare Pages 自身静态站无对应路径 → 返回 404
- 注意：静态站 `nuxt-public/` 的 `nuxt.config.ts` 配 `nitro.prerender:routes` 不会预渲染 `/tools` 或 `/mania`，404 是预期行为

### 后端 `.NET API`

- `/api/beatmaps` 与 `/api/beatmaps/difficulty/{id}`、`/api/beatmaps/import`（admin）仍存在但**无前端调用方**
- 风险：API 成为僵尸端点。如需"真清理"，可后续追加一个独立 change 处理；本 change 用户已明确选择保留后端。

## 4. 风险与边界

| 风险 | 等级 | 缓解 |
|---|---|---|
| 用户浏览器书签 `/tools` 或 `/mania` 直接打开 → 404 | 低 | 这两个产品线已不在维护目标，404 符合预期；可在后续 change 中加 301 跳转到首页（如需要） |
| 第三方外站引用了 `wasd09090030.top/tools` 或 `/mania` | 极低 | 个人博客无外部链接；可通过 Cloudflare Pages 自定义 404 页面提示"页面已下线"（非本 change 范围） |
| `nuxt/components/mania/KeyBindingModal.vue` 删除后 `localStorage` 残留 `mania-keybindings` 键 | 无 | 浏览器侧数据，不影响功能；下次访问任意页面也不再读取 |
| admin 用户仍可管理 Beatmap，但无 `/mania` 详情页可预览 | 中 | 用户已确认接受此行为；admin 操作仍可保存到 DB，未来恢复 `/mania` 时数据可用 |
| `nuxt-ssr-nuxt-ui-v4-migration` change 的 task 3.6 引用 `admin/beatmaps/index.vue` | 低 | 提交本 change 后，下游 change 需手动跳过该任务；不在本 change 自动调整 |
| `nuxt-ssr-tailwind-v4-upgrade` 提到 `/admin/beatmaps` 在冒烟测试中 | 低 | 本 change 完成后，admin 7 个页面变 6 个；下游 change 的 6.5 任务清单需去掉 beatmaps |
| 后端 Beatmap API 无调用方但仍占用构建资源 | 无 | 编译期会被 tree-shake 保留（控制器类未被引用消除）；运行期 API 仍响应但无流量 |

## 5. 不在本 change 范围（显式排除）

- 卸载 `naive-ui`、`@bg-dev/nuxt-naiveui`（admin 仍用）
- 卸载 `@nuxtjs/mdc`、`@vueuse/core` 等（admin 仍用）
- 改 Cloudflare Pages 404 页面
- 后端 Beatmap API 与数据库清理
- admin 其它无关改动
- Nuxt UI v4 迁移（独立 change）

## 6. 验证策略

### 静态分析

1. `grep -rE "/tools|/mania|mania-keybindings" nuxt/ nuxt-public/ cloudflare-worker/` → 期望：仅命中历史注释（无业务代码）
2. `grep -rE "Beatmap" backend-dotnet/BlogApi/` → 期望：保持现状（无新增删除）

### 构建验证

1. `cd nuxt && npm run build` → 期望：构建成功，`.output/` 中无 `tools` 或 `mania` 路径产物
2. `cd nuxt-public && npm run generate` → 期望：构建成功，路由清单不含 `/tools` `/mania`
3. `cd backend-dotnet/BlogApi && dotnet build` → 期望：编译通过（未修改后端，预期通过）

### 运行时验证（开发模式）

1. `cd nuxt && npm run dev` → 访问 `http://localhost:3000/`：
   - 顶部导航仅 3 项（首页/画廊/其他）
   - 抽屉仅 3 项
   - 访问 `/tools` → 渲染 404 页面
   - 访问 `/mania` → 渲染 404 页面
   - 访问 `/admin`（未登录 → 重定向登录页）正常
2. `cd nuxt-public && npm run dev` → 访问 `http://localhost:3000/`：
   - 顶部导航 4 项（首页/画廊/其他）
   - 抽屉 4 项
   - 访问 `/tools` 与 `/mania` → 因外链 target=_blank 不在站内，按预期落到 SSR 站 → SSR 站 404
3. `cd cloudflare-worker && npx wrangler dev` → 模拟请求：
   - `curl https://server.wasd09090030.top/tools` → 应被 Pages 处理返回 404
   - `curl https://server.wasd09090030.top/admin` → 应被转发到云服务器

### 端到端冒烟

- Cloudflare Pages 部署 nuxt-public 后，浏览器访问 wasd09090030.top 顶部导航无死链
- 云服务器 SSR 部署 nuxt 后，admin 全部 6 个页面（去掉 beatmaps）正常登录与管理

## 7. 记忆更新

完成后追加 `.memory/progress/current.md` 条目：

- 删除 mania 与 tools 公开页（change: `remove-mania-and-tools-pages`）：
  - 删除 nuxt/ 公开页与 admin/beatmaps；清理跨项目导航；Worker 路由、CI/CD 注释同步更新
  - 后端 Beatmap API 保留（用户决策 2026-07-17）
  - 验证：nuxt build 成功、nuxt-public generate 成功、运行时 404 行为符合预期
