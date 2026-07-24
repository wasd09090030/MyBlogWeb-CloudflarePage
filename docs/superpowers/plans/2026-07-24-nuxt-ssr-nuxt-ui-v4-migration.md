# Phase B: nuxt/ admin NaiveUI → Nuxt UI v4 迁移实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `nuxt/`（SSR admin 后台）的全部 NaiveUI 组件实例替换为 Nuxt UI v4 等价组件，admin-only 范围（24 个文件 / 约 261 处 NaiveUI 标签），同时把 `useMessage()/useDialog()` 替换为 `useToast()`，把 `n-form + rules` 替换为 `UForm + valibot schema`，统一主题到 `app.config.ts` + Tailwind v4 `@theme`。

**Architecture:**

- 通过 `@nuxt/ui` 模块把 Nuxt UI v4 接入；用 `app.config.ts` 集中主题配置（`primary: 'blue'` 保留 Bootstrap blue 色相以避免视觉跳变），用 `assets/css/main.css` 的 `@theme` 块定义 50-900 色阶与圆角 token。
- 全局 Provider 从 `n-config-provider / n-message-provider / n-dialog-provider` 三层嵌套收缩为单一 `<UApp>`（包在 `app.vue` 的 `<NuxtLayout>` 外）。
- admin 业务层用 `valibot` schema 替换手写 rules；Pinia store action 内 `useToast()` 仅在 setup 顶层调用。
- 分 4 子阶段：B.1 基础设施 → B.2 admin layout → B.3 admin 业务 → B.4 清理归档。每个 Phase 独立 commit，可独立回滚。

**Tech Stack:**

- Nuxt 4.3 + Vue 3.4（已在 `nuxt/`）
- Tailwind CSS v4.x（Phase A 已完成，2026-07-24 commit `6a9f3e5`）
- `@nuxt/ui@^4.9.0`（新增）
- `valibot@^1.x`（新增）
- `@vueuse/motion/nuxt@^2.x`（新增，admin 动效）
- 现有 Pinia / md-editor-v3 / `naive-ui@2.43.2`（B.4 卸载）
- 包管理器：`npm`（项目 `package-lock.json` 验证存在，未启用 pnpm）

**Spec:** `openspec/changes/nuxt-ssr-nuxt-ui-v4-migration/design.md`

**Proposal:** `openspec/changes/nuxt-ssr-nuxt-ui-v4-migration/proposal.md`

**OpenSpec tasks:** `openspec/changes/nuxt-ssr-nuxt-ui-v4-migration/tasks.md`

## Global Constraints

- **包管理器**：`npm`（`package-lock.json` 存在）。所有 `install`/`uninstall` 用 `npm`。注意 tasks.md 误写为 `pnpm`，以本文档为准。
- **承接关系**：本 change 承接 `openspec/changes/nuxt-shrink-to-pure-admin-and-nuxt-ui-v4/` 路径 C（已实施）与 `nuxt-ssr-tailwind-v4-upgrade/`（已 archive）。
- **提交风格**：与现有 git log 一致（中文 + 英文混排）。每个 commit 严格仅含该 task 涉及文件；禁止 `git add .` / `git add -A`。
- **不动文件**：`app/components/content/*` 4 个 NaiveUI 内容组件、`app/components/MdEditorWrapper.client.vue`（md-editor-v3 包装）、`app/components/MarkdownRenderer.vue`（admin 文章编辑器 MDC 预览依赖）、`app/shared/ui/StateLoading.vue`、`server/`、`tsconfig.*.strict.phaseN.json`。
- **不删除**：公开页文件、features、依赖（`katex`、`mermaid`、`md-editor-v3` 等）、modules（`@nuxtjs/mdc`、`nuxt-vitalizer`）。这些由后续 cleanup change 处理。
- **精确暂存**：每个 commit 后必须 `git status --short` + `git diff --cached --name-only` 核对；禁止 `.memory/`、`_archive/` 进入暂存区。
- **校验**：每个 commit 后必须 `npm run typecheck` + `npm run build` + `npm run css:audit` + `npm run css:imports:audit` 通过（除个别不需要的）。
- **设计稿引用**：每一步若引用组件名、props、valibot schema 或文件路径，必须与 OpenSpec design.md §Decisions 完全一致。
- **浏览器底线**：Safari 16.4+ / Chrome 111+ / Firefox 128+（与 `nuxt-public/` 一致）。
- **不提交**：`.memory/`、任何 `_archive/` 备份文件（保留在工作区但靠精确暂存避免误提交）。
- **依赖版本同步**：升级前先 `cd nuxt-public && cat package.json | grep nuxt/ui` 核对 `nuxt-public/` 实际使用版本，统一到 `^4.9.0` 后再安装。

## 组件映射表（NaiveUI → Nuxt UI v4）

下表是 mechanical replacement 的速查。引用本表即可完成大多数替换，复杂场景（form + valibot、UTable PoC）单独说明。

| NaiveUI 模式 | Nuxt UI v4 等价 | 备注 |
|---|---|---|
| `<n-button>` | `<UButton>` | props: `type="primary"` → `color="primary"`；`quaternary` → `variant="ghost" color="neutral"`；`tertiary` → `variant="soft"`；`dashed` → `variant="outline"`；`circle` → `icon` (无 text) |
| `<n-button :loading>` | `<UButton :loading>` | 同步 |
| `<n-form :model :rules>` | `<UForm :state :schema>` + `<UFormField>` | rules 改 valibot schema |
| `<n-form-item label name>` | `<UFormField label name>` | `<UFormField>` 内嵌 `<UInput>` 等 |
| `<n-input v-model:value>` | `<UInput v-model>` | `v-model:value` → `v-model` |
| `<n-input type="textarea">` | `<UTextarea v-model>` | |
| `<n-input-number>` | `<UInputNumber v-model>` | |
| `<n-select :options>` | `<USelect :items>` | `options` → `items`，`label/value` 字段不变 |
| `<n-switch>` | `<USwitch v-model>` | |
| `<n-checkbox>` | `<UCheckbox v-model>` | |
| `<n-radio-group>` | `<URadioGroup v-model :items>` | |
| `<n-date-picker>` | `<UInputDate v-model>` (Nuxt UI v4 默认 popover) | |
| `<n-modal v-model:show>` | `<UModal v-model:open>` | 内部用 `<template #body>`/`<template #footer>` |
| `<n-drawer v-model:show>` | `<UDrawer v-model:open>` | |
| `<n-card title>` | `<UCard>` | `title` → 在 header slot |
| `<n-spin :show>` | 组件外 `<USpinner>` / 内部条件渲染 | 不再包裹子组件 |
| `<n-data-table>` | `<UTable>` | **PoC 验证在 Task 5**；columns 配置语法不同 |
| `<n-pagination>` | `<UPagination>` | `v-model:page` 保持；emit 同步 |
| `<n-upload>` | `<UFileUpload>` | **PoC 验证在 Task 13**；drag-drop 行为可能差异 |
| `<n-alert type="success/error">` | `<UAlert :color="success/error">` | icon slot 不同 |
| `<n-tag>` | `<UBadge variant="subtle">` | 或 `<UTag>` (v4 实验性) |
| `<n-dynamic-tags>` | `<UInputTags v-model>` | |
| `<n-tabs>` + `<n-tab-pane>` | `<UTabs :items>` | |
| `<n-divider>` | `<USeparator>` | |
| `<n-popconfirm>` | `<UModal v-model:open>` + 触发按钮 | |
| `<n-skeleton>` | `<USkeleton>` | |
| `<n-space>` | Tailwind `flex gap-N` | 直接替换为 utility class |
| `<n-steps>` + `<n-step>` | `<USteps :items>` | |
| `<n-empty>` | `<UEmpty>` | |
| `<n-image>` | `<UAvatar>` 或 `<img>` + utility | |
| `<n-menu>` | 自实现 `<nav>` 或 `<UTabs>` | admin top nav 用 `<NuxtLink>` 自实现 |
| `<n-badge>` | `<UBadge>` | |
| `useMessage().success/error/warning` | `useToast().add({ title, color: 'success'/'error' })` | |
| `useDialog()` | `useConfirm()` / `<UModal>` 自管 | |
| `<n-config-provider :theme="isDarkMode ? darkTheme : null">` | 删除 | 改用 `<UApp>` + `useColorMode()` |

## 文件结构

