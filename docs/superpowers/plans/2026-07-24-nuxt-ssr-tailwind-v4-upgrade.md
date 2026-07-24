# Phase A: nuxt/ Tailwind CSS v3 → v4 升级实施计划

> **状态：✅ 已完成（2026-07-24）**
> - 最后合并 commit：`6a9f3e5 docs: update README and memory for tailwind v4 upgrade (admin-only)`
> - 提交链：`8255c43` (v4.x upgrade) → `3c158e4` (v3→v4 directives) → `3517734` (vite plugin) → `ed6a557` (utility renames) → `6a9f3e5` (README/memory)
> - OpenSpec change `openspec/changes/nuxt-ssr-tailwind-v4-upgrade/` 已 archive
> - 后续 Phase B 计划见 `openspec/changes/nuxt-ssr-nuxt-ui-v4-migration/tasks.md`（即 Nuxt UI v4 admin-only 迁移）
> - 本 plan 文件保留作为 superpowers 流程记录；不再用于实施跟踪。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `nuxt/`（SSR admin 后台站）从 Tailwind CSS 3.4.19 + PostCSS 链路升级到 Tailwind CSS 4.x + `@tailwindcss/vite` 插件，保持 NaiveUI 与现有 admin 组件不变；为后续 Nuxt UI v4 迁移解锁基础设施。

**Architecture:**

- 用 `@tailwindcss/vite` 替换 PostCSS 链（`tailwindcss` + `autoprefixer` + `cssnano` 三个 PostCSS 插件）。
- `tailwind.config.js` JS 配置退役：其 `darkMode: 'class'` 改为 CSS 端 `@custom-variant dark`；`theme.extend` 仅含少量未使用项，删除整个文件。
- `app/assets/css/tailwind.css` 重写为 v4 简化版：`@import "tailwindcss"` + `@custom-variant dark` + v3 兼容 base 块。**不**引入 `@tailwindcss/typography`（admin 不用 prose）。
- 利用官方 `@tailwindcss/upgrade --force` 自动改名 v3 工具类（`shadow` → `shadow-sm` 等），人工 diff 兜底。
- 不动 NaiveUI / Pinia / `md-editor-v3` / `server/`。

**Tech Stack:**

- Nuxt 4.3、Vue 3.4
- Tailwind CSS v4.x（latest stable）、`@tailwindcss/vite`（latest）
- Node.js（环境已就绪）、`npm`（`package-lock.json` 验证存在）
- 现有 v3 工具：autoprefixer、cssnano、postcss（待卸载）

**Spec:** `docs/superpowers/specs/2026-07-24-nuxt-ssr-nuxt-ui-v4-migration-design.md` §3.1（Phase A）。

**Proposal:** `openspec/changes/nuxt-ssr-tailwind-v4-upgrade/proposal.md`、`design.md`、`tasks.md`。

## Global Constraints

- **包管理器**：`npm`（项目使用 `package-lock.json`，未启用 `pnpm`）。所有 `install`/`uninstall` 用 `npm`。
- **提交风格**：与现有 git log 一致，使用中文 + 英文混排（例：`chore(nuxt): upgrade tailwindcss to v4.x`）。commit 必须包含规范要求的 user.name/user.email（仓库已配置 `高烨飞-CWA15072`）。
- **不动文件**：`app/components/content/*`、`md-editor-v3`、`server/`、`app/features/article-admin/containers/AdminArticleEditorContainer.vue` 内部 NaiveUI 组件、`nuxt.config.ts` 中 `naiveui` 块、`tsconfig.*.strict.phaseN.json`。
- **精确暂存**：禁止 `git add .` / `git add -A`；每个 commit 只暂存该 commit 涉及的文件。
- **不提交**：`.memory/`、任何 `_archive/` 备份文件（保留在工作区但 `.gitignore` 之外，靠精确暂存避免误提交）。
- **校验**：每个 commit 后必须 `pnpm` 等价命令（即 `npm run`）通过；变更任务（包管理、css 重写、配置改造）完成后立即跑 `npm run build` 验证。
- **设计稿引用**：每一步若引用 CSS 变量、class 名或文件路径，必须与设计稿 §3.1 完全一致。
- **Tailwind v4 默认行为**：v4 默认启用 `prefers-color-scheme` 暗色模式；本项目要求 `.dark` class 策略，必须显式声明 `@custom-variant dark`。
- **CSS 顺序**：`nuxt.config.ts` `css` 数组中 `tailwind.css` 顺序不变；新增 main.css（Phase B）时才插入。

