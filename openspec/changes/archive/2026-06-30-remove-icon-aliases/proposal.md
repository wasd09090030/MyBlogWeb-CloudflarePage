## Why

`nuxt-public/app/app.config.ts` 维护了一个 235 行的 `icon.aliases` 映射表，把 ~150 个短名（如 `house`、`images`、`book`、`mdi:github`）翻译成 `collection:icon` 格式。这层翻译对维护者不透明：读模板时看到的图标名和实际渲染的图标往往是两回事。仓库内已经出现两套写法——老组件用短名走 aliases，新组件（`Effects/SearchBar.vue`、`content/GithubCard.vue`、`content/ImageEnhanced.vue`、`content/Steps.vue`）直接写 `mdi:xxx`——并存让维护成本翻倍，且不一致容易引发实际 bug（`film` 没有 alias，目前依赖 Iconify 远程兜底）。

## What Changes

- **删除** `nuxt-public/app/app.config.ts` 的 `icon.aliases` 整块（保留 `size` / `class` 默认值）。
- **改写** `nuxt-public/app/` 下 30 个文件、93 处 `<Icon name="..." />`，统一为 `<Icon name="collection:icon" />` 形式（如 `heroicons:home`、`mdi:github`）。
- 涉及**视觉变化**的 11 处（`content/GithubCard.vue`、`Effects/SearchBar.vue`、`content/Steps.vue`、`content/ImageEnhanced.vue`）会从"被 aliases 压扁的 heroicons 通用图标"切到"真正的 MDI 图标"——这是有意为之，目的是与项目里已经存在的"直写"风格一致。
- 4 个原 aliases 里有"语义重映射"的图标（`github`、`controller`、`robot`、`film`）替换为对应的 MDI 品牌图标，**BREAKING** 视觉变化。
- 可选：**追加** `nuxt.config.ts` 的 `icon.clientBundle.icons` 预加载列表，添加 `mdi:github`、`mdi:robot`、`mdi:gamepad-variant`，避免这些品牌图标在首屏出现时的延迟。

## Capabilities

### New Capabilities

- `icon-system`: 定义 nuxt-public 前端如何使用 `@nuxt/icon` 提供的图标——要求所有图标名必须为 Iconify `collection:icon` 格式，禁止在 `app.config.ts` 维护短名映射。

### Modified Capabilities

无（这是实现方式的清理，不改变任何业务能力或对外契约）。

## Impact

- **代码范围**：仅 `nuxt-public/`（静态站），`nuxt/` SSR 站不受影响。
- **文件**：
  - 修改 1 个：`nuxt-public/app/app.config.ts`（删 235 行）
  - 修改 30 个：`nuxt-public/app/**/*.{vue}` 内的 `<Icon>` 模板
  - 可选修改 1 个：`nuxt-public/nuxt.config.ts`（追加预加载）
- **依赖**：不动。`@nuxt/icon`、`@iconify-json/heroicons`、`@iconify-json/mdi` 保持现有版本。
- **构建**：`nuxt.config.ts` 中 `icon.serverBundle.collections: ['heroicons', 'mdi']` 保持不变。
- **视觉**：
  - 11 处显示从"heroicons 通用图标"变为"真 MDI 图标"（如 `mdi:github` logo 取代 `<>` 括号）——预期变好。
  - 4 处语义图标替换：`github`→`mdi:github`、`controller`→`mdi:gamepad-variant`、`robot`→`mdi:robot`、`film`→`mdi:film`。
- **回归**：`npm run generate` 跑通 + 肉眼回归 about / GithubCard / SearchBar / Steps / ImageEnhanced / WebEmbed 六个改动最大的位置。
- **回滚**：单 commit 即可 revert；aliases 表是纯配置文件，无数据迁移。
