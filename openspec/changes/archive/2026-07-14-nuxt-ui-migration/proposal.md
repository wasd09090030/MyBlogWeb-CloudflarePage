# nuxt-public UI 库迁移：NaiveUI → Nuxt UI v3

> **状态**: ✅ **已迁移完成**（2026-07-13）— `nuxt-public/` 组件库已从 NaiveUI 完整替换为 Nuxt UI v3，`naive-ui` 与 `@bg-dev/nuxt-naiveui` 已从 `package.json` 卸除。
> 主题系统统一到 `@nuxtjs/color-mode`（`<html>.dark`/`.light`）。本 change 仍处于 in-progress 状态，等待合并归档；归档命令：`openspec archive nuxt-ui-migration`。

## Why

`nuxt-public/` 当前以 NaiveUI 作为 Vue 组件库，与 Tailwind CSS v4 + 自定义 `@theme` 设计 token 共存。三者风格割裂：NaiveUI 是企业中性风，难以与 Tailwind 风格的设计系统协同；`n-config-provider :theme-overrides` 的主题机制与项目里已经统一的 CSS 变量体系重复维护；dark mode 切换在 `useTheme` 中已经写出 `.dark` class（Nuxt UI 的官方机制），与 Nuxt UI 几乎可零成本对接。

`tailwind-v4-upgrade` change（已 complete）已为这次迁移解锁 Tailwind v4 基础设施；用户审美偏好偏向 Tailwind 风格；Nuxt UI v3 与项目栈（Nuxt 4.3 / Tailwind v4 / Reka UI 可访问性）契合度最高。

**范围决策（2026-07-10 与用户确认）**：

- **仅迁移 `nuxt-public/`**。`nuxt/`（SSR）保持 NaiveUI，承认技术债分裂并在 PR 中标注。
- **渐进式 5 阶段**：每阶段可独立 build & 手动回归，避免一次性大爆炸。
- **关键决策**：
  - Q1 表单校验用 **valibot**（不是 zod）
  - Q2 `n-rate` 评分组件**自实现**（UButton + lucide star）
  - Q3 不实现新加载条 —— `LoadingBar.vue` 已是孤儿死代码（无引用），直接删除
  - Q4 主题系统**一次到位**重构到 `app.config.ts` + Tailwind v4 `@theme`
  - Q5 `nuxt.config.ts` 所有 naiveui 相关配置**一并清理**

## What Changes

- **BREAKING（依赖）**：`nuxt-public/package.json` 移除 `naive-ui`、`@bg-dev/nuxt-naiveui`；新增 `@nuxt/ui`（v3 最新稳定版）、`valibot`。
- **BREAKING（主题）**：`app/layouts/default.vue` 删除 `<n-config-provider :theme-overrides="themeOverrides">` + `<n-message-provider>`；主题色与圆角 token 迁出到 `app.config.ts` 的 `ui.colors` 与 `app/assets/css/main.css` 的 `@theme` 指令。
- **BREAKING（全局 Provider）**：`app/app.vue` 引入 `<UApp>` 包裹 `<NuxtPage />`，取代 NaiveUI provider 模型。
- **破坏性替换（约 30+ 文件）**：所有 `<n-xxx>` 组件实例替换为 `<Uxxx>`；`useMessage()` 替换为 `useToast()`；`n-form + rules` 替换为 `UForm + valibot schema + UFormField`；`n-pagination` 替换为 `UPagination`（保持组件对外 emit API）。
- **新增 capability**：`ui-library` —— 记录"nuxt-public 使用 Nuxt UI 作为唯一组件库"及配套契约。
- **清理**：`nuxt.config.ts` 删除 `naiveui` 配置块、`build.transpile` 中的 `'naive-ui'`、`vite.optimizeDeps.include` 中的 `'naive-ui'`、`manualChunks` 中 `node_modules/naive-ui` 分支；删除孤儿文件 `app/components/LoadingBar.vue`。

## Capabilities

### New Capabilities

- `ui-library`: nuxt-public 的 UI 组件库契约——使用 Nuxt UI v3 作为唯一来源、`UApp` 全局包裹、`app.config.ts` + `@theme` 主题系统、`.dark` class 暗色模式、`valibot` 表单校验、不存在 NaiveUI 残留。

### Modified Capabilities

（无——`styling-pipeline` 等现有 spec 不受影响；本次变更与 Tailwind v4 升级的 CSS 体系兼容）

## Impact

- **依赖**：
  - 新增：`@nuxt/ui`（^3.x）、`valibot`（^1.x）
  - 移除：`naive-ui`、`@bg-dev/nuxt-naiveui`
  - 保留：`tailwindcss` v4、`@tailwindcss/vite`、`@nuxt/icon` 等
- **文件改动**：
  - 新增：`app/app.config.ts`、`app/assets/css/main.css`（如尚未建立）、`app/shared/ui/StarRating.vue`（自实现评分）
  - 修改：`app/app.vue`、`app/layouts/default.vue`、`app/layouts/blank.vue`、`app/composables/useTheme.ts`、`nuxt.config.ts`、`package.json`
  - 替换：~25 个 `.vue` 文件的 NaiveUI 组件实例
  - 删除：`app/components/LoadingBar.vue`
- **浏览器底线**：与 Tailwind v4 升级保持一致（Safari 16.4+ / Chrome 111+ / Firefox 128+），无新增要求。
- **行为变化**：
  - dark mode 切换：`useTheme` 保留（其 `.dark` 同步机制已对齐 Nuxt UI）；`dark-theme` / `light-theme` / `data-theme` legacy 标记**逐步清理**（本次仅在 default.vue 范围内替换为 `.dark`，后续可独立 change 清理全站）。
  - 表单提交：评论功能由 rules 对象改为 valibot schema，行为等价（必填校验 + 提交反馈）。
  - 分页：`UPagination` 用 `v-model:page` 与 `:total`；组件对外 emit `update:page` 保持不变，父容器路由同步逻辑不动。
- **技术债**：`nuxt/`（SSR）项目仍使用 NaiveUI，本次不处理。建议作为后续独立 change 调研。
- **已知风险**：
  - 颜色 token 重新映射可能导致首轮视觉回退（特别是文章详情 prose 配色）。
  - 主题切换瞬间 NaiveUI 残留 class 与 Nuxt UI 的 `.dark` 选择器叠加，可能产生闪烁（按需包 `<ClientOnly>` 兜底）。
  - `UApp` 包装后 layout 内 `useToast()` 必须能解析到 provider，注意布局嵌套顺序。