| 路径 | 角色 | 涉及任务 |
|------|------|----------|
| `nuxt/package.json` | 依赖管理 | B.1.1, B.4.3 |
| `nuxt/nuxt.config.ts` | Nuxt 配置（modules/css/build） | B.1.2, B.4.1 |
| `nuxt/app/app.config.ts` | **新建**；UI 主题配置 | B.1.3 |
| `nuxt/app/assets/css/main.css` | **新建**；`@theme` 块 | B.1.4 |
| `nuxt/app/app.vue` | 根模板；加 `<UApp>` | B.1.5 |
| `nuxt/app/layouts/admin.vue` | admin 布局 | B.2.1 |
| `nuxt/app/layouts/blank.vue` | blank 布局 | B.2.2 |
| `nuxt/app/pages/admin/login.vue` | 登录页 | B.3.1 |
| `nuxt/app/pages/admin/password.vue` | 改密页 | B.3.2 |
| `nuxt/app/pages/admin/index.vue` | dashboard | B.3.3 |
| `nuxt/app/pages/admin/articles/index.vue` | 文章列表（UTable） | B.3.4 |
| `nuxt/app/pages/admin/articles/[id].vue` | 文章编辑 | B.3.5 |
| `nuxt/app/pages/admin/articles/create.vue` | 文章新建 | B.3.6 |
| `nuxt/app/pages/admin/comments/index.vue` | 评论列表（UTable） | B.3.7 |
| `nuxt/app/pages/admin/gallery/index.vue` | 画廊管理 | B.3.8 |
| `nuxt/app/pages/admin/imagebed/index.vue` | 图床（UFileUpload） | B.3.9 |
| `nuxt/app/features/article-admin/containers/AdminArticleEditorContainer.vue` | 文章编辑器容器 | B.3.10 |
| `nuxt/app/features/gallery-admin/containers/AdminGalleryPageContainer.vue` | 画廊管理容器 | B.3.11 |
| `nuxt/app/features/gallery-admin/composables/useAdminImagebedPage.ts` | 图床 composable | B.3.11 |
| `nuxt/app/features/gallery-admin/components/imagebed/ImagebedFileArea.vue` | 图床文件区 | B.3.12 |
| `nuxt/app/features/gallery-admin/components/imagebed/ImagebedPreviewModal.vue` | 预览模态 | B.3.12 |
| `nuxt/app/features/gallery-admin/components/imagebed/ImagebedToolbar.vue` | 工具栏 | B.3.12 |
| `nuxt/app/features/gallery-admin/components/imagebed/ImagebedUploadArea.vue` | 上传区 | B.3.12 |
| `nuxt/app/features/gallery-admin/components/gallery/GalleryCardGrid.vue` | 卡片网格 | B.3.12 |
| `nuxt/app/features/gallery-admin/components/gallery/GalleryEditModal.vue` | 编辑模态 | B.3.12 |
| `nuxt/app/features/gallery-admin/components/gallery/GalleryFilterBar.vue` | 过滤栏 | B.3.12 |
| `nuxt/app/stores/auth.ts` | auth store | B.3.13 |
| `nuxt/README.md` | 文档 | B.4.5 |
| `openspec/changes/nuxt-ssr-nuxt-ui-v4-migration/tasks.md` | OpenSpec 任务勾选 | B.4.6 |

---

## Phase B.1 — 基础设施接入

### Task 1: 备份与基线检查

**Files:**

- Touch: `nuxt/_archive/`（新建空目录，用 `.gitkeep` 占位）
- Copy: `nuxt/package.json` → `nuxt/_archive/package.pre-nuxt-ui.bak.json`
- Copy: `nuxt/package-lock.json` → `nuxt/_archive/package-lock.pre-nuxt-ui.bak.json`

**Step 1.1: 创建工作分支**

Run:

```bash
cd /d/Work_space/MyBlogWeb-CloudflarePage
git checkout -b feature/nuxt-ssr-nuxt-ui-v4-migration
```

Expected: `Switched to a new branch 'feature/nuxt-ssr-nuxt-ui-v4-migration'`。

**Step 1.2: 创建 `_archive/` 占位**

Run:

```bash
mkdir -p nuxt/_archive
touch nuxt/_archive/.gitkeep
ls -la nuxt/_archive/
```

Expected: 目录创建成功，`.gitkeep` 存在。

**Step 1.3: 备份 package 文件**

Run:

```bash
cp nuxt/package.json nuxt/_archive/package.pre-nuxt-ui.bak.json
cp nuxt/package-lock.json nuxt/_archive/package-lock.pre-nuxt-ui.bak.json
ls -la nuxt/_archive/
```

Expected: 两个 `.bak` 文件大小与原文件一致；`ls` 输出含两个 `.bak` 文件名与一个 `.gitkeep`。

**Step 1.4: 与 `nuxt-public/` 版本核对**

Run:

```bash
cd nuxt-public
grep -E '"@nuxt/ui"' package.json
cd ..
```

Expected: `nuxt-public` 已用 `^4.x` 版本；记录实际版本号供 Task 2 使用（应统一到 `^4.9.0` 或更新 minor）。

**Step 1.5: 基线 NaiveUI grep 计数**

Run:

```bash
cd nuxt
grep -rEn "<n-(button|form|input|select|card|modal|spin|tab-pane|switch|data-table|input-number|alert|tag|upload|message|dialog|config-provider|dynamic-tags|empty|image|menu|badge|divider|popconfirm|skeleton|space|step|tabs|rate|checkbox|radio-button|radio-group|date-picker|pagination|drawer)" app/ --include="*.vue" | wc -l
grep -rEn "<n-(button|form|input|select|card|modal|spin|tab-pane|switch|data-table|input-number|alert|tag|upload|message|dialog|config-provider|dynamic-tags|empty|image|menu|badge|divider|popconfirm|skeleton|space|step|tabs|rate|checkbox|radio-button|radio-group|date-picker|pagination|drawer)" app/ --include="*.vue" -l | wc -l
```

Expected: 第一行约 `261`（NaiveUI 标签总数）；第二行 `24`（命中文件数）。记录两个数字供 Phase B.4 验证对比。

**Step 1.6: 基线 build 验证**

Run:

```bash
cd nuxt
npm run build 2>&1 | tail -20
```

Expected: `nuxt build` 成功；记录耗时（秒）于本步骤注释，供 Task 24 完成后对比构建产物体积。

**Step 1.7: 暂存确认（不 commit）**

Run:

```bash
cd nuxt
git status --short
echo "---"
git diff --cached --name-only
```

Expected: 仅有未跟踪的 `_archive/` 与可能未跟踪的 `app.config.ts` / `main.css` 暂未创建；`git diff --cached` 为空（备份文件不暂存）。

---

### Task 2: 安装 `@nuxt/ui` + `valibot` + `@vueuse/motion/nuxt`

**Files:**

- Modify: `nuxt/package.json`
- Modify: `nuxt/package-lock.json`（npm 自动）

**Step 2.1: 安装三个新依赖**

Run:

```bash
cd nuxt
npm install @nuxt/ui@^4.9.0 valibot@^1.0.0 @vueuse/motion/nuxt@^2.2.0
```

Expected: `npm install` 成功；`package.json` `dependencies` 段新增三行：
- `"@nuxt/ui": "^4.9.0"`
- `"valibot": "^1.0.0"`
- `"vueuse-motion": "^2.x"`（注意：模块名是 `@vueuse/motion/nuxt` 但 package 名是 `vueuse-motion`）

**Step 2.2: 验证 lockfile 同步**

Run:

```bash
cd nuxt
grep -E '"@nuxt/ui"|"valibot"|"vueuse-motion"' package.json package-lock.json | head -10
```

Expected: 三组行在 `package.json` 与 `package-lock.json` 中均存在。

**Step 2.3: 暂存并 commit**

Run:

```bash
cd nuxt
git add package.json package-lock.json
git status --short
git diff --cached --name-only
git commit -m "chore(nuxt): add @nuxt/ui v4 + valibot + vueuse-motion (admin-only)"
```

Expected: `git diff --cached --name-only` 仅含 `nuxt/package.json` 与 `nuxt/package-lock.json` 两行。

---

### Task 3: 创建 `app.config.ts`

**Files:**

- Create: `nuxt/app/app.config.ts`

**Step 3.1: 写入主题配置**

Run: 用 Write 工具创建文件：

```ts
export default defineAppConfig({
  ui: {
    colors: {
      // 沿用现有 admin primary 色（Bootstrap blue #0d6efd）
      primary: 'blue',
      // 与 nuxt-public 一致
      neutral: 'slate'
    },
    icons: {
      dynamicRounded: 'rounded-full'
    },
    button: {
      defaultVariants: {
        size: 'md'
      }
    },
    // admin 不渲染 Markdown，prose 路径完全跳过
    prose: false
  }
})
```

Expected: 文件存在；与 design.md §Decisions 2 + 3 完全一致。

**Step 3.2: 暂存并 commit**

Run:

```bash
cd nuxt
git add app/app.config.ts
git status --short
git diff --cached --name-only
git commit -m "feat(nuxt): add app.config.ts with Nuxt UI theme (admin-only)"
```

Expected: `git diff --cached --name-only` 仅含 `nuxt/app/app.config.ts`。

---

### Task 4: 创建 `assets/css/main.css`（`@theme` 块）

**Files:**

- Create: `nuxt/app/assets/css/main.css`

**Step 4.1: 写入 `@theme` token**

Run: 用 Write 工具创建文件：

```css
@theme {
  /* primary 色阶（Bootstrap blue 50-900） */
  --color-primary-50: #e6f1fe;
  --color-primary-100: #cce3fd;
  --color-primary-200: #99c7fb;
  --color-primary-300: #66abf9;
  --color-primary-400: #338ff7;
  --color-primary-500: #0d6efd;
  --color-primary-600: #0a58ca;
  --color-primary-700: #0842a0;
  --color-primary-800: #052c6b;
  --color-primary-900: #031639;

  /* 圆角 token（与现有 .rounded-md/.rounded-lg 体系保持一致） */
  --radius-md: 0.5rem;
  --radius-lg: 0.625rem;
  --radius-xl: 0.75rem;
}
```

Expected: 文件存在；与 design.md §Decisions 2 完全一致。

**Step 4.2: 暂存并 commit**

Run:

```bash
cd nuxt
git add app/assets/css/main.css
git status --short
git diff --cached --name-only
git commit -m "feat(nuxt): add main.css with @theme primary 50-900 + radius tokens"
```

