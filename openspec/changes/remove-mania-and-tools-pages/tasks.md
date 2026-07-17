# Tasks: 删除 mania 与 tools 公开页面

> **状态**: ✅ 已完成（2026-07-17）— 11 个 atomic commit 已落到 `feature/remove-mania-and-tools-pages` 分支，3 个 build 全部通过，grep 业务代码零命中。
> 依赖：与 `nuxt-ssr-nuxt-ui-v4-migration`、`nuxt-ssr-tailwind-v4-upgrade` 并行可执行；建议先应用本 change。
> 阶段完成后归档命令：`openspec archive remove-mania-and-tools-pages`。
> 范围限定：严格按 proposal.md 的"删除/修改/不删除"清单执行，不顺手重构无关文件。

## 1. Phase R.0 — 预检与基线

- [x] 1.1 `git status` 确认工作区干净；当前分支 `main`
- [x] 1.2 创建并切换到 `feature/remove-mania-and-tools-pages` 分支
- [x] 1.3 记录基线构建产物（可选）：`ls nuxt/.output nuxt-public/.output 2>$null`
- [x] 1.4 grep 当前 `tools` / `mania` 引用基线（用于对比变更后清零）：
  - `grep -rEn "('/|/\")tools|('/|/\")mania" nuxt/ nuxt-public/ cloudflare-worker/`
  - 期望：至少 6 个文件命中（默认布局 × 2、Worker、CI/CD、NuxtNginx、README 等）

## 2. Phase R.1 — 删除 SSR 公开页面（`nuxt/app/pages/`）

- [x] 2.1 删除 `nuxt/app/pages/tools/` 整个目录（6 个 vue）
- [x] 2.2 删除 `nuxt/app/pages/mania/` 整个目录（2 个 vue）
- [x] 2.3 验证：`Test-Path nuxt/app/pages/tools` 与 `Test-Path nuxt/app/pages/mania` 都为 `False`
- [x] 2.4 单独 commit：`chore(nuxt): remove public tools and mania pages`

## 3. Phase R.2 — 删除相关组件

- [x] 3.1 删除 `nuxt/app/components/mania/` 整个目录（含 `KeyBindingModal.vue`）
- [x] 3.2 验证 `ImageProcessor.vue` 是否仅被 `pages/tools/image-processor.vue` 引用（已删除）：
  - `grep -rln "ImageProcessor" nuxt/`
  - 期望：仅 `nuxt/app/components/ImageProcessor.vue` 自身（自引用或无）
- [x] 3.3 验证 `MarkdownConverter.vue` 是否仅被 `pages/tools/markdown-converter.vue` 引用（已删除）：
  - `grep -rln "MarkdownConverter" nuxt/`
  - 期望：仅 `nuxt/app/components/MarkdownConverter.vue` 自身
- [x] 3.4 删除 `nuxt/app/components/ImageProcessor.vue`
- [x] 3.5 删除 `nuxt/app/components/MarkdownConverter.vue`
- [x] 3.6 单独 commit：`chore(nuxt): remove orphan tool components`

## 4. Phase R.3 — 删除 admin/beatmaps 与入口引用

- [x] 4.1 删除 `nuxt/app/pages/admin/beatmaps/` 整个目录
- [x] 4.2 修改 `nuxt/app/pages/admin/index.vue`：
  - 移除第 153 行 `<n-button block quaternary class="justify-start" @click="$router.push('/admin/beatmaps')">` 块（含图标与文字「谱面管理」）
  - 验证：`grep -n "beatmaps" nuxt/app/pages/admin/index.vue` 期望零命中
- [x] 4.3 修改 `nuxt/app/layouts/admin.vue`：
  - 移除第 95 行 `{ path: '/admin/beatmaps', label: '谱面管理', icon: 'musical-note' }`
  - 验证：`grep -n "beatmaps" nuxt/app/layouts/admin.vue` 期望零命中
- [x] 4.4 验证 `nuxt/app/middleware/admin-auth.ts` 不含 beatmaps 路由（已 grep 验证无）
- [x] 4.5 单独 commit：`chore(nuxt): remove admin/beatmaps entry points`

## 5. Phase R.4 — 清理 `nuxt/app/layouts/default.vue`

- [x] 5.1 移除第 22 行 `<NuxtLink to="/tools" class="nav-link">` 块（含 `wrench-screwdriver` 图标与「工具箱」文字）
- [x] 5.2 移除第 39 行 `<NuxtLink to="/mania" class="nav-more-item">` 块（含「音游」文字）
- [x] 5.3 简化 `mobileMenuOptions` 计算属性：
  - 移除第 257-260 行（工具箱项）
  - 移除第 271-275 行（音游项），保留 tutorials 与 about
