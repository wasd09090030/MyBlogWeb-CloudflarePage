# nuxt/ 后台 SSR 站 UI 库迁移：NaiveUI → Nuxt UI v4（admin-only）

> **依赖**：本 change 必须在 OpenSpec change `nuxt-ssr-tailwind-v4-upgrade` 合并后才能启动。
> **范围**：admin-only。`nuxt/` 仅承载 admin 后台，公开页由 `nuxt-public/` SSG 静态站承载。
> 参考：nuxt-public 同类 change `archive/2026-07-14-nuxt-ui-migration` + `archive/2026-07-15-upgrade-nuxt-ui-v4-public`。

## Context

`nuxt/`（NUXTSSR 后台站）当前以 NaiveUI 2.43.2 + `@bg-dev/nuxt-naiveui` 作为 Vue 组件库。Tailwind v4 升级由前置 change `nuxt-ssr-tailwind-v4-upgrade` 完成。本 change 在 v4 基础设施之上完成 NaiveUI → Nuxt UI v4 的迁移，仅作用于 admin 部分。

`nuxt/` 与 `nuxt-public/` 的关系已重新划分（2026-07-17 与用户确认）：

- `nuxt-public/`：SSG 静态站，承载全部公开页（首页、画廊、文章、教程），已完整部署到 Cloudflare Pages。
- `nuxt/`：SSR 后台，仅承载 admin 后台（login、articles、comments、gallery、imagebed、password）。`beatmaps` 谱面管理已由 `remove-mania-and-tools-pages` change 移除（manic 公开页下线后失去 `/mania/{id}` 跳转目标）。

`nuxt/` admin 部分使用 NaiveUI 的关键模式：

| 模式 | NaiveUI 现状 | Nuxt UI v4 替代 |
|------|------------|----------------|
| 表单校验 | `<n-form :model :rules>` + `useMessage()` | `<UForm :state :schema>` + `valibot` + `<UFormField>` |
| 模态/抽屉 | `<n-modal>` / `<n-drawer v-model:show>` | `<UModal>` / `<UDrawer>` `v-model:open` |
| 上传 | `<n-upload>` | `<UFileUpload>` |
| 表格 | `<n-data-table>` | `<UTable>` |
| 消息提示 | `useMessage().success/error` | `useToast().add({ title, color })` |

admin 范围（约 20 个文件）：

- `app/pages/admin/*` 6 个页面（`index`、`login`、`password`、`articles`、`comments`、`imagebed`；`gallery` 管理由 `features/gallery-admin/AdminGalleryPageContainer` 承载）
- `app/features/article-admin/containers/AdminArticleEditorContainer.vue`（含 `MdEditorWrapper.client.vue` 调用）
- `app/features/gallery-admin/` 下 9 个文件（`composables/useAdminImagebedPage.ts`、`containers/AdminGalleryPageContainer.vue`、`components/imagebed/{ImagebedFileArea,ImagebedPreviewModal,ImagebedToolbar,ImagebedUploadArea}.vue`、`components/gallery/{GalleryCardGrid,GalleryEditModal,GalleryFilterBar}.vue`）
- `app/layouts/admin.vue`、`app/layouts/blank.vue`

## Goals / Non-Goals

**Goals:**

- 替换 `nuxt/` admin 部分的所有 NaiveUI 组件实例为 Nuxt UI v4 等价。
- 复用 nuxt-public 已验证的 Nuxt UI v4 接入经验（`UApp`、`app.config.ts`、valibot、`.dark` class）。
- admin 表单校验统一为 `valibot` schema。
- 主题机制统一到 `app.config.ts` + `@theme` + `.dark` class。
- admin 后台的 Pinia store action 内 `useToast()` 调用规范化。
- 验证 admin SSR 下所有路由正常工作。

**Non-Goals:**

- 不修改 `nuxt-public/`（已独立迁移完成）。
- 不修改 `nuxt/` 公开页文件、组件、features、依赖、modules、`nuxt.config.ts` 中公开页相关字段（划给后续独立 cleanup change）。
- 不替换 `md-editor-v3` 为其他编辑器（admin 文章编辑器保留；Nuxt UI 无等价）。
- 不修改 `server/` Nitro API 路由。
- 不收敛全站 `:global(.dark)` 与 `.dark` 双轨、不收敛全站 CSS variables 到 `@theme`。
- 不修改 `tsconfig.*.strict.phaseN.json` 渐进 TS strict 计划。
- 不修改 `tailwind-v4-upgrade` change 已落地的 `tailwind.css`（本 change 仅使用，不修改）。