Expected: `git diff --cached --name-only` 仅含 `nuxt/app/assets/css/main.css`。

---

### Task 5: 更新 `nuxt.config.ts`（modules + css）

**Files:**

- Modify: `nuxt/nuxt.config.ts`

**Step 5.1: 在 `css:` 数组加入 `~/assets/css/main.css`（在 `tailwind.css` 之后）**

Run: 用 Edit 工具把 `nuxt/nuxt.config.ts` 第 51-58 行的 `css` 数组改为：

```ts
  // CSS配置 - 使用 Tailwind Typography
  css: [
    '~/assets/css/theme-variables.css',
    '~/assets/css/tailwind.css', // Tailwind CSS 入口文件
    '~/assets/css/main.css', // Nuxt UI 主题（@theme 块）
    'katex/dist/katex.min.css', // KaTeX 数学公式样式
    '~/assets/css/components/prose-custom.css', // 自定义 prose 样式
    '~/assets/css/layout.css', // 自定义布局工具类
    '~/assets/css/app.css',
  ],
```

**Step 5.2: 在 `modules:` 数组加入 `'@nuxt/ui'` 与 `'@vueuse/motion/nuxt'`（在末尾追加）**

Run: 用 Edit 工具把 `nuxt/nuxt.config.ts` 第 69-76 行的 `modules` 数组改为：

```ts
  // 模块配置
  modules: [
    '@pinia/nuxt',
    '@nuxt/icon', // Nuxt Icon 模块
    '@nuxt/fonts', // Nuxt Fonts 模块
    '@bg-dev/nuxt-naiveui', // Naive UI 模块（B.4 移除）
    '@nuxtjs/mdc', // MDC Markdown 渲染模块
    'nuxt-vitalizer', // Core Web Vitals LCP 优化
    '@nuxt/ui', // Nuxt UI v4
    '@vueuse/motion/nuxt' // VueUse Motion 动效
  ],
```

**Step 5.3: 验证 typecheck 与 build**

Run:

```bash
cd nuxt
npm run typecheck 2>&1 | tail -20
echo "---"
npm run build 2>&1 | tail -20
```

Expected: typecheck 与 build 均通过（exit 0）；可能输出大量 warning 但无 error。Nuxt UI 接入后会有 "duplicated registry" 警告，属正常。

**Step 5.4: 暂存并 commit**

Run:

```bash
cd nuxt
git add nuxt.config.ts
git status --short
git diff --cached --name-only
git commit -m "chore(nuxt): wire @nuxt/ui + vueuse-motion into nuxt.config (admin-only)"
```

Expected: `git diff --cached --name-only` 仅含 `nuxt/nuxt.config.ts`。

---

### Task 6: 用 `<UApp>` 包裹 `app.vue`

**Files:**

- Modify: `nuxt/app/app.vue`

**Step 6.1: 包裹 `<UApp>`**

Run: 用 Edit 工具把 `nuxt/app/app.vue` 第 1-9 行的 `<template>` 块改为：

```vue
<template>
  <UApp>
    <NuxtLoadingIndicator color="var(--accent-success)" :height="3" :duration="2000" :throttle="200" />
    <NuxtLayout>
      <NuxtPage :keepalive="shouldKeepAlive" :page-key="getPageKey" :transition="{
        name: 'page',
        mode: 'out-in'
      }" />
    </NuxtLayout>
  </UApp>
</template>
```

**Step 6.2: 验证 dev server 启动并响应**

Run:

```bash
cd nuxt
npm run dev &> /tmp/nuxt-dev-b1.log &
DEV_PID=$!
sleep 30
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/admin/login
curl -s http://localhost:3000/admin/login | grep -c "UApp" || echo "UApp marker not in HTML"
kill $DEV_PID
```

Expected: HTTP 200；HTML 中含 `UApp` 渲染产物（`UApp` 在 SSR 阶段渲染为 wrapper 元素，含 `data-v-app` 或类似 marker）。如果 `UApp` grep 失败但 HTTP 200，可放行（`<UApp>` 在客户端水合后才挂载；只要 HTML 返回 200 即可）。

**Step 6.3: 暂存并 commit**

Run:

```bash
cd nuxt
git add app/app.vue
git status --short
git diff --cached --name-only
git commit -m "feat(nuxt): wrap NuxtLayout in UApp for Nuxt UI context (admin)"
```

Expected: `git diff --cached --name-only` 仅含 `nuxt/app/app.vue`。

---

## Phase B.2 — admin layout 替换

### Task 7: 重构 `layouts/admin.vue`

**Files:**

- Modify: `nuxt/app/layouts/admin.vue`

**Step 7.1: 删除 NaiveUI provider 包裹**

Run: 用 Edit 工具把 `nuxt/app/layouts/admin.vue` 第 1-79 行的 `<template>` 块改为：

```vue
<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
    <!-- 顶部导航栏 -->
    <header class="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Logo 和标题 -->
          <div class="flex items-center gap-4">
            <NuxtLink to="/admin" class="flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-white">
              <Icon name="squares-2x2" size="lg" class="text-primary" />
              <span>管理后台</span>
            </NuxtLink>
          </div>

          <!-- 导航菜单 -->
          <nav class="hidden md:flex items-center gap-1">
            <NuxtLink
              v-for="item in menuItems"
              :key="item.path"
              :to="item.path"
              class="nav-link px-3 py-2 rounded-md text-sm font-medium transition-colors"
              :class="[
                isActive(item.path)
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              ]"
            >
              <Icon :name="item.icon" size="sm" class="mr-1.5" />
              {{ item.label }}
            </NuxtLink>
          </nav>

          <!-- 右侧操作 -->
          <div class="flex items-center gap-3">
            <NuxtLink to="/" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <Icon name="home" size="md" />
            </NuxtLink>
            <UButton variant="ghost" color="neutral" square @click="handleLogout">
              <template #leading>
                <Icon name="arrow-left" size="md" />
              </template>
            </UButton>
          </div>
        </div>
      </div>

      <!-- 移动端菜单 -->
      <div class="md:hidden border-t dark:border-gray-700">
        <div class="flex overflow-x-auto px-2 py-2 gap-1">
          <NuxtLink
            v-for="item in menuItems"
            :key="item.path"
            :to="item.path"
            class="shrink-0 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap"
            :class="[
              isActive(item.path)
                ? 'bg-primary/10 text-primary'
                : 'text-gray-600 dark:text-gray-300'
            ]"
          >
            <Icon :name="item.icon" size="sm" class="mr-1" />
            {{ item.label }}
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <slot />
    </main>
  </div>
</template>
```

**Step 7.2: 删除 `import { darkTheme } from 'naive-ui'`**

Run: 用 Edit 工具把 `nuxt/app/layouts/admin.vue` 第 81-82 行的 `<script setup>` 块开头改为：

```js
<script setup>
// 主题状态
const isDarkMode = useState('isDarkMode', () => false)
```

（删除 `import { darkTheme } from 'naive-ui'` 行）

**Step 7.3: 验证 grep**

Run:

```bash
cd nuxt
grep -n "naive-ui\|n-config-provider\|n-message-provider\|n-dialog-provider\|darkTheme" app/layouts/admin.vue || echo "OK: no NaiveUI in admin.vue"
```

Expected: `OK: no NaiveUI in admin.vue`。

**Step 7.4: 暂存并 commit**

Run:

```bash
cd nuxt
git add app/layouts/admin.vue
git status --short
git diff --cached --name-only
git commit -m "refactor(nuxt): replace NaiveUI providers with UApp context in admin layout"
```

Expected: `git diff --cached --name-only` 仅含 `nuxt/app/layouts/admin.vue`。

---

### Task 8: 重构 `layouts/blank.vue`

**Files:**

- Modify: `nuxt/app/layouts/blank.vue`

**Step 8.1: 移除 `<n-message-provider>` 与 import**

Run: 用 Write 工具重写文件：

```vue
<template>
  <div>
    <slot />
  </div>
</template>

<script setup>
</script>
```

**Step 8.2: 验证 grep**

Run:

```bash
cd nuxt
grep -n "naive-ui\|n-message-provider\|NMessageProvider" app/layouts/blank.vue || echo "OK: no NaiveUI in blank.vue"
```

Expected: `OK: no NaiveUI in blank.vue`。

**Step 8.3: 暂存并 commit**

Run:

```bash
cd nuxt
git add app/layouts/blank.vue
git status --short
git diff --cached --name-only
git commit -m "refactor(nuxt): remove NMessageProvider from blank layout"
```

Expected: `git diff --cached --name-only` 仅含 `nuxt/app/layouts/blank.vue`。

---

## Phase B.3 — admin 业务替换

### Task 9: UTable vs n-data-table PoC 验证

**Files:**

- (PoC 验证，不改业务文件)

**Step 9.1: 创建 PoC 分支**

Run:

```bash
cd /d/Work_space/MyBlogWeb-CloudflarePage
git checkout -b poc/nuxt-ui-v4-utable-validation
```

Expected: `Switched to a new branch 'poc/nuxt-ui-v4-utable-validation'`。

**Step 9.2: 在 `pages/admin/articles/index.vue` 临时替换 `<n-data-table>` 为 `<UTable>` 验证**

Run: 用 Edit 工具把 `nuxt/app/pages/admin/articles/index.vue` 中的 `<n-data-table>` 段（约 60-150 行）替换为 `<UTable :data="rows" :columns="columns" />`，其中 `rows` 取自当前 `articles` 数组，`columns` 写最小集（title/author/status）。无需完整迁移，仅验证渲染。