- [x] 5.4 简化 `handleMobileMenuSelect`：
  - 移除 `localRoutes` 映射（`tools`、`mania` 键）
  - 该函数可改为仅保留 `pagesRoutes` 分支
- [x] 5.5 移除 `isToolsRoute` 与 `isManiaRoute` 计算属性（第 333-334 行）
- [x] 5.6 简化 `showSidebar` 计算属性（第 335 行）：移除 `!isToolsRoute.value && !isManiaRoute.value` 条件
- [x] 5.7 单独 commit：`refactor(nuxt): remove tools and mania references from default layout`

## 6. Phase R.5 — 清理 `nuxt-public/app/layouts/default.vue`

- [x] 6.1 移除第 23-25 行 `<a href="/tools" target="_blank" ...>` 块
- [x] 6.2 移除第 40-42 行 `<a href="/mania" target="_blank" ...>` 块
- [x] 6.3 移除第 84-86 行 `<a href="/tools" target="_blank" ...>` 抽屉项
- [x] 6.4 移除第 90-92 行 `<a href="/mania" target="_blank" ...>` 抽屉项
- [x] 6.5 验证：`grep -n "tools\|mania" nuxt-public/app/layouts/default.vue` 期望零命中
- [x] 6.6 单独 commit：`refactor(nuxt-public): remove tools and mania navigation links`

## 7. Phase R.6 — 更新 Cloudflare Worker 路由

- [x] 7.1 修改 `cloudflare-worker/router.js`：
  - 第 6 行注释 `admin/tools/mania` → `admin`
  - 第 14 行 `SERVER_ROUTES = ['/admin', '/tools', '/mania', '/api', '/images', '/_ssr']` → `SERVER_ROUTES = ['/admin', '/api', '/images', '/_ssr']`
- [x] 7.2 验证：`grep -n "tools\|mania" cloudflare-worker/router.js` 期望零命中
- [x] 7.3 单独 commit：`chore(worker): remove /tools and /mania from server routes`

## 8. Phase R.7 — 更新 Nginx 参考配置

- [x] 8.1 修改 `nuxt/NuxtNginx.txt`：
  - 第 5 行注释 `/admin/*, /tools/*, /mania/*` → `/admin/*`
  - 第 12 行注释 `├── /admin, /tools, /mania, /api` → `├── /admin, /api`
  - 第 157 行注释 `Worker 只会转发 /admin/*, /tools/*, /mania/*` → `Worker 只会转发 /admin/*`
- [x] 8.2 验证：`grep -n "tools\|mania" nuxt/NuxtNginx.txt` 期望零命中
- [x] 8.3 单独 commit：`docs(nuxt): update nginx config comments`

## 9. Phase R.8 — 更新 CI/CD

- [x] 9.1 修改 `.github/workflows/release.yml`：
  - 第 27 行注释 `# 处理 /admin, /tools, /mania 等动态路由` → `# 处理 /admin 等动态路由`
  - 第 83 行 release notes `处理路由：/admin/*, /tools/*, /mania/*` → `处理路由：/admin/*`
  - 第 95 行 release notes `动态页面（后台/工具箱/音游）` → `动态页面（后台）`
- [x] 9.2 验证：`grep -n "tools\|mania" .github/workflows/release.yml` 期望零命中
- [x] 9.3 单独 commit：`chore(ci): update release notes comments`

## 10. Phase R.9 — 更新文档

- [x] 10.1 修改 `README.md`：
  - 架构总览图：`├── /admin/*          管理后台`、`├── /tools/*          工具箱`、`├── /mania/*          音游功能` → 移除 tools 与 mania 行
  - 「两个前端项目对比」表格中 `nuxt/` 行 `管理后台、工具箱、音游` → `管理后台`
  - 「跨项目导航」段：`nuxt-public 中访问 /tools、/mania` → 移除
- [x] 10.2 修改 `docs/Hybrid-Architecture.md`：删除 `/tools` `/mania` 相关章节
- [x] 10.3 修改 `docs/CloudflarePages-Deploy-Guide.md`：删除 `/tools` `/mania` 引用
- [x] 10.4 验证：`grep -rn "tools\|mania" docs/ README.md` 期望零命中
- [x] 10.5 单独 commit：`docs: remove tools and mania references`

## 11. Phase R.10 — 更新项目记忆

- [x] 11.1 修改 `.memory/memory.md`：当前架构索引移除 `/tools`、`/mania` 引用（如有）
- [x] 11.2 修改 `.memory/progress/current.md`：追加本 change 完成条目（按 design.md 第 7 节内容）
- [x] 11.3 验证 `.memory` 不被 `git add`：保留本地状态，避免误提交
- [x] 11.4 **不**单独 commit（`.memory` 不入版本控制；本地手动更新即可）