## Decisions

### 1. 4 子阶段 admin-only 渐进

较原 7 子阶段（B.1-B.7）缩减为 4 子阶段（B.1-B.4）：

- **B.1**：基础设施（依赖、模块、UApp、app.config.ts、main.css）
- **B.2**：admin layout（admin.vue + blank.vue）
- **B.3**：admin 业务（7 个 admin 页面 + features/article-admin/ + features/gallery-admin/）
- **B.4**：清理归档

删除原 B.2 default.vue layout、原 B.3 公开页组件、原 B.6 多数特殊组件豁免。

理由：admin 范围明确、无公开页干扰，4 子阶段足以覆盖。

### 2. `app.config.ts` + `main.css` 主题设计

新增 `nuxt/app/app.config.ts`：

```ts
export default defineAppConfig({
  ui: {
    colors: {
      // 沿用现有 admin primary 色（Bootstrap blue）
      primary: 'blue',
      // 与 nuxt-public 一致，保持中性色为 slate
      neutral: 'slate',
    },
    icons: {
      dynamicRounded: 'rounded-full'
    },
    button: {
      defaultVariants: {
        size: 'md',
      }
    }
  }
})
```

`primary: 'blue'` 与现有 NaiveUI `themeOverrides.common.primaryColor: '#0d6efd'`（Bootstrap blue）色调一致，避免迁移后第一眼视觉跳变。

新增 `nuxt/app/assets/css/main.css`（位于 `tailwind.css` 之后，与 nuxt-public 命名一致）：

```css
@theme {
  /* 把现有 primary 映射为 Tailwind v4 颜色 token */
  --color-primary-50:  #e6f1fe;
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

### 3. `ui.prose: false`（admin 不用 prose）

```ts
ui: {
  prose: false
}
```

理由：admin 不渲染 Markdown，prose 路径完全跳过。

### 4. 表单校验统一为 valibot

```ts
import * as v from 'valibot'

const schema = v.object({
  title: v.pipe(v.string(), v.minLength(1, '标题必填'))
})

// 模板
<UForm :state="form" :schema="schema" @submit="onSubmit">
  <UFormField label="标题" name="title">
    <UInput v-model="form.title" />
  </UFormField>