**Step 9.3: 启动 dev server 验证**

Run:

```bash
cd nuxt
npm run dev &> /tmp/nuxt-dev-poc.log &
DEV_PID=$!
sleep 30
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/admin/articles
kill $DEV_PID
```

Expected: HTTP 200；如果返回 500，`<UTable>` 与现有数据存在兼容问题，参见 Task 9.5 备选方案。

**Step 9.4: 检查 `<UTable>` 分页/筛选/排序行为**

人工验证（手动打开浏览器 `http://localhost:3000/admin/articles`）：
- 分页：页码切换、每页条数切换
- 排序：列头点击
- 筛选：搜索框输入

记录每一项的行为对比 `<n-data-table>`：
- ✅ 完全等价 → 继续 Task 10
- ⚠️ 部分差异（缺失分页/排序/筛选中任一） → 执行 Step 9.5

**Step 9.5: 备选方案（如果 PoC 失败）**

如果 `<UTable>` 不完整覆盖现有功能，回退到 `<UTable>` + 手动分页/筛选：在 `articles/index.vue` 内自行实现 `currentPage / pageSize / searchQuery` 状态，手动 `computed` 过滤后传给 `<UTable :data="filteredRows" />`；分页用 `<UPagination v-model:page="currentPage" :total="filteredRows.length" :items-per-page="pageSize" />`。把 Step 9.2 替换为这种实现，验证通过后继续。

**Step 9.6: 提交 PoC 结果**

Run:

```bash
cd /d/Work_space/MyBlogWeb-CloudflarePage
git add -A nuxt/app/pages/admin/articles/index.vue
git status --short
git diff --cached --name-only
git commit -m "poc(nuxt): validate UTable vs n-data-table for admin articles list"
```

Expected: `git diff --cached --name-only` 仅含 `nuxt/app/pages/admin/articles/index.vue`。

**Step 9.7: 回到主分支并保留 PoC 分支**

Run:

```bash
cd /d/Work_space/MyBlogWeb-CloudflarePage
git checkout feature/nuxt-ssr-nuxt-ui-v4-migration
git branch -D poc/nuxt-ui-v4-utable-validation
git branch -a | grep poc
```

Expected: 当前分支回到 `feature/nuxt-ssr-nuxt-ui-v4-migration`；`poc/*` 分支已删除（按 CLAUDE.md §2.2 范围受控原则，PoC 分支不外推）。如果 PoC 中发现的设计需要保留到 design.md，单独记录在 `openspec/changes/nuxt-ssr-nuxt-ui-v4-migration/notes/poc-utable.md`（可选）。

---

### Task 10: 替换 `pages/admin/login.vue`（form + valibot）

**Files:**

- Modify: `nuxt/app/pages/admin/login.vue`

**Step 10.1: 读取当前文件并替换**

Run: 用 Read 工具读取 `nuxt/app/pages/admin/login.vue` 全文，然后用 Edit 工具按映射表替换：
- `<n-form :model="form" :rules="rules">` → `<UForm :state="form" :schema="schema" @submit="onSubmit">`
- 删除 `:rules` 与 `rules` 对象
- `import { useMessage } from 'naive-ui'` → 删除
- `const message = useMessage()` → `const toast = useToast()`
- `message.success('...')` → `toast.add({ title: '...', color: 'success' })`
- `message.error('...')` → `toast.add({ title: '...', color: 'error' })`
- `<n-form-item label="...">` → `<UFormField label="..." name="...">`
- `<n-input v-model:value="form.username">` → `<UInput v-model="form.username">`
- `<n-input v-model:value="form.password" type="password">` → `<UInput v-model="form.password" type="password">`
- `<n-button type="primary" @click="handleLogin">` → `<UButton type="submit" color="primary" block :loading="loading">登录</UButton>`（在 `<UForm>` 内）
- 删除 `handleLogin` 函数（替换为 `<UForm @submit="onSubmit">`）

**Step 10.2: 编写 valibot schema**

Run: 用 Edit 工具在 `<script setup>` 段顶部（紧接 `import` 之后）加入：

```js
import * as v from 'valibot'

const schema = v.object({
  username: v.pipe(v.string(), v.minLength(1, '请输入用户名')),
  password: v.pipe(v.string(), v.minLength(6, '密码至少 6 位'))
})
```

**Step 10.3: 验证 grep**

Run:

```bash
cd nuxt
grep -n "naive-ui\|n-form\|n-input\|n-button\|useMessage" app/pages/admin/login.vue || echo "OK: no NaiveUI in login.vue"
```

Expected: `OK: no NaiveUI in login.vue`。

**Step 10.4: 验证 typecheck**

Run:

```bash
cd nuxt
npm run typecheck 2>&1 | tail -10
```

Expected: exit 0；可能 0 个 error。

**Step 10.5: 暂存并 commit**

Run:

```bash
cd nuxt
git add app/pages/admin/login.vue
git status --short
git diff --cached --name-only
git commit -m "refactor(nuxt): migrate admin/login.vue to UForm + valibot + useToast"
```

Expected: `git diff --cached --name-only` 仅含 `nuxt/app/pages/admin/login.vue`。

---

### Task 11: 替换 `pages/admin/password.vue`（form + valibot）

**Files:**

- Modify: `nuxt/app/pages/admin/password.vue`

**Step 11.1: 读取并替换**

Run: 用 Read 读取 `nuxt/app/pages/admin/password.vue`，按 Task 10 的模式替换（form + valibot + useToast）；valibot schema 包含 `oldPassword / newPassword / confirmPassword`，新密码至少 8 位、需与确认密码一致（用 `v.pipe(v.string(), v.minLength(8), v.regex(/.../))` 或在 `onSubmit` 中显式校验）。

**Step 11.2: 验证 grep**

Run:

```bash
cd nuxt
grep -n "naive-ui\|n-form\|n-input\|n-button\|useMessage" app/pages/admin/password.vue || echo "OK: no NaiveUI in password.vue"
```

Expected: `OK: no NaiveUI in password.vue`。

**Step 11.3: 验证 typecheck**

Run:

```bash
cd nuxt
npm run typecheck 2>&1 | tail -10
```

Expected: exit 0。

**Step 11.4: 暂存并 commit**

Run:

```bash
cd nuxt
git add app/pages/admin/password.vue
git status --short
git diff --cached --name-only
git commit -m "refactor(nuxt): migrate admin/password.vue to UForm + valibot + useToast"
```

Expected: `git diff --cached --name-only` 仅含 `nuxt/app/pages/admin/password.vue`。

---

### Task 12: 替换 `pages/admin/index.vue`（dashboard 卡片）

**Files:**

- Modify: `nuxt/app/pages/admin/index.vue`

**Step 12.1: 读取并替换**

Run: 用 Read 读取 `nuxt/app/pages/admin/index.vue`，按映射表替换：
- `<n-card title="...">` → `<UCard>`（`<template #header>标题</template>` 或 prop `header`）
- `<n-button>` 系列 → `<UButton>`
- `<n-statistic>` → `<div class="text-3xl font-bold">{{ count }}</div>` + 描述
- `<n-spin>` → `<USpinner v-if="loading" />`
- `<n-empty>` → `<UEmpty v-if="!data" />`
- `<n-tag>` → `<UBadge variant="subtle">`

**Step 12.2: 验证 grep**

Run:

```bash
cd nuxt
grep -n "naive-ui\|n-card\|n-button\|n-statistic\|n-tag\|n-empty\|n-spin" app/pages/admin/index.vue || echo "OK: no NaiveUI in admin index"
```

Expected: `OK: no NaiveUI in admin index`。

**Step 12.3: 暂存并 commit**

Run:

```bash
cd nuxt
git add app/pages/admin/index.vue
git status --short
git diff --cached --name-only
git commit -m "refactor(nuxt): migrate admin/index.vue dashboard to Nuxt UI components"
```

Expected: `git diff --cached --name-only` 仅含 `nuxt/app/pages/admin/index.vue`。

---

### Task 13: 替换 `pages/admin/articles/index.vue`（UTable + form + valibot）

**Files:**

- Modify: `nuxt/app/pages/admin/articles/index.vue`

**Step 13.1: 读取并替换**

Run: 用 Read 读取 `nuxt/app/pages/admin/articles/index.vue`，按映射表替换：
- `<n-data-table :data :columns>` → `<UTable :data :columns>`（参考 Task 9 PoC 的列定义）
- `<n-button>` → `<UButton>`
- `<n-popconfirm @positive-click="...">` → 替换为 `<UModal v-model:open="confirmDeleteId">` + `<UButton @click="confirmDeleteId = id">删除</UButton>` + `<UButton @click="handleDelete(id)">确认</UButton>`（在 modal footer）
- `useMessage()` → `useToast()`
- 搜索/筛选/排序按 Task 9 PoC 决策实施

**Step 13.2: 验证 grep**

Run:

```bash
cd nuxt
grep -n "naive-ui\|n-data-table\|n-button\|n-popconfirm\|n-input\|useMessage" app/pages/admin/articles/index.vue || echo "OK: no NaiveUI in articles index"
```

Expected: `OK: no NaiveUI in articles index`。

**Step 13.3: 验证 typecheck**

Run:

```bash
cd nuxt
npm run typecheck 2>&1 | tail -10
```

