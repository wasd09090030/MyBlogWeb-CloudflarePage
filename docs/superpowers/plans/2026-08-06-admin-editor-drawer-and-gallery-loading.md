# admin 编辑区侧边弹窗 + gallery 加载动画 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ① admin 文章编辑区把元数据移入右侧滑出弹窗、标题常驻、编辑/预览占满全宽；② 重设计 gallery 页面级加载动画为「毛玻璃面板 + 渐变光斑 + GALLERY 字母逐个淡入 + 大号百分比」。

**Architecture:** 两个独立单文件改动。admin 侧只改 `ArticleEditor.vue`（模板重排 + 新增 `USlideover`）；public 侧只重写 `GalleryLoadingAnimation.vue`（纯 CSS 动画 + 主题变量）。父组件与 props 签名全部保持兼容，无新增依赖。

**Tech Stack:** Nuxt 4 · Nuxt UI v4（`USlideover`）· Tailwind v4 · Vue 3 `<script setup>` · 主题 CSS 变量（`--glass-bg` / `--backdrop-blur` / `--gradient-*`）

## Global Constraints

- **Git 授权**：项目全局规范要求 commit/push 前必须获得用户明确授权。执行器在每个任务末尾的 Commit 步骤前，先 `git status` / `git diff` 展示改动，向用户确认后再执行 `git add <精确文件>` + `git commit`，禁止 `git add .`。
- **最小改动**：只允许修改本节列出的文件，不得顺手重构无关代码、改父组件或 props 签名。
- **props 兼容**：`GalleryLoadingAnimation.vue` 必须保留 `loadingProgress` 与 `previewImages` 两个 prop 声明（父组件仍在传）。
- **无新增依赖**：不使用新 npm 包；图标用现有 `@nuxt/icon` + lucide/heroicons 集。
- **主题变量**：加载动画颜色一律走 `app/assets/css/theme-variables.css` 的 CSS 变量（明暗自动适配），不硬编码颜色。
- **设计文档**：实现依据 `docs/superpowers/specs/2026-08-06-admin-editor-drawer-and-gallery-loading-design.md`。

---

### Task 1: admin 编辑区侧边弹窗（ArticleEditor.vue）

**Files:**
- Modify: `nuxt-admin/app/components/ArticleEditor.vue`

**Interfaces:**
- Consumes: 现有 `form` reactive、`stats` computed、`suggestedTags`、`toggleTag`、`aiSummary`、`coverPreviewError`、`draftSavedAt`、`fullscreen` 全部保持原样，仅移动位置。
- Produces: 新增 `settingsOpen: Ref<boolean>`（USlideover 开关）。`[id].vue` / `create.vue` 无感知（仍只传 `:article`）。

- [ ] **Step 1: 新增 `settingsOpen` ref**

在 `<script setup>` 中现有 `const imageOpen = ref(false)` 之后加一行：

```js
const settingsOpen = ref(false)
```

- [ ] **Step 2: 标题行常驻顶部**

在 `<template>` 中，header（返回/保存那一行 `</div>`）与 Markdown 工具条 `<div class="flex flex-wrap items-center gap-2 border-y border-default py-2">` 之间插入标题行：

```html
<UFormField label="标题" required><UInput v-model="form.title" class="w-full" /></UFormField>
```

- [ ] **Step 3: 工具条新增「设置」按钮**

Markdown 工具条内，在现有的全屏按钮 `UTooltip :text="fullscreen ? ...">` **之前**插入（全屏时隐藏）：

```html
<UTooltip v-if="!fullscreen" text="文章设置"><UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-settings" aria-label="文章设置" @click="settingsOpen = true" /></UTooltip>
```

- [ ] **Step 4: 移除右侧元数据卡，编辑/预览占满全宽**

把外层 grid 包住编辑区 + 右侧 `UCard` 的整段：

```html
<div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
  <div :class="['grid gap-4', mode === 'split' ? 'lg:grid-cols-2' : 'grid-cols-1']">
    <section v-show="mode !== 'preview'"><MarkdownSourceEditor ref="editor" v-model="form.contentMarkdown" /></section>
    <section v-show="mode !== 'source'"><AdminMarkdownPreview :markdown="form.contentMarkdown" /></section>
  </div>
  <UCard ...>…元数据卡…</UCard>
</div>
```

替换为（去掉外层 grid 与 UCard，只留编辑区 grid，占满全宽）：

```html
<div :class="['grid gap-4', mode === 'split' ? 'lg:grid-cols-2' : 'grid-cols-1']">
  <section v-show="mode !== 'preview'"><MarkdownSourceEditor ref="editor" v-model="form.contentMarkdown" /></section>
  <section v-show="mode !== 'source'"><AdminMarkdownPreview :markdown="form.contentMarkdown" /></section>
</div>
```

- [ ] **Step 5: 新增 USlideover 容纳元数据**

在原 `UCard` 位置（即编辑区 grid 之后、`UModal restoreOpen` 之前）插入右侧滑出弹窗，内容为原卡片除「标题」外的全部字段（Slug / 分类 / 封面图+预览 / 标签+建议标签 / AI 摘要+生成按钮 / 分隔线 / 统计+草稿状态）：