## Task 1: 备份现有配置与基线检查

**Files:**

- Touch: `nuxt/_archive/`（新建空目录，用 `.gitkeep` 占位）
- Copy: `nuxt/tailwind.config.js` → `nuxt/_archive/tailwind.config.js.v3.bak`
- Copy: `nuxt/package.json` → `nuxt/_archive/package.v3-tailwind.bak.json`
- Copy: `nuxt/package-lock.json` → `nuxt/_archive/package-lock.v3-tailwind.bak.json`

**Step 1.1: 创建工作分支**

Run:

```bash
cd nuxt
git checkout -b feature/nuxt-ssr-tailwind-v4-upgrade
```

Expected: `Switched to a new branch 'feature/nuxt-ssr-tailwind-v4-upgrade'`。

**Step 1.2: 创建 `_archive/` 占位**

Run:

```bash
mkdir -p nuxt/_archive
touch nuxt/_archive/.gitkeep
```

Expected: 目录创建成功，`.gitkeep` 存在。`ls nuxt/_archive/` 输出 `.gitkeep`。

**Step 1.3: 备份三个文件**

Run:

```bash
cp nuxt/tailwind.config.js nuxt/_archive/tailwind.config.js.v3.bak
cp nuxt/package.json nuxt/_archive/package.v3-tailwind.bak.json
cp nuxt/package-lock.json nuxt/_archive/package-lock.v3-tailwind.bak.json
ls -la nuxt/_archive/
```

Expected: 三个 `.bak` 文件大小与原文件一致；`ls` 输出含三个 `.bak` 文件名与一个 `.gitkeep`。

**Step 1.4: 基线 grep 检查（应为零命中）**

Run:

```bash
cd nuxt
grep -rEn "@apply|theme\(" app/ --include="*.vue" --include="*.css" || echo "OK: no @apply or theme() in app/"
```

Expected: `OK: no @apply or theme() in app/`。

Run:

```bash
grep -rEn 'class="[^"]*prose' app/pages/admin/ app/features/article-admin/ app/features/gallery-admin/ app/layouts/admin.vue || echo "OK: admin scope has no prose classes"
```

Expected: `OK: admin scope has no prose classes`（仅 `app/components/MarkdownRenderer.vue` 含 `proseClasses` 变量，不在 grep 路径内）。

Run:

```bash
grep -rEn 'isDarkMode|useState\(.isDarkMode' app/ --include="*.vue" --include="*.ts"
```

Expected: 命中 `app/layouts/admin.vue` 等少数文件（含 `useState('isDarkMode', () => false)` 与 `<n-config-provider :theme="isDarkMode ? ...">`）。记录命中文件数，供 Task 7 验证对比。

**Step 1.5: 基线 build 验证（确认升级前可用）**

Run:

```bash
cd nuxt
npm run build 2>&1 | tail -20
```

Expected: `nuxt build` 成功，输出 `.output/` 目录；记录耗时（秒）于本步骤注释，供 Phase A 完成后对比。

**Step 1.6: 暂存并 commit（备份本身不提交，仅工作分支占位）**

不提交备份文件。仅 commit 分支切换记录——但 Task 1 整体无代码变更，跳过 commit；Task 2 的依赖变更将作为首个 commit。

## Task 2: 改 `nuxt/package.json` 依赖

**Files:**

- Modify: `nuxt/package.json`