Expected: exit 0。

**Step 13.4: 暂存并 commit**

Run:

```bash
cd nuxt
git add app/pages/admin/articles/index.vue
git status --short
git diff --cached --name-only
git commit -m "refactor(nuxt): migrate admin/articles/index.vue to UTable + UForm + useToast"
```

Expected: `git diff --cached --name-only` 仅含 `nuxt/app/pages/admin/articles/index.vue`。

---

### Task 14: 替换 `pages/admin/articles/[id].vue`（编辑页）

**Files:**

- Modify: `nuxt/app/pages/admin/articles/[id].vue`

**Step 14.1: 读取并替换**

Run: 用 Read 读取 `nuxt/app/pages/admin/articles/[id].vue`，按映射表替换：
- `<n-form>` → `<UForm :state :schema>` + `<UFormField>` + valibot
- `<n-input>` → `<UInput>` / `<UTextarea>`
- `<n-select>` → `<USelect :items>`
- `<n-button>` → `<UButton>`
- `<n-spin>` → `<USpinner>` + 条件渲染
- `useMessage()` → `useToast()`

**Step 14.2: 验证 grep**

Run:

```bash
cd nuxt
grep -n "naive-ui\|n-form\|n-input\|n-select\|n-button\|n-spin\|useMessage" "app/pages/admin/articles/[id].vue" || echo "OK: no NaiveUI in articles [id]"
```

Expected: `OK: no NaiveUI in articles [id]`。

**Step 14.3: 暂存并 commit**

Run:

```bash
cd nuxt
git add "app/pages/admin/articles/[id].vue"
git status --short
git diff --cached --name-only
git commit -m "refactor(nuxt): migrate admin/articles/[id].vue to UForm + valibot + useToast"
```

Expected: `git diff --cached --name-only` 仅含 `nuxt/app/pages/admin/articles/[id].vue`。

---

### Task 15: 替换 `pages/admin/articles/create.vue`（新建页）

**Files:**

- Modify: `nuxt/app/pages/admin/articles/create.vue`

**Step 15.1: 复用 Task 14 的替换模式**

Run: 用 Read 读取 `nuxt/app/pages/admin/articles/create.vue`，按 Task 14 模式替换。如果 create.vue 与 [id].vue 几乎相同，可考虑：把 create.vue 改为复用 `<AdminArticleEditorContainer>` 组件（如果存在）并删除 create.vue。本次按"最小迁移"原则，直接在 create.vue 内做替换。

**Step 15.2: 验证 grep**

Run:

```bash
cd nuxt
grep -n "naive-ui\|n-form\|n-input\|n-select\|n-button\|n-spin\|useMessage" app/pages/admin/articles/create.vue || echo "OK: no NaiveUI in articles create"
```

Expected: `OK: no NaiveUI in articles create`。

**Step 15.3: 暂存并 commit**

Run:

```bash
cd nuxt
git add app/pages/admin/articles/create.vue
git status --short
git diff --cached --name-only
git commit -m "refactor(nuxt): migrate admin/articles/create.vue to UForm + valibot + useToast"
```

Expected: `git diff --cached --name-only` 仅含 `nuxt/app/pages/admin/articles/create.vue`。

---

### Task 16: 替换 `pages/admin/comments/index.vue`（UTable）

**Files:**

- Modify: `nuxt/app/pages/admin/comments/index.vue`

**Step 16.1: 读取并替换**

Run: 用 Read 读取 `nuxt/app/pages/admin/comments/index.vue`，按 Task 13 模式替换（UTable + 按钮 + useToast）。

**Step 16.2: 验证 grep**

Run:

```bash
cd nuxt
grep -n "naive-ui\|n-data-table\|n-button\|useMessage" app/pages/admin/comments/index.vue || echo "OK: no NaiveUI in comments index"
```

Expected: `OK: no NaiveUI in comments index`。

**Step 16.3: 暂存并 commit**

Run:

```bash
cd nuxt
git add app/pages/admin/comments/index.vue
git status --short
git diff --cached --name-only
git commit -m "refactor(nuxt): migrate admin/comments/index.vue to UTable + useToast"
```

Expected: `git diff --cached --name-only` 仅含 `nuxt/app/pages/admin/comments/index.vue`。

---

### Task 17: 替换 `pages/admin/gallery/index.vue`（UTable + 编辑模态）

**Files:**

- Modify: `nuxt/app/pages/admin/gallery/index.vue`

**Step 17.1: 读取并替换**

Run: 用 Read 读取 `nuxt/app/pages/admin/gallery/index.vue`。注意：本文件很可能是 `<AdminGalleryPageContainer>` 的薄包装。按映射表替换文件内 NaiveUI 标签；具体业务组件替换在 Task 19 处理。

**Step 17.2: 验证 grep**

Run:

```bash
cd nuxt
grep -n "naive-ui\|n-data-table\|n-button\|n-modal\|useMessage" app/pages/admin/gallery/index.vue || echo "OK: no NaiveUI in gallery index"
```

Expected: `OK: no NaiveUI in gallery index`。

**Step 17.3: 暂存并 commit**

Run:

```bash
cd nuxt
git add app/pages/admin/gallery/index.vue
git status --short
git diff --cached --name-only
git commit -m "refactor(nuxt): migrate admin/gallery/index.vue to UTable + UModal"
```

Expected: `git diff --cached --name-only` 仅含 `nuxt/app/pages/admin/gallery/index.vue`。

---

### Task 18: 替换 `pages/admin/imagebed/index.vue`（UFileUpload）

**Files:**

- Modify: `nuxt/app/pages/admin/imagebed/index.vue`

**Step 18.1: 读取并替换**

Run: 用 Read 读取 `nuxt/app/pages/admin/imagebed/index.vue`，按映射表替换：
- `<n-upload>` → `<UFileUpload v-model="files">` 或 Nuxt UI v4 推荐的 `<UFileUpload>` API（参考 Nuxt UI v4 文档）；拖拽区域如 `<UFileUpload>` 不支持，保留原生 `<div @drop>` 实现
- `<n-button>` → `<UButton>`
- `<n-modal>` → `<UModal>`
- `<n-spin>` → `<USpinner>`
- `useMessage()` → `useToast()`

**Step 18.2: 验证 grep**

Run:

```bash
cd nuxt
grep -n "naive-ui\|n-upload\|n-button\|n-modal\|n-spin\|useMessage" app/pages/admin/imagebed/index.vue || echo "OK: no NaiveUI in imagebed index"
```

Expected: `OK: no NaiveUI in imagebed index`。

**Step 18.3: 暂存并 commit**

Run:

```bash
cd nuxt
git add app/pages/admin/imagebed/index.vue
git status --short
git diff --cached --name-only
git commit -m "refactor(nuxt): migrate admin/imagebed/index.vue to UFileUpload + useToast"
```

Expected: `git diff --cached --name-only` 仅含 `nuxt/app/pages/admin/imagebed/index.vue`。

---

### Task 19: 替换 `AdminArticleEditorContainer.vue`（md-editor-v3 保留）

**Files:**

- Modify: `nuxt/app/features/article-admin/containers/AdminArticleEditorContainer.vue`

**Step 19.1: 读取并替换**

Run: 用 Read 读取文件，按映射表替换：
- `<n-spin :show="loading">` → `<USpinner v-if="loading" class="mx-auto my-8" />` + 条件渲染内部内容
- `<n-card title="...">` → `<UCard>` + `<template #header>`
- `<n-form-item>` → `<UFormField>`
- `<n-input v-model:value>` → `<UInput v-model>`
- `<n-input type="textarea">` → `<UTextarea v-model>`
- `<n-select :options>` → `<USelect :items>`
- `<n-dynamic-tags>` → `<UInputTags v-model>`
- `<n-tag>` → `<UBadge variant="subtle">`
- `<n-divider>` → `<USeparator>`
- `<n-button>` → `<UButton>`
- `useMessage()` → `useToast()`
- 保留 `MdEditorWrapper.client.vue` 调用（line ~175）不变

**Step 19.2: 验证 grep**

Run:

```bash
cd nuxt
grep -n "naive-ui\|n-card\|n-form\|n-input\|n-select\|n-button\|n-tag\|n-dynamic-tags\|n-divider\|n-spin\|useMessage" app/features/article-admin/containers/AdminArticleEditorContainer.vue || echo "OK: no NaiveUI in article editor container"
```

Expected: `OK: no NaiveUI in article editor container`。

**Step 19.3: 暂存并 commit**

Run:

```bash
cd nuxt
git add app/features/article-admin/containers/AdminArticleEditorContainer.vue
git status --short
git diff --cached --name-only
git commit -m "refactor(nuxt): migrate AdminArticleEditorContainer to Nuxt UI (md-editor retained)"
```

Expected: `git diff --cached --name-only` 仅含 `nuxt/app/features/article-admin/containers/AdminArticleEditorContainer.vue`。

---

### Task 20: 替换 gallery-admin container + composable

**Files:**

- Modify: `nuxt/app/features/gallery-admin/containers/AdminGalleryPageContainer.vue`
- Modify: `nuxt/app/features/gallery-admin/composables/useAdminImagebedPage.ts`

**Step 20.1: 替换 `AdminGalleryPageContainer.vue`**

