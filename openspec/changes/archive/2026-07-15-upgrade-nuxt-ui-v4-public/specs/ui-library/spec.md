## ADDED Requirements

### Requirement: Nuxt UI v4 public-site runtime baseline

`nuxt-public/` SHALL declare `@nuxt/ui` from the v4 major line and a direct `@nuxt/fonts` dependency compatible with that line. The public-site development and deployment runtime SHALL use Node.js 20.19 or newer.

#### Scenario: Dependency declaration
- **WHEN** `nuxt-public/package.json` is inspected
- **THEN** `@nuxt/ui` declares a v4 range and `@nuxt/fonts` declares `^0.14.0` or a compatible newer range

#### Scenario: Static-site build runtime
- **WHEN** the public static site is generated in CI or deployment
- **THEN** the Node.js runtime version is at least 20.19 and dependency installation does not report an unsupported Nuxt UI engine

### Requirement: Existing public content pipeline remains in scope isolation

The Nuxt UI v4 upgrade SHALL NOT replace the public site's `@nuxtjs/mdc` renderer, article AST and TOC precomputation, KaTeX and Mermaid processing, custom MDC components, or prose stylesheet strategy.

#### Scenario: Article renderer preservation
- **WHEN** an article with standard Markdown and custom MDC content is rendered after the upgrade
- **THEN** it continues to use the existing MDC renderer and custom content components without requiring a content migration

## MODIFIED Requirements

### Requirement: UI 组件库统一来源

`nuxt-public/` SHALL 使用 `@nuxt/ui`（v4 稳定版）作为唯一组件库来源。`package.json` SHALL NOT 声明 `naive-ui` 或 `@bg-dev/nuxt-naiveui` 作为依赖；`nuxt.config.ts` 的 `modules` 数组 SHALL NOT 包含 `'@bg-dev/nuxt-naiveui'`；`app/` 下 SHALL NOT 出现 `<n-xxx>` 组件实例、`useMessage()` / `useDialog()` / `useNotification()` / `useLoadingBar()` 调用。

#### Scenario: 依赖检查

- **WHEN** 检查 `nuxt-public/package.json`
- **THEN** 依赖列表中**不包含** `naive-ui` 与 `@bg-dev/nuxt-naiveui`，且**包含** `@nuxt/ui` v4

#### Scenario: 源码残留检查

- **WHEN** 在 `nuxt-public/app/` 全局 grep `n-[a-z]` 或 `naive-ui` 或 `useMessage`
- **THEN** 无业务代码命中（仅允许注释或文档字符串提及历史）