```html
<USlideover v-model:open="settingsOpen" title="文章设置" side="right">
  <div class="space-y-4">
    <UFormField label="Slug"><UInput v-model="form.slug" class="w-full" /></UFormField>
    <UFormField label="分类"><USelect v-model="form.category" :items="['study', 'game', 'work', 'resource', 'other']" class="w-full" /></UFormField>
    <UFormField label="封面图"><UInput v-model="form.coverImage" class="w-full" placeholder="https://..." /></UFormField>
    <div class="overflow-hidden rounded-md border border-default bg-elevated">
      <img v-if="form.coverImage && !coverPreviewError" :src="form.coverImage" alt="文章封面预览" class="aspect-video w-full object-cover" @error="coverPreviewError = true" />
      <div v-else class="grid aspect-video place-items-center p-4 text-center text-sm text-muted">
        <div>
          <UIcon :name="coverPreviewError ? 'i-lucide-image-off' : 'i-lucide-image'" class="mx-auto mb-2 size-6" />
          <p>{{ coverPreviewError ? '封面地址无法加载' : '输入封面地址后在此预览' }}</p>
        </div>
      </div>
    </div>
    <UFormField label="标签" help="输入后按 Enter、Tab 或离开输入框即可添加；可直接粘贴逗号分隔的多个标签。">
      <UInputTags v-model="form.tags" class="w-full" placeholder="输入标签" add-on-tab add-on-blur add-on-paste separator="," />
    </UFormField>
    <div class="flex flex-wrap gap-1">
      <UButton v-for="tag in suggestedTags" :key="tag" size="xs" :color="form.tags.includes(tag) ? 'primary' : 'neutral'" :variant="form.tags.includes(tag) ? 'soft' : 'ghost'" @click="toggleTag(tag)">{{ tag }}</UButton>
    </div>
    <UFormField label="AI 摘要"><UTextarea v-model="form.aiSummary" :rows="4" class="w-full" /></UFormField>
    <UButton block variant="soft" :loading="aiPending" icon="i-lucide-sparkles" @click="aiSummary">生成 AI 摘要</UButton>
    <USeparator />
    <p class="text-sm text-muted">{{ stats.characters }} 字符 · {{ stats.words }} 词 · {{ stats.headings }} 标题</p>
    <p v-if="draftSavedAt" class="text-xs text-muted">草稿已保存</p>
  </div>
</USlideover>
```

注意：原 UCard 里的 `UFormField label="标题"` 字段**不要**移入弹窗（它已常驻顶部）；保存/返回按钮仍在 header，不动。

- [ ] **Step 6: 类型检查**

Run（在 `nuxt-admin/` 目录）: `npm run typecheck`
Expected: 无类型错误。

- [ ] **Step 7: 浏览器手动验证**

Run（在 `nuxt-admin/` 目录）: `npm run dev`，浏览器打开 `http://localhost:3000/admin/articles`（或登录后新建/编辑文章页）逐项核对：
1. 顶部标题输入框常驻可见，可正常编辑。
2. Markdown 工具条有齿轮「文章设置」按钮，点击右侧滑出弹窗；Slug/分类/封面预览/标签/AI摘要/统计/草稿状态均在弹窗内且可编辑。
3. 弹窗改动即时生效（`watch(form)` 草稿自动保存仍在工作）。
4. 全屏模式下齿轮按钮消失，只保留源码/预览/退出全屏；退出全屏后恢复。
5. 源码/分屏/预览三种模式仍正常渲染。

- [ ] **Step 8: Commit（需用户授权）**

```bash
git status
git diff nuxt-admin/app/components/ArticleEditor.vue
git add nuxt-admin/app/components/ArticleEditor.vue
git commit -m "feat(admin): 文章编辑区元数据移入侧边弹窗，标题常驻，编辑/预览占满全宽"
```

---

### Task 2: gallery 页面级加载动画重设计

**Files:**
- Rewrite: `nuxt-public/app/components/GalleryLoadingAnimation.vue`

**Interfaces:**
- Consumes: 父组件 `GalleryContent.vue` 传入的 `loadingProgress: Number`、`previewImages: Array`（保持声明，本次不使用 previewImages）。
- Produces: 无对外新接口；props 签名不变，父组件与容器零改动。

- [ ] **Step 1: 重写组件文件**

将 `nuxt-public/app/components/GalleryLoadingAnimation.vue` 整体替换为以下内容：