**Step 2.1: 升级 tailwindcss 到 v4**

Run:

```bash
cd nuxt
npm install tailwindcss@^4.0.0 @tailwindcss/vite@^4.0.0
```

Expected: `npm install` 成功，`node_modules/tailwindcss/package.json` 中 `"version"` 以 `4.` 开头，`node_modules/@tailwindcss/vite/package.json` 存在。

**Step 2.2: 卸载 v3 PostCSS 链路依赖**

Run:

```bash
cd nuxt
npm uninstall autoprefixer cssnano postcss
```

Expected: `npm uninstall` 成功，`package.json` `devDependencies` 中 `autoprefixer`、`cssnano`、`postcss` 三项已删除。

**Step 2.3: 校验 `package.json` 终态**

Run:

```bash
cd nuxt
cat package.json | python -c "import json,sys; p=json.load(sys.stdin); print('deps tailwindcss:', p['dependencies'].get('tailwindcss','MISSING')); print('deps @tailwindcss/vite:', p['dependencies'].get('@tailwindcss/vite','MISSING')); print('devDeps autoprefixer:', p['devDependencies'].get('autoprefixer','GONE-OK')); print('devDeps cssnano:', p['devDependencies'].get('cssnano','GONE-OK')); print('devDeps postcss:', p['devDependencies'].get('postcss','GONE-OK'))"
```

Expected:

```
deps tailwindcss: ^4.x.x
deps @tailwindcss/vite: ^4.x.x
devDeps autoprefixer: GONE-OK
devDeps cssnano: GONE-OK
devDeps postcss: GONE-OK
```

**Step 2.4: 暂存并 commit**

Run:

```bash
cd nuxt
git add package.json package-lock.json
git status --short
git diff --cached --name-only
git commit -m "chore(nuxt): upgrade tailwindcss to v4.x"
```

Expected: `git status --short` 干净；`git diff --cached --name-only` 输出仅两行：`package.json` 与 `package-lock.json`；commit 信息如上。

## Task 3: 重写 `app/assets/css/tailwind.css`

**Files:**

- Modify: `nuxt/app/assets/css/tailwind.css`（内容全部替换）

**Step 3.1: 备份原文件**

Run:

```bash
cp nuxt/app/assets/css/tailwind.css nuxt/_archive/tailwind.css.v3.bak
```

Expected: 文件已复制。

**Step 3.2: 重写为 v4 简化版**

Run: 用 Edit 工具把 `nuxt/app/assets/css/tailwind.css` 全部替换为以下内容（覆盖原 v3 `@tailwind` 指令）：

```css
@import "tailwindcss";

/* 暗色模式采用 .dark class 策略，与现有 useTheme 切换一致 */
@custom-variant dark (&:where(.dark, .dark *));

@layer base {
  /* Tailwind v4 默认不再注入基础样式；恢复 v3 兼容性最小集 */
  *,
  ::before,
  ::after {
    border-color: theme(--color-gray-200, currentColor);
  }

  ::placeholder {
    color: theme(--color-gray-400);
    opacity: 1;
  }

  button:not(:disabled),
  [role="button"]:not(:disabled) {
    cursor: pointer;
  }
}
```

**Step 3.3: 校验文件内容**

Run:

```bash
head -10 nuxt/app/assets/css/tailwind.css
echo "---"
wc -l nuxt/app/assets/css/tailwind.css
```

Expected: 第一行 `@import "tailwindcss"`；存在 `@custom-variant dark`；存在 `@layer base`；文件总行数 ≤ 30。

**Step 3.4: 暂存并 commit**

Run:

```bash
cd nuxt
git add app/assets/css/tailwind.css
git diff --cached --name-only
git commit -m "refactor(nuxt): migrate tailwind v3 directives to v4"
```

Expected: `git diff --cached --name-only` 仅一行 `app/assets/css/tailwind.css`。

## Task 4: 改造 `nuxt.config.ts`（Vite 插件集成）

**Files:**