Run: 用 Read 读取文件，按映射表替换（约 50 处 NaiveUI）：
- `<n-data-table>` → `<UTable>`
- `<n-button>` → `<UButton>`
- `<n-modal>` → `<UModal>`
- `<n-card>` → `<UCard>`
- `<n-tag>` → `<UBadge variant="subtle">`
- `useMessage()` → `useToast()`

**Step 20.2: 替换 `useAdminImagebedPage.ts`**

Run: 用 Read 读取文件。如果含 `useMessage()` 调用（极少情况），改为 `useToast()`；如果 `useMessage` 仅在返回函数中调用，建议在 composable 内 `const toast = useToast()` setup 顶层获取，传给 actions 或在 actions 内 `useToast()`（注意：composable 内 setup 顶层合法；store action 内的 `useToast()` 也合法但需谨慎）。

**Step 20.3: 验证 grep**

Run:

```bash
cd nuxt
grep -n "naive-ui\|n-data-table\|n-button\|n-modal\|n-card\|n-tag\|useMessage" app/features/gallery-admin/containers/AdminGalleryPageContainer.vue || echo "OK: container"
grep -n "naive-ui\|useMessage" app/features/gallery-admin/composables/useAdminImagebedPage.ts || echo "OK: composable"
```

Expected: 两行均以 `OK:` 开头。

**Step 20.4: 暂存并 commit**

Run:

```bash
cd nuxt
git add app/features/gallery-admin/containers/AdminGalleryPageContainer.vue app/features/gallery-admin/composables/useAdminImagebedPage.ts
git status --short
git diff --cached --name-only
git commit -m "refactor(nuxt): migrate gallery-admin container + imagebed composable to Nuxt UI"
```

Expected: `git diff --cached --name-only` 含两行。

---

### Task 21: 替换 gallery-admin components（4 imagebed + 3 gallery）

**Files:**

- Modify: `nuxt/app/features/gallery-admin/components/imagebed/ImagebedFileArea.vue`
- Modify: `nuxt/app/features/gallery-admin/components/imagebed/ImagebedPreviewModal.vue`
- Modify: `nuxt/app/features/gallery-admin/components/imagebed/ImagebedToolbar.vue`
- Modify: `nuxt/app/features/gallery-admin/components/imagebed/ImagebedUploadArea.vue`
- Modify: `nuxt/app/features/gallery-admin/components/gallery/GalleryCardGrid.vue`
- Modify: `nuxt/app/features/gallery-admin/components/gallery/GalleryEditModal.vue`
- Modify: `nuxt/app/features/gallery-admin/components/gallery/GalleryFilterBar.vue`

**Step 21.1: 替换 4 个 imagebed 组件**

Run: 对每个文件用 Read 读取 + Edit 替换。统一映射：
- `<n-button>` → `<UButton>`
- `<n-modal>` → `<UModal>`
- `<n-spin>` → `<USpinner>`
- `<n-tag>` → `<UBadge variant="subtle">`
- `<n-input>` → `<UInput>`
- `<n-pagination>` → `<UPagination>`
- `useMessage()` → `useToast()`

`ImagebedUploadArea.vue` 涉及拖拽上传：`<n-upload>` 替换为 `<UFileUpload>` 或保留原生 `<div @drop>` 实现（按 Task 18 PoC 决策）。

**Step 21.2: 替换 3 个 gallery 组件**

Run: 对 `GalleryCardGrid.vue`、`GalleryEditModal.vue`、`GalleryFilterBar.vue` 同样按映射表替换。

**Step 21.3: 验证 grep**

Run:

```bash
cd nuxt
grep -rEn "naive-ui|<n-(button|modal|spin|tag|input|pagination|upload|select|form|empty|card|alert|switch|divider)|useMessage" app/features/gallery-admin/components/ || echo "OK: no NaiveUI in gallery-admin components"
```

Expected: `OK: no NaiveUI in gallery-admin components`。

**Step 21.4: 验证 typecheck**

Run:

```bash
cd nuxt
npm run typecheck 2>&1 | tail -10
```

Expected: exit 0。

**Step 21.5: 暂存并 commit**

Run:

```bash
cd nuxt
git add app/features/gallery-admin/components/
git status --short
git diff --cached --name-only
git commit -m "refactor(nuxt): migrate gallery-admin components (4 imagebed + 3 gallery) to Nuxt UI"
```

Expected: `git diff --cached --name-only` 含 7 个 `.vue` 文件。

---

### Task 22: Pinia store `useToast()` 规范化

**Files:**

- Modify: `nuxt/app/stores/auth.ts`（如果含 `useMessage`）
- Modify: `nuxt/app/features/article-admin/composables/useAdminArticlesFeature.ts`（如需）
- Modify: `nuxt/app/features/article-admin/composables/useAdminCommentsFeature.ts`（如需）
- Modify: `nuxt/app/features/gallery-admin/composables/useAdminGalleryFeature.ts`（如需）

**Step 22.1: grep 现有 useMessage / useDialog**

Run:

```bash
cd nuxt
grep -rn "useMessage\|useDialog\|useNotification" app/ --include="*.ts" --include="*.vue"
```

Expected: 列出所有引用文件。Task 10-21 已替换 `.vue` 内调用；剩余应只在 `.ts` store / composable 中。

**Step 22.2: 逐文件替换为 `useToast()`**

对每个命中文件用 Read + Edit：
- `import { useMessage } from 'naive-ui'` → 删除
- `const message = useMessage()` → `const toast = useToast()`
- `message.success(...)` → `toast.add({ title: ..., color: 'success' })`
- `message.error(...)` → `toast.add({ title: ..., color: 'error', description: errMsg })`

**Step 22.3: 验证 grep**

Run:

```bash
cd nuxt
grep -rn "useMessage\|useDialog\|useNotification" app/ --include="*.ts" --include="*.vue" || echo "OK: no NaiveUI composables"
```

Expected: `OK: no NaiveUI composables`。

**Step 22.4: 暂存并 commit**

Run:

```bash
cd nuxt
git add app/stores/ app/features/article-admin/composables/ app/features/gallery-admin/composables/
git status --short
git diff --cached --name-only
git commit -m "refactor(nuxt): normalize useToast() calls in stores + composables"
```

Expected: `git diff --cached --name-only` 含所有修改的 `.ts` 文件。

---

### Task 23: `MdEditorWrapper.client.vue` 内部清理（仅自定义扩展）

**Files:**

- Modify: `nuxt/app/components/MdEditorWrapper.client.vue`（**可选，最小修改**）

**Step 23.1: grep 内部 NaiveUI 引用**

Run:

```bash
cd nuxt
grep -n "<n-\|naive-ui\|useMessage\|useDialog" app/components/MdEditorWrapper.client.vue
```

Expected: 列出引用。本组件是 md-editor-v3 包装，按豁免清单保留；但**自定义扩展部分**（非 md-editor-v3 自带 toolbar）应清理。

**Step 23.2: 区分 md-editor-v3 自带与自定义**

Run: 用 Read 读取文件，定位：
- md-editor-v3 自带 toolbar（在其 `<MdEditor>` 组件内）— **保留**
- 自定义工具栏扩展（在 `<MdEditor>` 外或 `<template #toolbar>` 内的自定义按钮）— **替换为 `<UButton>`**

**Step 23.3: 替换自定义扩展（如有）**

对每个自定义 `<n-button>` 用 Edit 替换为 `<UButton>`。如果文件仅含 md-editor-v3 自带 toolbar 的间接依赖（如导入 `NButton` 用于 `n-button-group` 内部），保留不动并在文件顶部加注释：

```js
// 注意：本组件是 md-editor-v3 包装器；md-editor-v3 内部依赖 NaiveUI 主题。
// 由于本组件是 .client.vue 后缀，不进入 SSR bundle，对 admin 迁移无影响。
```

**Step 23.4: 暂存并 commit（如有改动）**

Run:

```bash
cd nuxt
git add app/components/MdEditorWrapper.client.vue
git status --short
git diff --cached --name-only
[ -n "$(git diff --cached --name-only)" ] && git commit -m "refactor(nuxt): clean custom NaiveUI extensions in MdEditorWrapper (md-editor retained)" || echo "No changes to MdEditorWrapper, skipping commit"
```

Expected: 要么提交一个文件，要么输出 `No changes to MdEditorWrapper, skipping commit`。

---

## Phase B.4 — 清理归档

### Task 24: `nuxt.config.ts` 全面清理（移除 NaiveUI 残留）

**Files:**

- Modify: `nuxt/nuxt.config.ts`

**Step 24.1: 移除 `'@bg-dev/nuxt-naiveui'` 模块**

Run: 用 Edit 工具把 `nuxt/nuxt.config.ts` 的 `modules:` 数组 `'@bg-dev/nuxt-naiveui'` 行删除（保留 B.1 加入的 `'@nuxt/ui'` 与 `'@vueuse/motion/nuxt'`）。

**Step 24.2: 删除 `naiveui:` 配置块**

Run: 用 Edit 工具把 `nuxt/nuxt.config.ts` 第 189-193 行的 `naiveui: { ... }` 块整段删除：

```ts
  // Naive UI 配置
  naiveui: {
    colorModePreference: 'system',
    iconSize: 18,
    themeConfig: {}
  },
```

替换为：

```ts
  // （Naive UI 配置已移除，B.1 起改用 @nuxt/ui）
```

**Step 24.3: 移除 `build.transpile` 中的 `'naive-ui'`**

Run: 用 Edit 工具把 `transpile: ['@vueuse/core', 'naive-ui']` 改为 `transpile: ['@vueuse/core']`。