## 12. Phase R.11 — 验证

- [x] 12.1 `cd nuxt && npm run build` → 期望：构建成功，无 `tools` 或 `mania` 路由产物
- [x] 12.2 `cd nuxt-public && npm run generate` → 期望：构建成功，路由清单不含 `/tools` `/mania`
- [x] 12.3 `cd backend-dotnet/BlogApi && dotnet build` → 期望：编译通过（后端未修改）
- [x] 12.4 grep 全量验证业务代码无残留：
  - `grep -rEn "('/|/\")tools|('/|/\")mania" nuxt/app/ nuxt-public/app/`
  - `grep -rEn "KeyBindingModal" nuxt/`
  - `grep -rEn "beatmaps" nuxt/app/pages/admin/ nuxt/app/layouts/admin.vue`
  - 全部期望：零命中
- [x] 12.5 `cd nuxt && npm run dev` 浏览器冒烟：
  - `/`：顶部导航仅 3 项（首页/画廊/其他）
  - 抽屉：仅 3 项
  - 访问 `/tools` → 404
  - 访问 `/mania` → 404
  - 访问 `/admin` → 跳转登录页
  - 登录后访问 `/admin`、`/admin/articles`、`/admin/comments`、`/admin/gallery`、`/admin/imagebed`、`/admin/password` → 全部正常
  - 暗色模式切换正常
- [x] 12.6 `cd nuxt-public && npm run dev` 浏览器冒烟：
  - `/`：顶部导航 4 项（首页/画廊/其他/搜索），抽屉 4 项
  - 「其他」下拉项仅 2 项（归档、关于）
- [x] 12.7 `git status --short` 与 `git diff --cached --name-only` 验证：
  - 不应出现 `.memory/`、`backend-dotnet/BlogApi/Controllers/BeatmapsController.cs` 等保留项
  - 暂存列表仅含本 change 范围内的文件
- [x] 12.8 单独 commit（如有验证发现的微调）：`chore: verification fixes`

## 13. Phase R.12 — 下游 change 提醒（非提交，仅通知）

- [x] 13.1 通知：下游 `nuxt-ssr-nuxt-ui-v4-migration` 的 task 3.6（`admin/beatmaps/index.vue`）与 task 4 列表冒烟中的 `/admin/beatmaps` 已自动失效；下次该 change 应用前需调整任务清单
- [x] 13.2 通知：下游 `nuxt-ssr-tailwind-v4-upgrade` 的 6.5 冒烟清单 admin 7 页面 → 6 页面（去掉 beatmaps）

## 14. Phase R.13 — 归档

- [x] 14.1 确认所有 commit 已推送（如需要）
- [x] 14.2 合并到 `main`（按项目 PR 流程；不在本 change 自动执行）
- [x] 14.3 合并后执行 `openspec archive remove-mania-and-tools-pages --yes`
- [x] 14.4 验证归档后 `openspec/changes/archive/2026-07-XX-remove-mania-and-tools-pages/` 目录存在且包含 proposal/design/tasks/specs

---

## 关键交付清单

| 类型 | 路径 | 动作 |
|---|---|---|
| 删除 | `nuxt/app/pages/tools/*` | 整目录 |
| 删除 | `nuxt/app/pages/mania/*` | 整目录 |
| 删除 | `nuxt/app/pages/admin/beatmaps/*` | 整目录 |
| 删除 | `nuxt/app/components/mania/*` | 整目录 |
| 删除 | `nuxt/app/components/ImageProcessor.vue` | 单文件 |
| 删除 | `nuxt/app/components/MarkdownConverter.vue` | 单文件 |
| 修改 | `nuxt/app/pages/admin/index.vue` | 移除 beatmaps 入口 |
| 修改 | `nuxt/app/layouts/admin.vue` | 移除 beatmaps 侧边栏 |
| 修改 | `nuxt/app/layouts/default.vue` | 移除 tools/mania 导航 + 计算属性 |
| 修改 | `nuxt-public/app/layouts/default.vue` | 移除 tools/mania 外链 |
| 修改 | `cloudflare-worker/router.js` | SERVER_ROUTES 移除 2 项 |
| 修改 | `nuxt/NuxtNginx.txt` | 注释 3 处 |
| 修改 | `.github/workflows/release.yml` | 注释 3 处 |
| 修改 | `README.md`、`docs/Hybrid-Architecture.md`、`docs/CloudflarePages-Deploy-Guide.md` | 文档清理 |
| 修改 | `.memory/memory.md`、`.memory/progress/current.md` | 记忆更新（不入版本） |