- Modify: `nuxt/nuxt.config.ts`

**Step 4.1: 添加 `@tailwindcss/vite` 导入**

Run: 用 Edit 工具在 `nuxt/nuxt.config.ts` 第 1 行（`const isProduction = ...` 之前）插入：

```ts
import tailwindcss from '@tailwindcss/vite'

const isProduction = process.env.NODE_ENV === 'production'
```

Expected: 第 1 行变为 `import tailwindcss from '@tailwindcss/vite'`；原第 1 行下移为第 2 行。

**Step 4.2: 移除 `postcss` 配置块**

Run: 用 Edit 工具删除 `nuxt/nuxt.config.ts` 中从 `// PostCSS 配置` 注释开始到对应 `}` 结束的整段（约 16 行）。原块内容参考（删除它）：

```ts
  // PostCSS 配置
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
      // 生产环境CSS优化
      ...(isProduction ? {
        cssnano: {
          preset: ['default', {
            discardComments: { removeAll: true },
            normalizeWhitespace: true,
            minifyFontValues: true,
            minifyGradients: true
          }]
        }
      } : {})
    }
  },
```

**Step 4.3: 注册 Vite 插件**

Run: 用 Edit 工具在 `nuxt/nuxt.config.ts` 的 `vite: {` 配置块中（若不存在则在顶层与 `nitro`、`app` 等同级新增 `vite` 块）追加 `plugins: [tailwindcss()]`：

```ts
  vite: {
    plugins: [tailwindcss()],
  },
```

注：若项目已存在 `vite` 块，仅插入 `plugins: [tailwindcss()],`；若不存在，按上述整体新增。

**Step 4.4: 校验配置结构**

Run:

```bash
cd nuxt
grep -n "tailwindcss\|postcss\|autoprefixer\|cssnano" nuxt.config.ts || echo "OK: no postcss references"
echo "---"
grep -n "^  vite:" nuxt.config.ts
echo "---"
grep -n "import tailwindcss" nuxt.config.ts
```

Expected:

- 第一段：`OK: no postcss references`（除 `import tailwindcss` 行外无残留）
- 第二段：定位到 `vite:` 块所在行号
- 第三段：第 1 行匹配

**Step 4.5: 删除 `tailwind.config.js`（若文件已无人引用）**

Run:

```bash
cd nuxt
grep -rEn "tailwind\.config" app/ nuxt.config.ts package.json 2>/dev/null || echo "OK: no references"
```

Expected: `OK: no references`（若仍命中则保留 `tailwind.config.js`，仅当零命中时删除）。

Run（如上一步输出 OK 才执行）:

```bash
cd nuxt
git rm tailwind.config.js
```

Expected: 文件已从 git 索引移除。

**Step 4.6: 暂存并 commit**

Run:

```bash
cd nuxt
git add nuxt.config.ts
git diff --cached --name-only
git commit -m "chore(nuxt): integrate tailwindcss via vite plugin"
```

若 Task 4.5 执行了 `git rm`，改为：

```bash
cd nuxt
git add nuxt.config.ts
git diff --cached --name-only
git commit -m "chore(nuxt): integrate tailwindcss via vite plugin

- 移除 PostCSS 配置块（autoprefixer + cssnano + postcss）
- 通过 @tailwindcss/vite 集成
- 删除 tailwind.config.js"
```

Expected: `git diff --cached --name-only` 包含 `nuxt.config.ts`（含 `tailwind.config.js` 时两行）。

## Task 5: 运行官方升级工具自动改名

**Files:**

- Modify: 多个 admin `.vue` 文件的 class 属性（具体由升级工具报告决定）

**Step 5.1: 运行升级 codemod**

Run:

```bash
cd nuxt
npx -y @tailwindcss/upgrade@latest --force
```

Expected: 命令成功退出（exit code 0）；终端输出 `Other CSS files have been modified successfully.`（或类似成功提示）。

**Step 5.2: 捕获变更报告**

Run:

```bash
cd nuxt
git status --short
echo "---FILES-CHANGED---"
git diff --name-only
echo "---DIFFSTAT---"
git diff --stat | tail -10
```

Expected: `git status --short` 列出若干 `M app/...` 文件；`git diff --stat` 总变更行数预期远少于 nuxt-public 升级（约 50 行以内）；记录文件清单用于下一步人工 review。

**Step 5.3: 人工 diff 关键文件**

Run:

```bash
cd nuxt
git diff app/pages/admin/login.vue | head -80
```

Expected: 出现 v3→v4 class 改名（`shadow` → `shadow-sm`、`flex-shrink-0` → `shrink-0`、`rounded` → `rounded-sm` 等）；若 diff 包含可疑的非 class 改动（例如移除 `import` 或 JS 逻辑），停下来人工 review 后回退该 hunk（`git checkout -p app/pages/admin/login.vue`）。

**Step 5.4: 校验升级工具未改坏豁免文件**

Run:

```bash
cd nuxt
git diff app/components/MarkdownRenderer.vue app/components/MdEditorWrapper.client.vue app/components/content/ 2>/dev/null | head -40 || echo "OK: content/ untouched"
```

Expected: `OK: content/ untouched`（豁免清单文件应零改动）。

**Step 5.5: 校验 v3 工具类残留**

Run:

```bash
cd nuxt
echo "--- shadow ---"
grep -rEn 'class="[^"]*\bshadow\b(?![-_])' app/pages/admin/ app/features/article-admin/ app/features/gallery-admin/ || echo "OK"
echo "--- flex-shrink-0 ---"
grep -rEn 'class="[^"]*\bflex-shrink-0\b' app/pages/admin/ app/features/article-admin/ app/features/gallery-admin/ || echo "OK"
echo "--- rounded (无后缀) ---"
grep -rEn 'class="[^"]*\brounded\b(?![-_])' app/pages/admin/ app/features/article-admin/ app/features/gallery-admin/ || echo "OK"
echo "--- blur (无后缀) ---"
grep -rEn 'class="[^"]*\bblur\b(?![-_])' app/pages/admin/ app/features/article-admin/ app/features/gallery-admin/ || echo "OK"
```

Expected: 四个 grep 全部输出 `OK`（admin 范围内三类关键 v3 工具类已清零）。若仍有命中，列出文件与行号并手工修正（例：`shadow` → `shadow-sm`），重复 grep 直到清零。

**Step 5.6: 暂存并 commit**

Run:

```bash
cd nuxt
git add app/
git status --short
git diff --cached --stat | tail -5
git commit -m "refactor(nuxt): apply tailwindcss v3→v4 utility renames (admin scope)"
```

Expected: `git status --short` 干净；`git diff --cached --stat` 列出本次自动改名的文件与行数。

## Task 6: 全量验证（build + typecheck + audit）

**Files:** 无文件修改（验证任务）

**Step 6.1: css audit**

Run:

```bash
cd nuxt
npm run css:audit
echo "exit=$?"
npm run css:imports:audit
echo "exit=$?"
```

Expected: 两个 audit 命令 exit code = 0，无 violation 输出。

**Step 6.2: typecheck**

Run:

```bash
cd nuxt
npm run typecheck 2>&1 | tail -30
echo "exit=${PIPESTATUS[0]}"
```

Expected: exit code = 0；无 TS 错误；输出末尾可能有 `Found 0 errors`。

**Step 6.3: build**

Run:

```bash
cd nuxt
npm run build 2>&1 | tail -20
echo "exit=${PIPESTATUS[0]}"
```

Expected: exit code = 0；`.output/` 目录已生成；记录耗时（秒）并与 Task 1.5 基线对比。

**Step 6.4: dev 启动 + SSR HTTP 冒烟**

Run:

```bash
cd nuxt
npm run dev > /tmp/nuxt-dev.log 2>&1 &
DEV_PID=$!
echo "dev pid=$DEV_PID"
# 等待 dev 启动（最长 60 秒）
for i in $(seq 1 60); do
  if curl -sf -o /dev/null http://localhost:3000/admin/login; then
    echo "dev ready after ${i}s"
    break
  fi
  sleep 1
done
```

Expected: `dev ready after Ns`（N < 60）。

Run:

```bash
for path in /admin /admin/login /admin/articles /admin/comments /admin/gallery /admin/imagebed /admin/password; do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000$path)
  echo "$path -> $code"
done
```

Expected: 全部输出 `200`（注：未登录访问 `/admin` 等受保护路径可能跳转到 `/admin/login`，curl 跟随重定向后终态 200；若 302/307 也属正常，记录状态码并通过 = 接受 200 / 3xx）。

Run:

```bash
kill $DEV_PID
wait $DEV_PID 2>/dev/null
echo "dev stopped"
```

Expected: `dev stopped`。

**Step 6.5: 暗色模式切换验证（人工）**

人工步骤（记录结果到 commit message）：

1. `npm run dev` 启动浏览器访问 `/admin/login`
2. 登录后进入 `/admin`
3. 点击 admin 顶部主题切换按钮，记录 `<html>` 元素的 class 切换（`.dark` 应正确加上/移除）
4. 验证暗色下 admin 表单/弹窗/导航/表格的颜色变化（NaiveUI 应保持原色，不应受 v4 `@layer` 影响或仅轻微变化）
5. 切回浅色再验证一次

Expected: 暗色模式视觉与升级前基本一致；如有轻微变化记录在 commit message 但不阻塞提交。

**Step 6.6: 暂存验证记录（如有 manifest 输出）**

本任务无代码变更，无 commit。

## Task 7: 清理与归档

**Files:**

- Modify: `nuxt/README.md`
- Modify: `.memory/memory.md`
- Modify: `.memory/progress/current.md`
- Modify: `openspec/changes/nuxt-ssr-tailwind-v4-upgrade/tasks.md`（打勾标记完成）

**Step 7.1: 校验 `_archive/` 备份未被暂存**

Run:

```bash
cd nuxt
git status --short
echo "---"
git diff --cached --name-only
```

Expected: 无 `_archive/` 文件出现在暂存区或修改列表。

**Step 7.2: 更新 `nuxt/README.md`**

Run: 用 Edit 工具在 `nuxt/README.md` "技术栈" 段（如不存在则在文档顶部新增）追加或修改：

```markdown
## 技术栈

- Nuxt 4.3 + Vue 3.4
- Tailwind CSS v4.x（via `@tailwindcss/vite`，2026-07-24 升级完成）
- UI 库：当前 Naive UI 2.43（admin-only），后续将通过 `nuxt-ssr-nuxt-ui-v4-migration` change 替换为 Nuxt UI v4
- 范围：本目录仅承载 admin 后台，公开页由 `nuxt-public/` 静态站承载
```

**Step 7.3: 更新 `.memory/memory.md`**

Run: 用 Edit 工具在 `.memory/memory.md` "关键架构决策" 段追加：

```markdown
- **nuxt/ Tailwind v4 升级（2026-07-24 完成）**：见 `openspec/changes/nuxt-ssr-tailwind-v4-upgrade/`。通过 `@tailwindcss/vite` 集成，无 PostCSS 链、无 JS 配置；admin 范围不含 typography 插件；暗色模式 `.dark` class 由 `@custom-variant dark` 暴露。Phase A 独立验证通过，下一步启动 Phase B（NaiveUI → Nuxt UI v4）。
```

**Step 7.4: 更新 `.memory/progress/current.md`**

Run: 用 Edit 工具把 "当前阶段" 段改为：

```markdown
## 当前阶段

Phase A（`nuxt/` Tailwind v3→v4 升级）已完成并验证通过。下一阶段：Phase B（`nuxt/` admin NaiveUI → Nuxt UI v4 迁移，独立 OpenSpec change `nuxt-ssr-nuxt-ui-v4-migration/`，见 spec `docs/superpowers/specs/2026-07-24-nuxt-ssr-nuxt-ui-v4-migration-design.md` §3.2）。
```