```vue
<template>
  <div class="initial-loading-overlay">
    <div class="loading-orbs" aria-hidden="true">
      <span class="orb orb-1" />
      <span class="orb orb-2" />
      <span class="orb orb-3" />
    </div>

    <div class="glass-panel">
      <div class="brand-letters" aria-hidden="true">
        <span v-for="(ch, i) in brandLetters" :key="i" :style="{ '--i': i }">{{ ch }}</span>
      </div>
      <p class="brand-sub">WyrmKk</p>
      <p class="progress-percent">{{ Math.round(loadingProgress) }}%</p>
    </div>
  </div>
</template>

<script setup>
// 页面级加载动画：毛玻璃面板 + 渐变光斑 + GALLERY 字母逐个淡入 + 大号百分比
// 颜色一律走 theme-variables.css 的 CSS 变量，明暗主题自动适配。

defineProps({
  loadingProgress: {
    type: Number,
    default: 0
  },
  previewImages: {
    type: Array,
    default: () => []
  }
})

const brandLetters = 'GALLERY'.split('')
</script>

<style scoped>
.initial-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  z-index: 10000;
  /* 轻量主题半透明底色：压暗后面内容但保留光斑鲜艳度 */
  background: rgba(255, 255, 255, 0.55);
}

:global(.dark) .initial-loading-overlay {
  background: rgba(15, 23, 42, 0.55);
}

/* ---- 渐变光斑背景 ---- */
.loading-orbs {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.orb {
  position: absolute;
  border-radius: 9999px;
  filter: blur(60px);
  opacity: 0.55;
  animation: orb-drift 18s ease-in-out infinite alternate;
}

.orb-1 {
  width: 45vmax;
  height: 45vmax;
  top: -12vmax;
  left: -10vmax;
  background: var(--gradient-primary, linear-gradient(135deg, #667eea, #764ba2));
}

.orb-2 {
  width: 40vmax;
  height: 40vmax;
  bottom: -10vmax;
  right: -8vmax;
  background: var(--gradient-secondary, linear-gradient(135deg, #f093fb, #f5576c));
  animation-delay: -6s;
}

.orb-3 {
  width: 34vmax;
  height: 34vmax;
  top: 32%;
  left: 55%;
  background: var(--gradient-cool, linear-gradient(135deg, #30cfd0, #330867));
  animation-delay: -12s;
  opacity: 0.4;
}

@keyframes orb-drift {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to { transform: translate3d(6vmax, 4vmax, 0) scale(1.12); }
}

/* ---- 毛玻璃面板 ---- */
.glass-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  min-width: 300px;
  padding: 2.25rem 3rem;
  border-radius: var(--radius-xl, 1.25rem);
  background: var(--glass-bg, rgba(255, 255, 255, 0.8));
  -webkit-backdrop-filter: var(--backdrop-blur, blur(10px));
  backdrop-filter: var(--backdrop-blur, blur(10px));
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.2));
}

/* ---- GALLERY 字母逐个淡入上移 ---- */
.brand-letters {
  display: flex;
  gap: 0.5rem;
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-primary, #212529);
}

.brand-letters span {
  display: inline-block;
  opacity: 0;
  animation: letter-in 0.5s ease forwards;
  animation-delay: calc(var(--i) * 90ms);
}

@keyframes letter-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.brand-sub {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary, #6c757d);
  letter-spacing: 0.2em;
}

/* ---- 大号百分比 ---- */
.progress-percent {
  margin: 0.25rem 0 0;
  font-size: clamp(2rem, 5vw, 2.8rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary, #212529);
}

/* 减少动态效果偏好：关闭光斑漂移与字母动画 */
@media (prefers-reduced-motion: reduce) {
  .orb { animation: none; }
  .brand-letters span { animation: none; opacity: 1; }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .glass-panel {
    min-width: 0;
    padding: 1.75rem 1.5rem;
  }
  .brand-letters { gap: 0.35rem; }
}
</style>
```

- [ ] **Step 2: SSG 构建验证**

Run（在 `nuxt-public/` 目录）: `npm run generate`
Expected: 构建成功、无模板/样式编译错误，`.output/public` 生成。

- [ ] **Step 3: 浏览器手动验证动画**

Run（在 `nuxt-public/` 目录）: `npm run preview`（静态预览生成产物，保证画廊有数据、加载动画会触发），浏览器打开 `/gallery` 逐项核对：
1. 首屏出现全屏加载动画：背景渐变光斑缓慢漂移（明暗主题颜色正确）。
2. 中央毛玻璃面板可见（半透明 + 背景模糊 + 内描边）。
3. `GALLERY` 七字母从左到右逐个淡入上移；下方小字 `WyrmKk`。
4. 大号百分比随预加载进度增长，无进度条、无「图片未压缩…」提示语。
5. 预加载完成后整体淡出（`loading-fade` 过渡），正常进入画廊。
6. 切换明暗主题（如站点有主题切换按钮）颜色正确；系统开启「减少动态效果」时动画静止、字母直接显示。

- [ ] **Step 4: Commit（需用户授权）**

```bash
git status
git diff nuxt-public/app/components/GalleryLoadingAnimation.vue
git add nuxt-public/app/components/GalleryLoadingAnimation.vue
git commit -m "feat(public): 重设计画廊页面级加载动画为毛玻璃+字母淡入+百分比"
```

---

## 完成后的整体验证

1. `nuxt-admin`：`npm run typecheck` 通过；`npm run dev` 手动核对 Task 1 五条验收点。
2. `nuxt-public`：`npm run generate` 通过；`npm run preview` 手动核对 Task 2 六条验收点。
3. 确认只改动两个目标文件；`git status` 无 `.memory`、构建产物、临时文件被误加。