</UForm>
```

### 5. Pinia store 内 `useToast()` 调用规范

```ts
export const useArticleStore = defineStore('article', () => {
  const toast = useToast()  // 在 setup 内合法
  const create = async (data) => {
    try {
      await $fetch('/api/articles', { method: 'POST', body: data })
      toast.add({ title: '创建成功', color: 'success' })
    } catch (e) {
      toast.add({ title: '创建失败', description: e.message, color: 'error' })
    }
  }
})
```

### 6. md-editor-v3 豁免

`MdEditorWrapper.client.vue`（admin 文章编辑器）保留 `md-editor-v3` 依赖。理由：Nuxt UI 无等价富文本编辑器；自实现成本不合理。该组件是 `.client.vue` 后缀，永远不会在 SSR 阶段加载，不污染 SSR bundle。

B.3 替换 `AdminArticleEditorContainer.vue` 时：

- 保留 `MdEditorWrapper.client.vue` 调用不变；
- `MdEditorWrapper.client.vue` 内部的 `<n-*>` 引用（如有）替换为 `<UButton>` 或保留 md-editor-v3 自带 toolbar；
- `AdminArticleEditorContainer.vue` 的 form 改 valibot。

### 7. `<n-data-table>` → `<UTable>` PoC 验证

`<UTable>` 在 Nuxt UI v4 早期版本对分页+筛选+排序的组合可能与 `<n-data-table>` 不完全等价。Phase B.3 启动前在分支上做 PoC：

- 验证 admin/articles、admin/comments、admin/gallery 三个列表页的 `<n-data-table>` 现有功能；
- 若 `<UTable>` 完整覆盖，直接迁移；
- 若不完整，先用 `<UTable>` + 手动分页/筛选，等 Nuxt UI v4.x 后续 patch 完善后再迁。

### 8. 暗色模式统一到 `.dark` class

admin `useTheme` 在 B.2 调整：移除 `.dark-theme`/`.light-theme`/`:global(.dark)` 三套并存机制，统一为 `html.dark`（Nuxt UI 默认）。**仅在 admin layout 范围内迁移**，全站 `:global(.dark)` 收敛留后续 change。

### 9. `nuxt.config.ts` 最终清理（B.4）

```ts
// 删除
naiveui: { colorModePreference, iconSize, themeConfig },
build.transpile: ['@vueuse/core'],  // 不再含 'naive-ui'
vite.optimizeDeps.include: [...],  // 移除 'naive-ui'
vite.build.rollupOptions.output.manualChunks: {
  // 删除 node_modules/naive-ui 分支
  // 新增：UI 库及其核心依赖必须在同一 chunk 以避免循环依赖
  if (id.includes('node_modules/@nuxt/ui') || id.includes('node_modules/reka-ui') || id.includes('node_modules/@internationalized') || id.includes('node_modules/@vueuse')) return 'vendor-ui';
}
```

## Risks / Trade-offs

- [Risk] `<UTable>` 与 `<n-data-table>` 在分页+筛选+排序组合下行为不一致 → Mitigation: B.3 启动前分支 PoC；不达标则 `<UTable>` + 手动分页/筛选。
- [Risk] admin 表单/弹窗/抽屉/上传在 SSR + Pinia 上下文下的稳定性 → Mitigation: B.2 单独验证 admin layout；B.3 每个 admin 页面独立验证。
- [Risk] `valibot` schema 与现有 TS 类型重复 → Mitigation: 先在 store 重写 TS 类型，再写 schema，最后改组件；类型作为单一事实源。
- [Risk] `<n-button quaternary>` 与 `<UButton variant="ghost">` 视觉差异 → Mitigation: 通过 `:ui` prop 微调；B.2 视觉回归清单覆盖。
- [Risk] Pinia store action 内 `useToast()` 在 SSR 阶段不可用 → Mitigation: 严格在 `setup()` 顶层调用；类型提示约束。
- [Risk] `MdEditorWrapper.client.vue` 内部 `<n-button>` 未被发现 → Mitigation: B.3 替换 `AdminArticleEditorContainer.vue` 时同步 grep `MdEditorWrapper.client.vue`。
- [Risk] admin 暗色切换闪烁 → Mitigation: 按需包 `<ClientOnly>` 兜底。
- [Risk] admin 现有 CSS variables 与 `@theme` 双轨维护 → Mitigation: 设计决定，不回滚。

## Migration Plan

### Phase B.1 — 基础设施接入

1. 创建 `feature/nuxt-ssr-nuxt-ui-v4-migration` 分支（基于已合并的 `nuxt-ssr-tailwind-v4-upgrade`）。
2. `nuxt/package.json` 新增 `@nuxt/ui@^4.9.0`、`valibot@^1.x`、`@vueuse/motion/nuxt@^2.x`。
3. 创建 `nuxt/app/app.config.ts`，写入 `ui.colors` 基础映射（primary=blue、neutral=slate）。
4. 创建 `nuxt/app/assets/css/main.css`，写入 `@theme` 块（primary 色阶 + 圆角 token）。
5. `nuxt/nuxt.config.ts`：`css: []` 加入 `~/assets/css/main.css`（在 `tailwind.css` 之后）；`modules` 加入 `'@nuxt/ui'`、`'@vueuse/motion/nuxt'`。
6. `nuxt/app/app.vue` 引入 `<UApp>` 包裹 `<NuxtLayout>`。
7. 验证：`pnpm build` 通过；dev server curl `/admin/login` 返回 200 且 HTML 含 `<UApp>` 渲染产物。

### Phase B.2 — admin layout 替换

1. `admin.vue`：删除 `<n-config-provider>`/`<n-message-provider>`/`<n-dialog-provider>` 包裹；`<n-button>` → `<UButton>`；顶部导航、登出按钮、移动端菜单替换；scoped CSS 内 NaiveUI 替换处涉及的 `.dark-theme`/`:global(.dark-theme)` → `.dark`/`:global(.dark)`。
2. `blank.vue`：删除 `<n-message-provider>` 与 `import { NMessageProvider }`。
3. 验证：admin 入口、admin/index、admin/login 页面正常；登出按钮可用。

### Phase B.3 — admin 业务替换

1. B.3 启动前**先做分支 PoC**：验证 `<UTable>` 与 `<n-data-table>` 在 admin/articles、admin/comments、admin/gallery 三个列表的功能对等性。
2. 替换 6 个 admin 页面（gallery 管理由 `features/gallery-admin/AdminGalleryPageContainer` 承载）：
   - `admin/login.vue`（form + valibot）
   - `admin/password.vue`（form + valibot）
   - `admin/index.vue`（dashboard）
   - `admin/articles/index.vue`（n-data-table → UTable + form + valibot + 删除模态）
   - `admin/comments/index.vue`（n-data-table → UTable）
   - `admin/gallery/index.vue`（n-data-table → UTable + 编辑模态）
   - `admin/imagebed/index.vue`（n-upload → UFileUpload + 预览模态 + 拖拽）
3. 替换 `features/article-admin/containers/AdminArticleEditorContainer.vue`：
   - md-editor-v3 保留
   - form 改 valibot
   - 清理 `<n-*>` 引用
4. 替换 `features/gallery-admin/` 下所有组件（约 9 个）：
   - `ImagebedFileArea.vue`、`ImagebedPreviewModal.vue`、`ImagebedToolbar.vue`、`ImagebedUploadArea.vue`
   - `GalleryCardGrid.vue`、`GalleryEditModal.vue`、`GalleryFilterBar.vue`
   - `containers/AdminGalleryPageContainer.vue`
   - `composables/useAdminImagebedPage.ts`
5. grep `MdEditorWrapper.client.vue` 内部 `<n-*>` 引用并清理。
6. Pinia store 内 `useToast()` 调用规范化（`useAuthStore`、`useArticleStore` 等）。
7. 验证：登录、文章 CRUD、评论管理、谱面管理、画廊编辑、图床上传、修改密码全流程跑通。

### Phase B.4 — 清理归档

1. `nuxt.config.ts`：删除 `naiveui` 配置块、`build.transpile` 中 `'naive-ui'`、`vite.optimizeDeps.include` 中 `'naive-ui'`、`manualChunks` 中 `node_modules/naive-ui` 分支。
2. `nuxt/package.json`：移除 `naive-ui` 与 `@bg-dev/nuxt-naiveui`；`pnpm uninstall` 同步 lockfile。
3. grep `nuxt/app/pages/admin/`、`nuxt/app/features/article-admin/`、`nuxt/app/features/gallery-admin/`、`nuxt/app/layouts/admin.vue`、`nuxt/app/layouts/blank.vue` 确认无运行时残留：
   - `grep -rn "from 'naive-ui'" ...` 0 命中
   - `grep -rEn "<n-(button|modal|drawer|form|input|select|message|config-provider|dialog-provider|menu|table|upload|alert|tag|spin|rate|pagination)" ...` 0 命中（除 `MdEditorWrapper.client.vue` 内允许的）
4. 全站 build 验证；构建产物体积对比。
5. 更新 `nuxt/README.md`（技术栈段：NaiveUI → Nuxt UI v4；明确 admin-only 范围）；`AGENTS.md`（项目概览段同步标注）。
6. 更新项目记忆（`MEMORY.md` + `ui-roadmap-naiveui-to-nuxtui.md` + `nuxt-ssr-ui-migration-roadmap.md`）。
7. 归档：`openspec archive nuxt-ssr-nuxt-ui-v4-migration`。

Rollback 策略：每个子阶段独立 commit；Phase 之间通过 git tag 打标签；任一 Phase 失败可 `git revert` 到上一稳定状态；`package.json` 与 `package-lock.json` 在 B.1 起始前备份。

## Open Questions

- `<UTable>` 与 `<n-data-table>` 在 admin 列表的功能对等性需要 PoC 验证。
- `MdEditorWrapper.client.vue` 内部是否有 `<n-*>` 引用？B.3 启动前 grep。