**Step 7.5: 在 OpenSpec tasks.md 中标记完成**

Run: 用 Edit 工具把 `openspec/changes/nuxt-ssr-tailwind-v4-upgrade/tasks.md` 每个 `- [ ]` 改为 `- [x]`（仅本 change 范围内），并在文件顶部追加：

```markdown
> **状态**：✅ 已完成（2026-07-24）。验证：`npm run build` 通过；admin 6 路由 SSR HTTP 200；css:audit / css:imports:audit / typecheck 0 violation。
```

**Step 7.6: 暂存并 commit**

Run:

```bash
cd nuxt
git add README.md
cd ..
git add .memory/memory.md .memory/progress/current.md openspec/changes/nuxt-ssr-tailwind-v4-upgrade/tasks.md
git status --short
git diff --cached --name-only
git commit -m "docs: update README and memory for tailwind v4 upgrade (admin-only)"
```

Expected: `git diff --cached --name-only` 列出 `nuxt/README.md`、`.memory/memory.md`、`.memory/progress/current.md`、`openspec/changes/nuxt-ssr-tailwind-v4-upgrade/tasks.md` 四行。

**Step 7.7: 归档 OpenSpec change**

Run:

```bash
cd /d/Work_space/MyBlogWeb-CloudflarePage
openspec archive nuxt-ssr-tailwind-v4-upgrade --yes 2>&1 | tail -10
```

Expected: 归档成功；`openspec/changes/nuxt-ssr-tailwind-v4-upgrade/` 目录移至 `openspec/changes/archive/`，并在 `openspec/specs/styling-pipeline.md` 写入增量（若命令支持）。

**Step 7.8: 推送分支**

Run:

```bash
cd /d/Work_space/MyBlogWeb-CloudflarePage
git push -u origin feature/nuxt-ssr-tailwind-v4-upgrade
```

Expected: 推送成功；远端分支 `feature/nuxt-ssr-tailwind-v4-upgrade` 可在 GitHub 查看。

---

## Self-Review Checklist

执行完成后逐项核对：

- [ ] Task 1.5 与 Task 6.3 的 build 耗时已对比并记录于 commit message
- [ ] Task 2.3 的 5 个 `print` 输出与预期完全一致
- [ ] Task 4.4 的三次 grep 输出与预期完全一致
- [ ] Task 5.5 的四类 v3 工具类 grep 全部 `OK`
- [ ] Task 6.1 的两个 audit exit code = 0
- [ ] Task 6.2 的 typecheck exit code = 0
- [ ] Task 6.3 的 build exit code = 0
- [ ] Task 6.4 的 6 个 admin 路由全部返回 200 或受保护路径正常重定向
- [ ] Task 6.5 的暗色模式人工验证已执行并记录结果
- [ ] Task 7.1 确认 `_archive/` 未被暂存
- [ ] Task 7.6 的 `git diff --cached --name-only` 仅含四个文档文件
- [ ] Task 7.7 的归档命令成功
- [ ] Task 7.8 的推送成功

## 风险与回滚

- **回滚点 1（Task 2 之后）**：`git reset --hard HEAD~1 && cd nuxt && npm install` 即可回到升级前状态（`package-lock.json` 也回滚）。
- **回滚点 2（Task 4 之后）**：`git reset --hard HEAD~2` 撤销依赖与配置变更；从 `_archive/tailwind.config.js.v3.bak` 与 `package.v3-tailwind.bak.json` 恢复。
- **回滚点 3（Task 5 之后）**：`git reset --hard HEAD~3` 撤销 class 改名；但 `_archive/tailwind.css.v3.bak` 提供 CSS 回滚兜底。
- **完整回滚**：删除分支 `git branch -D feature/nuxt-ssr-tailwind-v4-upgrade`，工作区回到 Phase A 起点。