**Step 24.4: 移除 `vite.optimizeDeps.include` 中的 `'naive-ui'`**

Run: 用 Edit 工具把 `optimizeDeps.include` 数组中的 `'naive-ui'` 行删除。

**Step 24.5: 替换 `manualChunks` 中的 `naive-ui` 分支**

Run: 用 Edit 工具把 `manualChunks` 函数体（当前为空，仅 `mermaid` 分支）扩展为：

```ts
        output: {
          manualChunks(id) {
            // 仅分割不会导致循环依赖的大型库
            if (id.includes('node_modules/mermaid')) {
              return 'vendor-markdown';
            }
            // UI 库及其核心依赖必须在同一 chunk 以避免循环依赖
            if (id.includes('node_modules/@nuxt/ui')
              || id.includes('node_modules/reka-ui')
              || id.includes('node_modules/@internationalized')
              || id.includes('node_modules/@vueuse')) {
              return 'vendor-ui';
            }
          }
        }
```

**Step 24.6: 验证 grep**

Run:

```bash
cd nuxt
grep -n "naive-ui\|naiveui" nuxt.config.ts || echo "OK: no NaiveUI refs in nuxt.config.ts"
```

Expected: `OK: no NaiveUI refs in nuxt.config.ts`。

**Step 24.7: 验证 typecheck + build**

Run:

```bash
cd nuxt
npm run typecheck 2>&1 | tail -10
echo "---"
npm run build 2>&1 | tail -20
```

Expected: typecheck 与 build 均通过（exit 0）。

**Step 24.8: 暂存并 commit**

Run:

```bash
cd nuxt
git add nuxt.config.ts
git status --short
git diff --cached --name-only
git commit -m "chore(nuxt): remove NaiveUI config + manualChunks vendor-ui (admin-only)"
```

Expected: `git diff --cached --name-only` 仅含 `nuxt/nuxt.config.ts`。

---

### Task 25: 卸载 `naive-ui` 与 `@bg-dev/nuxt-naiveui`

**Files:**

- Modify: `nuxt/package.json`
- Modify: `nuxt/package-lock.json`

**Step 25.1: 卸载两个 NaiveUI 包**

Run:

```bash
cd nuxt
npm uninstall naive-ui @bg-dev/nuxt-naiveui
```

Expected: `npm uninstall` 成功；`package.json` 中 `naive-ui` 与 `@bg-dev/nuxt-naiveui` 两行被删除；`node_modules/naive-ui` 目录被删除。

**Step 25.2: 验证 package.json**

Run:

```bash
cd nuxt
grep -E '"naive-ui"|"@bg-dev/nuxt-naiveui"' package.json || echo "OK: naive-ui removed from package.json"
```

Expected: `OK: naive-ui removed from package.json`。

**Step 25.3: 暂存并 commit**

Run:

```bash
cd nuxt
git add package.json package-lock.json
git status --short
git diff --cached --name-only
git commit -m "chore(nuxt): uninstall naive-ui and @bg-dev/nuxt-naiveui"
```

Expected: `git diff --cached --name-only` 含 `nuxt/package.json` 与 `nuxt/package-lock.json` 两行。

---

### Task 26: 全量 grep 验证（0 NaiveUI 残留）

**Files:**

- (验证步骤，不改文件)

**Step 26.1: 验证 `from 'naive-ui'` 0 命中**

Run:

```bash
cd nuxt
grep -rn "from 'naive-ui'" app/ layouts/ nuxt.config.ts || echo "OK: no 'from naive-ui' imports"
```

Expected: `OK: no 'from naive-ui' imports`。

**Step 26.2: 验证 `<n-` 标签 0 命中（除豁免项）**

Run:

```bash
cd nuxt
grep -rEn "<n-(button|form|input|select|card|modal|spin|tab-pane|switch|data-table|input-number|alert|tag|upload|message|dialog|config-provider|dynamic-tags|empty|image|menu|badge|divider|popconfirm|skeleton|space|step|tabs|rate|checkbox|radio-button|radio-group|date-picker|pagination|drawer)" app/ --include="*.vue" || echo "OK: no <n-* tags in app/"
```

Expected: `OK: no <n-* tags in app/`。豁免项（`components/content/*`、`MdEditorWrapper.client.vue`、`MarkdownRenderer.vue`、`StateLoading.vue`）按设计登记不计入。

**Step 26.3: 验证 `useMessage / useDialog / useNotification` 0 命中**

Run:

```bash
cd nuxt
grep -rn "useMessage\|useDialog\|useNotification" app/ --include="*.ts" --include="*.vue" || echo "OK: no NaiveUI composables"
```

Expected: `OK: no NaiveUI composables`。

**Step 26.4: 验证全量 grep 计数对比基线**

Run:

```bash
cd nuxt
grep -rEn "<n-(button|form|input|select|card|modal|spin|tab-pane|switch|data-table|input-number|alert|tag|upload|message|dialog|config-provider|dynamic-tags|empty|image|menu|badge|divider|popconfirm|skeleton|space|step|tabs|rate|checkbox|radio-button|radio-group|date-picker|pagination|drawer)" app/ --include="*.vue" | wc -l
```

Expected: `0`（对比基线 Task 1.5 的 261）。

---

### Task 27: 全量验证（typecheck / build / css audit / 路由烟测）

**Files:**

- (验证步骤)

**Step 27.1: typecheck**

Run:

```bash
cd nuxt
npm run typecheck 2>&1 | tail -10
```

Expected: exit 0。

**Step 27.2: build**

Run:

```bash
cd nuxt
npm run build 2>&1 | tail -20
```

Expected: exit 0；记录耗时与产物大小（对比 Task 1.6 基线）。

**Step 27.3: css:audit 与 css:imports:audit**

Run:

```bash
cd nuxt
npm run css:audit 2>&1 | tail -10
echo "---"
npm run css:imports:audit 2>&1 | tail -10
```

Expected: 两个 audit 均 0 violation（exit 0）。

**Step 27.4: dev server 启动 + 6 路由烟测**

Run:

```bash
cd nuxt
npm run dev &> /tmp/nuxt-dev-b4.log &
DEV_PID=$!
sleep 30
for path in /admin /admin/login /admin/articles /admin/comments /admin/gallery /admin/imagebed /admin/password; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000${path}")
  echo "${path}: HTTP ${code}"
done
kill $DEV_PID
```

Expected: 7 个路径全部返回 200 或受保护路径正常重定向（如 `/admin` 未登录时重定向到 `/admin/login`，返回 200）。如果任一 500，查看 `/tmp/nuxt-dev-b4.log` 末尾 30 行排错。

**Step 27.5: 暗色模式切换验证**

Run: 人工验证：
1. 打开 `http://localhost:3000/admin/login`（用 `npm run dev` 启动）
2. 在 admin 顶部找暗色切换（如保留原 `useState('isDarkMode')` 切换按钮，验证 `<html>.dark` class 切换生效）
3. 检查表单元素、按钮在暗色下无对比度问题

记录结果于本步骤注释。

---

### Task 28: 业务流手测（关键路径）

**Files:**

- (验证步骤)

**Step 28.1: 登录流程**

人工验证：访问 `/admin/login` → 输入凭证 → 登录成功 → 跳转 `/admin`。

**Step 28.2: 文章 CRUD**

人工验证：`/admin/articles` → 新建文章 → 编辑 → 删除 → 列表筛选/分页/排序。

**Step 28.3: 评论管理**

人工验证：`/admin/comments` → 删除评论 → 列表筛选。

**Step 28.4: 画廊编辑**

人工验证：`/admin/gallery` → 编辑画廊项 → 保存 → 列表更新。

**Step 28.5: 图床**

人工验证：`/admin/imagebed` → 拖拽上传 → 复制链接 → 预览模态 → 列表筛选。

**Step 28.6: 修改密码**

人工验证：`/admin/password` → 输入旧密码 + 新密码 → 保存 → 重新登录验证。

**Step 28.7: 登出**

人工验证：admin 顶部登出按钮 → 跳转 `/admin/login`。

每一步记录结果于本步骤注释。任何一步失败 → 回滚该 Task 的 commit 并定位修复。

---

### Task 29: 文档与记忆更新

**Files:**

- Modify: `nuxt/README.md`
- Modify: `.memory/memory.md`
- Modify: `.memory/progress/current.md`
- Modify: `openspec/changes/nuxt-ssr-nuxt-ui-v4-migration/tasks.md`（打勾标记完成）

**Step 29.1: 校验 `_archive/` 备份未被暂存**

Run:

```bash
cd nuxt
git status --short
echo "---"
git diff --cached --name-only
```

Expected: 无 `_archive/` 文件出现在暂存区或修改列表。

**Step 29.2: 更新 `nuxt/README.md`**

Run: 用 Edit 工具把 `nuxt/README.md` "技术栈" 段改为：

```markdown
## 技术栈

- Nuxt 4.3 + Vue 3.4
- Tailwind CSS v4.x（via `@tailwindcss/vite`，2026-07-24 升级完成）
- UI 库：Nuxt UI v4（admin-only，2026-07-24 迁移完成）；`@nuxt/ui@^4.9.0` + `valibot@^1.x` + `@vueuse/motion/nuxt@^2.x`
- 范围：本目录仅承载 admin 后台，公开页由 `nuxt-public/` 静态站承载
```

**Step 29.3: 更新 `.memory/memory.md`**

Run: 用 Edit 工具在 `.memory/memory.md` "关键架构决策" 段追加：

```markdown
- **nuxt/ Nuxt UI v4 admin 迁移（2026-07-24 完成）**：见 `openspec/changes/nuxt-ssr-nuxt-ui-v4-migration/`。替换 `naive-ui@2.43` + `@bg-dev/nuxt-naiveui` 为 `@nuxt/ui@^4.9.0`；24 文件 / 约 261 处 NaiveUI 标签全部迁移；admin 表单统一 valibot schema + `<UForm>` + `<UFormField>`；`useMessage()/useDialog()` 替换为 `useToast()`；`n-config-provider` 三层 Provider 收缩为单一 `<UApp>`；主题统一到 `app.config.ts` + `assets/css/main.css` 的 `@theme` 块（保留 Bootstrap blue 视觉一致性）。
```

**Step 29.4: 更新 `.memory/progress/current.md`**

Run: 用 Edit 工具把 "当前阶段" 段改为：

```markdown
## 当前阶段

Phase B（`nuxt/` admin NaiveUI → Nuxt UI v4 迁移）已完成并验证通过。下一阶段：待清理 `nuxt-shrink-to-pure-admin-and-nuxt-ui-v4` change archive 状态；后续独立 cleanup change 处理 `app/components/content/*` 4 个 NaiveUI 组件、全站 CSS variables 收敛、`katex/mermaid/pixi.js` 公开页残留依赖等。
```

**Step 29.5: OpenSpec tasks.md 标记完成**

Run: 用 Edit 工具把 `openspec/changes/nuxt-ssr-nuxt-ui-v4-migration/tasks.md` 每个 `- [ ]` 改为 `- [x]`，并在文件顶部追加：

```markdown
> **状态**：✅ 已完成（2026-07-24）。验证：typecheck / build / css:audit / css:imports:audit 全部 exit 0；7 路由 SSR HTTP 200；24 文件 grep 残留 0 命中；7 项业务流手测全部通过；构建产物对比 Phase A 基线：NaiveUI 卸包后整体下降。
```

**Step 29.6: 暂存并 commit**

Run:

```bash
cd nuxt
git add README.md
cd ..
git add .memory/memory.md .memory/progress/current.md openspec/changes/nuxt-ssr-nuxt-ui-v4-migration/tasks.md
git status --short
git diff --cached --name-only
git commit -m "docs: update README and memory for Nuxt UI v4 admin migration"
```

Expected: `git diff --cached --name-only` 列出四个文档文件。

---

### Task 30: 归档 OpenSpec change

**Files:**

- (执行归档命令)

**Step 30.1: 归档**

Run:

```bash
cd /d/Work_space/MyBlogWeb-CloudflarePage
openspec archive nuxt-ssr-nuxt-ui-v4-migration --yes 2>&1 | tail -10
ls openspec/changes/archive/ | grep nuxt-ssr-nuxt-ui-v4-migration
```

Expected: 归档成功；`openspec/changes/nuxt-ssr-nuxt-ui-v4-migration/` 目录移至 `openspec/changes/archive/`。

**Step 30.2: 清理 `docs/superpowers/specs/` 与 `plans/` 的 Phase B 文档**

Run:

```bash
cd /d/Work_space/MyBlogWeb-CloudflarePage
# superpowers spec 已加指针（本次修订），保留作流程记录
# plans/2026-07-24-nuxt-ssr-nuxt-ui-v4-migration.md 是本次实施计划，保留
ls docs/superpowers/specs/2026-07-24-nuxt-ssr-nuxt-ui-v4-migration-design.md docs/superpowers/plans/2026-07-24-nuxt-ssr-nuxt-ui-v4-migration.md
```

Expected: 两个文件均存在；本次不删除（保留作 superpowers 流程追溯）。

---

### Task 31: 推送分支与创建 PR

**Files:**

- (推送与 PR)

**Step 31.1: 推送分支**

Run:

```bash
cd /d/Work_space/MyBlogWeb-CloudflarePage
git push -u origin feature/nuxt-ssr-nuxt-ui-v4-migration
```

Expected: 推送成功。

**Step 31.2: 创建 PR**

Run:

```bash
cd /d/Work_space/MyBlogWeb-CloudflarePage
gh pr create --base main --head feature/nuxt-ssr-nuxt-ui-v4-migration \
  --title "feat(nuxt): migrate admin to Nuxt UI v4 (NaiveUI replacement)" \
  --body "## Summary

- 替换 \`nuxt/\` admin 部分全部 NaiveUI 组件为 Nuxt UI v4 等价（24 文件 / 约 261 处标签）
- 统一 admin 表单为 \`valibot\` schema + \`<UForm>\` + \`<UFormField>\`
- \`useMessage()/useDialog()\` 替换为 \`useToast()\`
- 全局 Provider 收缩为单一 \`<UApp>\`
- 主题统一到 \`app.config.ts\` + Tailwind v4 \`@theme\`（保留 Bootstrap blue 视觉一致性）
- 卸载 \`naive-ui@2.43\` 与 \`@bg-dev/nuxt-naiveui\`

## Spec

- \`openspec/changes/nuxt-ssr-nuxt-ui-v4-migration/design.md\`
- \`openspec/changes/nuxt-ssr-nuxt-ui-v4-migration/proposal.md\`
- \`docs/superpowers/specs/2026-07-24-nuxt-ssr-nuxt-ui-v4-migration-design.md\`

## 验证

- typecheck / build / css:audit / css:imports:audit 全部 exit 0
- 7 admin 路由 SSR HTTP 200
- 24 文件 grep 残留 0 命中
- 7 项业务流手测全部通过

## 依赖

- 前置：OpenSpec change \`nuxt-ssr-tailwind-v4-upgrade\`（已 archive，2026-07-24, commit \`6a9f3e5\`）
- 承接：OpenSpec change \`nuxt-shrink-to-pure-admin-and-nuxt-ui-v4\` 路径 C（已实施）"
```

Expected: PR 创建成功；返回 PR URL。

---

## Self-Review Checklist

执行完成后逐项核对：

- [ ] Task 1.5 的基线数字（261 处 / 24 文件）已记录，与 Task 26.4 对比为 `0`
- [ ] Task 2.2 三组依赖行在 `package.json` 与 `package-lock.json` 中均存在
- [ ] Task 5.3 typecheck 与 build 均 exit 0
- [ ] Task 6.2 dev server 返回 HTTP 200
- [ ] Task 7.3 / Task 8.2 grep 验证 `OK:` 输出
- [ ] Task 9.4 PoC 决策已记录（完全等价 / 备选方案）
- [ ] Task 10-21 每个文件 grep 验证 `OK:` 输出
- [ ] Task 22.3 useMessage / useDialog 0 命中
- [ ] Task 23.4 `MdEditorWrapper.client.vue` 要么 commit 要么明确 skip
- [ ] Task 24.6 / Task 25.2 卸载验证 `OK:` 输出
- [ ] Task 26.1-26.4 四组 grep 全部 `OK:` 输出
- [ ] Task 27.1-27.4 typecheck / build / css audit / 7 路由全部通过
- [ ] Task 27.5 暗色模式人工验证已执行并记录
- [ ] Task 28.1-28.7 七项业务流全部通过
- [ ] Task 29.1 确认 `_archive/` 未被暂存
- [ ] Task 29.6 `git diff --cached --name-only` 仅含四个文档文件
- [ ] Task 30.1 归档命令成功，change 目录移至 archive
- [ ] Task 31.2 PR 创建成功

## 风险与回滚

- **回滚点 1（Task 7 之后）**：`git reset --hard HEAD~1` + 恢复 `layouts/admin.vue` 即可。Task 8 同理。
- **回滚点 2（Task 9 PoC 之后）**：`git reset --hard HEAD~1` + 恢复 `pages/admin/articles/index.vue`。如 PoC 失败导致 dev server 500，可重新跑 Task 9.5 备选方案。
- **回滚点 3（Task 21 之后）**：`git reset --hard HEAD~1` 撤销 gallery-admin 组件替换；从 `_archive/package.pre-nuxt-ui.bak.json` 恢复依赖（如已 Task 25 卸载）。
- **回滚点 4（Task 25 之后）**：`git reset --hard HEAD~1` + `npm install` 恢复 `naive-ui`；`nuxt.config.ts` 恢复 NaiveUI 配置（从 git 历史 `HEAD~1` 取回）。
- **回滚点 5（Task 28 业务流失败）**：定位到具体 task `git revert HEAD~N`；`_archive/package.pre-nuxt-ui.bak.json` 与 `package-lock.pre-nuxt-ui.bak.json` 提供完整依赖回滚兜底。

## 非本次范围

按 CLAUDE.md §2.2 范围受控原则，以下不在本次实施范围：

- `app/components/content/{CodePlayground,LinkCard,StarRating,Steps}.vue` 4 个 NaiveUI 内容组件迁移
- 全站 CSS variables 收敛到 `@theme` + `.dark` 双轨合一
- `katex / mermaid / pixi.js / @nuxtjs/mdc / nuxt-vitalizer` 公开页残留依赖清理
- `nuxt-shrink-to-pure-admin-and-nuxt-ui-v4` change archive 状态
- `app/components/MarkdownRenderer.vue` 内 2 处 NaiveUI 清理（保留作豁免）
- `app/shared/ui/StateLoading.vue` 内 1 处 NaiveUI 清理（保留作豁免）
