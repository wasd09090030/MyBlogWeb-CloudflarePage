# Comment Section Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `nuxt-public/app/components/CommentSection.vue` into a GitHub Discussions / shadcn `comments-01`-style visual and interaction pattern, with Gravatar-first avatar (md5 precise match), skeleton loading, `<StateEmpty>` empty state, hover-revealed per-comment actions, and Author badge in accent semi-transparent style — all under the existing CSS variable theme with light/dark parity.

**Architecture:** Single-component rewrite + two tiny pure utility modules (`md5.ts`, `avatar.ts`) + one new dep (`js-md5`). Zero backend, type, or `Content.vue` changes. TDD-style verification on utilities is replaced by Node one-liner checks (project has no test framework installed and we will not add one). Vue component change is verified by manual visual + functional checklist.

**Tech Stack:** Nuxt 4.3, Vue 3.4, Nuxt UI v3.3, Tailwind v4, valibot, `@nuxt/icon`, `js-md5` (new, ^3.0.0).

## Global Constraints

- **Scope discipline:** No nested replies, no Markdown, no reactions, no edit/delete, no @-mentions, no realtime. (Spec `proposal.md` "What Changes" / `design.md` "Non-Goals".)
- **API stability:** `useComments` composable function signatures unchanged. `AdminComment` type unchanged. `Content.vue` integration unchanged. (Spec `proposal.md` "不修改" / `design.md` "Non-Goals".)
- **Theme:** No new CSS custom properties; all colors via existing `var(--xxx)` from `assets/css/theme-variables.css`. (Spec `spec.md` "Requirement: 明暗主题零新增 CSS 变量".)
- **Avatar strategy:** Gravatar (md5 of `email.toLowerCase().trim()`) → DiceBear on `@error` → `<UAvatar>` alt-letter fallback. **`src` initial = Gravatar URL, not DiceBear.** (Spec `spec.md` "Requirement: 头像策略 Gravatar 优先精确匹配" / "onError 兜底" / `design.md` decision 8.)
- **Behavior preservation:** `watch(articleId)` re-fetch + `onMounted` initial fetch + valibot schema (author required, content 1-1000) + per-comment `likeComment` flow + `useToast` success/error toasts + `UAlert` success banner — all preserved as-is.
- **No test framework introduction:** Project has no vitest/jest installed; do not add one for this change. Verify utils with Node one-liners; verify Vue component with the manual checklist in Task 5.
- **No high-risk operations without authorization:** No git commit, push, or branch operation without explicit user OK (CLAUDE.md §3.2).
- **Conventional commits in English** for any commits, prefixed with `feat:` / `chore:` / `style:` / `refactor:` (project convention observed in recent `git log`).

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `nuxt-public/package.json` | Modify | Declare `js-md5` in `dependencies` |
| `nuxt-public/app/utils/md5.ts` | Create | One-line wrapper exposing `md5(input: string): string` |
| `nuxt-public/app/utils/avatar.ts` | Create | Pure function `getAvatarUrl(email?, name): string` + `getDiceBearUrl(name): string` |
| `nuxt-public/app/components/CommentSection.vue` | Rewrite | Full template + script + scoped style replacement |

No other files touched. No tests directory created. No composable signature change. No type file change. No backend change. No CSS variable file change.

---

## Task 1: Add `js-md5` dependency

**Files:**
- Modify: `nuxt-public/package.json:31` (add inside `dependencies` block, alphabetical: between `keen-slider` and `katex`-no, between `katex` and `keen-slider`; place at end before `mermaid` is wrong, place alphabetically — see Step 1)

**Interfaces:**
- Consumes: existing `nuxt-public/package.json`
- Produces: `package.json` with `js-md5` entry; lockfile updated by `pnpm install`

- [ ] **Step 1: Edit `nuxt-public/package.json` to add `js-md5`**

Open the file and locate the `dependencies` block. The current order (from the read on 2026-07-14) is:
```
"@fontsource/playfair-display",
"@nuxt/fonts",
"@nuxt/icon",
"@nuxt/ui",
"@nuxtjs/mdc",
"@nuxtjs/seo",
"@tailwindcss/typography",
"@vueuse/core",
"@vueuse/motion",
"katex",
"keen-slider",
"mermaid",
"nuxt",
...
```

Add `"js-md5": "^3.0.0"` immediately AFTER `"keen-slider"` (alphabetical: `js-md5` < `katex` < `keen-slider`; correct alphabetical insertion is between `@vueuse/motion` and `katex` — i.e., BEFORE `"katex"`).

Final relevant segment should read:
```json
"@vueuse/core": "^14.1.0",
"@vueuse/motion": "^2.2.0",
"js-md5": "^3.0.0",
"katex": "^0.16.25",
"keen-slider": "^6.8.6",
```

- [ ] **Step 2: Install the new dep**

Run from repo root: `pnpm install` (project uses pnpm; lockfile is `pnpm-lock.yaml`).

Expected: pnpm reports adding `js-md5` and updates `pnpm-lock.yaml`. No other packages should change versions. If other packages report a version bump, abort and re-check the edit.

- [ ] **Step 3: Verify install**

Run: `ls nuxt-public/node_modules/js-md5/package.json`
Expected: file exists and prints something like `{"name": "js-md5", "version": "3.x.x", ...}`.

- [ ] **Step 4: Commit (only after explicit user OK per Global Constraint)**

Per CLAUDE.md §3.2 high-risk operations include `git commit`. Do NOT commit without explicit user authorization. Show the diff (`git diff nuxt-public/package.json pnpm-lock.yaml`) and ASK before committing.

---

## Task 2: Add `md5` utility module

**Files:**
- Create: `nuxt-public/app/utils/md5.ts`

**Interfaces:**
- Consumes: `js-md5` (just installed)
- Produces: `export function md5(input: string): string` — returns lowercase hex md5 of UTF-8 input

- [ ] **Step 1: Create the file**

Create `nuxt-public/app/utils/md5.ts` with the following content:

```ts
import md5Lib from 'js-md5'

/**
 * Compute lowercase hex MD5 of a UTF-8 string.
 * Used to match Gravatar URLs: gravatar.com only recognizes exact md5 hashes.
 *
 * Throws if `js-md5` is somehow unavailable at runtime (should never happen —
 * the dep is declared in package.json and installed). Callers should NOT
 * try/catch this; let the error surface so the bug is visible.
 */
export function md5(input: string): string {
  return md5Lib(input)
}
```

- [ ] **Step 2: Verify the function via Node one-liner**

Run from `nuxt-public/`:

```bash
node --input-type=module -e "import('./app/utils/md5.ts').catch(()=>null); const m = (await import('js-md5')).default; console.log(m('user@example.com'))"
```

Expected: a 32-char lowercase hex string. The well-known value of `md5("user@example.com")` is `b58996c504c5638798eb6b511e6f49af` — verify it matches.

If TypeScript import errors prevent the one-liner from working, fall back to:
```bash
cd nuxt-public && node -e "const m = require('js-md5'); console.log(m('user@example.com'))"
```
Expected: `b58996c504c5638798eb6b511e6f49af`.

- [ ] **Step 3: Sanity check trim/case behavior (informs avatar task)**

Run: `cd nuxt-public && node -e "const m = require('js-md5'); console.log(m(' User@Example.com '.toLowerCase().trim()))"`
Expected: same hash as `md5('user@example.com')` → `b58996c504c5638798eb6b511e6f49af`. This confirms the avatar util's normalization is correct.

- [ ] **Step 4: Commit (only after explicit user OK)**

Do NOT commit without explicit user authorization. Show the new file (`cat nuxt-public/app/utils/md5.ts`) and ASK before committing.

---

## Task 3: Add `avatar` utility module

**Files:**
- Create: `nuxt-public/app/utils/avatar.ts`

**Interfaces:**
- Consumes: `md5(input)` from `~/utils/md5` (Nuxt auto-imports `utils/`; do not add manual import unless auto-import fails)
- Produces:
  - `export function getAvatarUrl(email?: string | null, name: string): string` — returns Gravatar URL if email is truthy after trim, else DiceBear URL.
  - `export function getDiceBearUrl(name: string): string` — returns DiceBear URL always.

- [ ] **Step 1: Create the file**

Create `nuxt-public/app/utils/avatar.ts` with the following content:

```ts
import { md5 } from '~/utils/md5'

const GRAVATAR_BASE = 'https://www.gravatar.com/avatar'
const GRAVATAR_SIZE = 80
const DICEBEAR_BASE = 'https://api.dicebear.com/7.x/notionists/svg'

/**
 * Build a Gravatar URL using exact md5 of the email.
 * Falls back to a DiceBear Notionist URL when no email is provided.
 *
 * @param email  Optional. Will be lowercased and trimmed before md5.
 *               Falsy or empty-after-trim values trigger the DiceBear fallback.
 * @param name   Used to seed the DiceBear fallback. Also used for the
 *               `<UAvatar>` `alt` attribute in the consuming component.
 */
export function getAvatarUrl(email?: string | null, name: string): string {
  if (email && email.trim()) {
    const hash = md5(email.toLowerCase().trim())
    return `${GRAVATAR_BASE}/${hash}?d=404&s=${GRAVATAR_SIZE}`
  }
  return getDiceBearUrl(name)
}

/**
 * Build a stable DiceBear Notionist URL keyed off the author name.
 * Used as the onError fallback in the consuming component.
 */
export function getDiceBearUrl(name: string): string {
  const seed = encodeURIComponent(name)
  return `${DICEBEAR_BASE}?seed=${seed}&backgroundColor=transparent`
}
```

- [ ] **Step 2: Verify gravatar branch (with email)**

Run from `nuxt-public/`:

```bash
node -e "
const m = require('js-md5');
const email = 'user@example.com';
const hash = m(email.toLowerCase().trim());
console.log('https://www.gravatar.com/avatar/' + hash + '?d=404&s=80');
"
```

Expected output:
`https://www.gravatar.com/avatar/b58996c504c5638798eb6b511e6f49af?d=404&s=80`

This is the value `getAvatarUrl('user@example.com', 'User')` should produce.

- [ ] **Step 3: Verify dicebear branch (no email)**

Run:
```bash
node -e "console.log('https://api.dicebear.com/7.x/notionists/svg?seed=' + encodeURIComponent('高烨飞') + '&backgroundColor=transparent')"
```

Expected: `https://api.dicebear.com/7.x/notionists/svg?seed=%E9%AB%98%E7%83%A8%E9%A3%9E&backgroundColor=transparent`

This is the value `getAvatarUrl(undefined, '高烨飞')` should produce.

- [ ] **Step 4: Verify edge cases**

Run:
```bash
node -e "
const m = require('js-md5');
// empty email
console.log('empty:', 'https://api.dicebear.com/7.x/notionists/svg?seed=' + encodeURIComponent('Anonymous') + '&backgroundColor=transparent');
// whitespace-only email
const w = '   '.toLowerCase().trim();
console.log('whitespace-only email resolves to:', w === '' ? 'dicebear' : 'gravatar ' + m(w));
// mixed case
console.log('mixed case hash:', m('User@Example.COM'.toLowerCase().trim()));
"
```

Expected:
- `empty:` line ends with `seed=Anonymous&backgroundColor=transparent` (DiceBear branch).
- `whitespace-only email resolves to: dicebear`.
- `mixed case hash:` is `b58996c504c5638798eb6b511e6f49af` (same as plain `user@example.com`).

- [ ] **Step 5: Commit (only after explicit user OK)**

Do NOT commit without explicit user authorization. Show the new file and ASK before committing.

---

## Task 4: Rewrite `CommentSection.vue`

**Files:**
- Modify: `nuxt-public/app/components/CommentSection.vue` (full rewrite — template, script, style)

**Interfaces:**
- Consumes:
  - `useComments()` from `~/composables/useComments` (signature unchanged)
  - `getAvatarUrl(email, name)` and `getDiceBearUrl(name)` from `~/utils/avatar` (auto-imported by Nuxt)
  - `useToast()` from Nuxt UI
  - `<UForm>`, `<UFormField>`, `<UInput>`, `<UTextarea>`, `<UButton>`, `<UAvatar>`, `<UAlert>`, `<StateEmpty>`, `<StateError>`, `<StateLoading>` from Nuxt UI / `~/shared/ui/`
  - `<Icon>` from `@nuxt/icon`
  - `valibot` `v.*` for schema
- Produces:
  - Default-exported Vue component, same `props` (`articleId: [Number, String]`, required) and same template structure root as today, but with new internals.

- [ ] **Step 1: Verify `StateError` retry prop compatibility**

Read `nuxt-public/app/shared/ui/StateError.vue`. Confirm whether it accepts an `error` prop and an `actions` array (or a `retry` event) usable to render a "重试" button. If it does, use the existing component. If not, fall back to a small inline block.

The expected API (based on the project's other shared UI files): `StateError` accepts `error: Error` and `actions: Array<{label, onClick, color?, variant?}>` props. If only the latter exists, define a single `actions: [{ label: '重试', onClick: fetchComments, color: 'primary', variant: 'solid' }]` array.

If neither prop is supported, render a minimal block:
```vue
<div class="py-12 text-center">
  <Icon name="heroicons:exclamation-triangle" size="2xl" class="text-[var(--accent-danger)] mb-2" />
  <p class="text-sm text-[var(--text-muted)] mb-4">加载评论失败</p>
  <UButton color="primary" variant="solid" size="sm" @click="fetchComments">重试</UButton>
</div>
```

- [ ] **Step 2: Write the new component (full file replacement)**

Replace the entire content of `nuxt-public/app/components/CommentSection.vue` with the following:

```vue
<template>
  <div class="comment-section-container w-full mx-auto py-10 px-4">
    <!-- 标题行 -->
    <div class="max-w-3xl mx-auto mb-6 flex items-center gap-2">
      <Icon name="heroicons:chat-bubble-oval-left" class="comment-heading-icon" />
      <h3 class="comment-heading text-xl font-semibold">评论</h3>
      <span class="comment-count-badge text-sm font-normal">({{ comments.length }})</span>
    </div>

    <!-- 评论表单卡片 -->
    <div class="max-w-3xl mx-auto mb-12">
      <UAlert
        v-if="submitSuccess"
        color="success"
        variant="soft"
        title="评论提交成功！正在等待审核..."
        class="mb-4 rounded-lg"
        close
        @close="submitSuccess = false"
      />

      <div class="comment-form-card rounded-xl p-6 transition-shadow">
        <UForm :schema="schema" :state="newComment" :validate-on="['blur']" class="space-y-4" @submit="handleSubmit">
          <div class="flex items-start gap-3">
            <UAvatar
              :alt="newComment.author || '我'"
              size="md"
              class="comment-avatar shrink-0"
            />
            <UFormField name="author" class="grow">
              <UInput
                v-model="newComment.author"
                placeholder="Name *"
                size="lg"
                :ui="inputClass"
              />
            </UFormField>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField name="email">
              <UInput
                v-model="newComment.email"
                placeholder="Email (optional)"
                size="lg"
                :ui="inputClass"
              />
            </UFormField>
            <UFormField name="website">
              <UInput
                v-model="newComment.website"
                placeholder="Website (optional)"
                size="lg"
                :ui="inputClass"
              />
            </UFormField>
          </div>

          <UFormField name="content">
            <UTextarea
              v-model="newComment.content"
              placeholder="Write your thoughts..."
              :rows="5"
              size="lg"
              :ui="textareaClass"
              :maxlength="1000"
            />
          </UFormField>

          <div class="flex items-center justify-between">
            <span
              class="text-xs transition-colors"
              :class="charCountClass"
            >{{ newComment.content.length }} / 1000</span>
            <UButton
              type="submit"
              size="md"
              :loading="submitting"
              class="px-6 rounded-lg font-medium shadow-none hover:shadow-lg transition-all"
              trailing-icon="heroicons:paper-airplane"
            >
              发表评论
            </UButton>
          </div>
        </UForm>
      </div>
    </div>

    <!-- 错误态 -->
    <div v-if="loadError" class="max-w-3xl mx-auto py-12 text-center">
      <Icon name="heroicons:exclamation-triangle" size="2xl" class="text-[var(--accent-danger)] mb-2" />
      <p class="text-sm text-[var(--text-muted)] mb-4">加载评论失败</p>
      <UButton color="primary" variant="solid" size="sm" @click="fetchComments">重试</UButton>
    </div>

    <!-- 加载态 -->
    <div v-else-if="loadingComments" class="max-w-3xl mx-auto py-8 space-y-6">
      <div v-for="i in 3" :key="i" class="flex gap-3 items-start">
        <div class="comment-skeleton-avatar rounded-full" />
        <div class="grow space-y-2 pt-1">
          <div class="comment-skeleton-line w-3/5" />
          <div class="comment-skeleton-line w-2/5" />
        </div>
      </div>
    </div>

    <!-- 空态 -->
    <div v-else-if="comments.length === 0" class="max-w-3xl mx-auto">
      <StateEmpty
        icon="heroicons:chat-bubble-oval-left-ellipsis"
        description="还没有评论，来留下第一条吧～"
      />
    </div>

    <!-- 列表 -->
    <ul v-else class="comment-list max-w-3xl mx-auto">
      <li
        v-for="comment in comments"
        :key="comment.id"
        class="group py-6"
      >
        <div class="flex items-start gap-3">
          <UAvatar
            :src="currentAvatarSrc(comment)"
            :alt="comment.author"
            size="md"
            class="comment-avatar shrink-0"
            @error="onAvatarError(comment.id, $event)"
          />
          <div class="grow min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="comment-author-name text-sm font-semibold">{{ comment.author }}</span>
              <span
                v-if="comment.isAdmin"
                class="comment-author-badge text-xs font-medium px-1.5 py-0.5 rounded-md"
              >Author</span>
              <span class="comment-meta-sep text-xs">·</span>
              <span class="comment-meta-time text-xs">{{ formatDate(comment.createdAt) }}</span>
            </div>

            <div class="comment-body-text mt-1.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
              {{ comment.content }}
            </div>

            <div class="comment-actions mt-2 flex items-center gap-4 text-xs">
              <button
                class="comment-like-toggle flex items-center gap-1.5 transition-colors"
                :class="comment.isLiked ? 'comment-like-toggle-active' : 'comment-like-toggle-inactive'"
                @click="likeComment(comment.id)"
              >
                <Icon
                  :name="comment.isLiked ? 'heroicons:heart-solid' : 'heroicons:heart'"
                  size="sm"
                />
                <span>{{ comment.likes || 0 }}</span>
              </button>

              <a
                v-if="comment.website"
                :href="comment.website"
                target="_blank"
                rel="noopener noreferrer"
                class="comment-website-link flex items-center gap-1.5 transition-colors"
              >
                <Icon name="heroicons:link" size="sm" />
                <span>Website</span>
              </a>
            </div>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { useComments } from '~/composables/useComments'
import { getAvatarUrl, getDiceBearUrl } from '~/utils/avatar'
import * as v from 'valibot'

const props = defineProps({
  articleId: {
    type: [Number, String],
    required: true
  }
})

const toast = useToast()

// 表单 schema：author/content 必填，email/website 可选
const schema = v.object({
  author: v.pipe(v.string(), v.trim(), v.minLength(1, 'Name is required')),
  email: v.optional(v.string()),
  website: v.optional(v.string()),
  content: v.pipe(v.string(), v.trim(), v.minLength(1, 'Content is required'))
})

// 状态
const comments = ref([])
const submitting = ref(false)
const submitSuccess = ref(false)
const loadingComments = ref(true)
const loadError = ref(false)
const avatarFallbackIds = ref(new Set()) // 已经回退到 DiceBear 的评论 id

const newComment = ref({
  author: '',
  email: '',
  website: '',
  content: ''
})

// 字符计数颜色：>800 警告，>950 危险
const charCountClass = computed(() => {
  const len = newComment.value.content.length
  if (len > 950) return 'text-[var(--accent-danger)]'
  if (len > 800) return 'text-[var(--accent-warning)]'
  return 'text-[var(--text-muted)]'
})

// 沿用项目主题令牌
const inputClass = {
  base: 'rounded-lg bg-[var(--input-bg)]! border! border-[var(--input-border)]! focus:border-[var(--input-focus-border)]! transition-colors px-4! py-2.5! text-sm!'
}
const textareaClass = {
  base: 'rounded-lg bg-[var(--input-bg)]! border! border-[var(--input-border)]! focus:border-[var(--input-focus-border)]! transition-colors px-4! py-2.5! text-sm! leading-relaxed!'
}

// 头像策略：优先 Gravatar（精确 md5 匹配），404 切 DiceBear
const currentAvatarSrc = (comment) => {
  if (avatarFallbackIds.value.has(comment.id)) {
    return getDiceBearUrl(comment.author)
  }
  return getAvatarUrl(comment.email, comment.author)
}

const onAvatarError = (commentId, event) => {
  if (avatarFallbackIds.value.has(commentId)) return
  avatarFallbackIds.value.add(commentId)
  // 触发响应式更新：把新的 Set 替换（Vue 不会监听 Set 内部变更）
  avatarFallbackIds.value = new Set(avatarFallbackIds.value)
  // 强制 UAvatar 重新拉取新 src
  if (event?.target) {
    event.target.src = getDiceBearUrl(comments.value.find(c => c.id === commentId)?.author ?? '')
  }
}

// API
const { getCommentsByArticle, submitComment: submitCommentApi, likeComment: likeCommentApi } = useComments()

const fetchComments = async () => {
  loadingComments.value = true
  loadError.value = false
  try {
    const data = await getCommentsByArticle(props.articleId)
    comments.value = data || []
    avatarFallbackIds.value = new Set()
  } catch (error) {
    console.error('获取评论失败:', error)
    loadError.value = true
  } finally {
    loadingComments.value = false
  }
}

const handleSubmit = async (event) => {
  const commentData = {
    articleId: props.articleId,
    author: event.data.author,
    email: event.data.email?.trim() || '',
    website: event.data.website?.trim() || '',
    content: event.data.content
  }
  submitting.value = true
  submitSuccess.value = false
  try {
    await submitCommentApi(commentData)
    newComment.value = { author: '', email: '', website: '', content: '' }
    submitSuccess.value = true
    toast.add({ title: '评论发布成功！', color: 'success' })
    await fetchComments()
  } catch (error) {
    console.error('提交评论失败:', error)
    toast.add({ title: '评论发布失败', color: 'error' })
  } finally {
    submitting.value = false
  }
}

const likeComment = async (commentId) => {
  try {
    await likeCommentApi(commentId)
    const comment = comments.value.find(c => c.id === commentId)
    if (comment) {
      comment.likes = (comment.likes || 0) + 1
      comment.isLiked = true
    }
  } catch (error) {
    console.error('点赞评论失败:', error)
  }
}

// 相对时间格式化
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const diff = now - date
  if (diff < 0) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  const mins = Math.floor(diff / (60 * 1000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(diff / (60 * 60 * 1000))
  if (hours < 24 && date.getDate() === now.getDate()) return `${hours}h ago`
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

watch(() => props.articleId, (newId, oldId) => {
  if (newId !== oldId) fetchComments()
})

onMounted(() => {
  fetchComments()
})
</script>

<style scoped>
/* === 标题 === */
.comment-heading { color: var(--text-primary); }
.comment-heading-icon { color: var(--text-muted); }
.comment-count-badge { color: var(--text-muted); }

/* === 表单卡片 === */
.comment-form-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  box-shadow: var(--card-shadow);
}
.comment-form-card:hover { box-shadow: var(--shadow-sm); }

/* === 头像 === */
.comment-avatar {
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

/* === 列表骨架 === */
.comment-list { border-top: 1px solid var(--border-color-light); }
.comment-list > li + li { border-top: 1px solid var(--border-color-light); }

.comment-skeleton-avatar {
  width: 2.5rem; height: 2.5rem;
  background: var(--bg-secondary);
  animation: comment-skeleton-pulse 1.6s ease-in-out infinite;
}
.comment-skeleton-line {
  height: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 4px;
  animation: comment-skeleton-pulse 1.6s ease-in-out infinite;
}
@keyframes comment-skeleton-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* === 列表项 === */
.comment-author-name { color: var(--text-primary); }
.comment-meta-sep { color: var(--text-muted); }
.comment-meta-time { color: var(--text-muted); }
.comment-body-text { color: var(--text-primary); }

/* Author 徽章：accent 半透明 + 文本色 */
.comment-author-badge {
  background: color-mix(in srgb, var(--accent-primary) 12%, transparent);
  color: var(--accent-primary);
}

/* === 操作行：桌面 hover 显隐，移动端常驻 === */
.comment-actions { color: var(--text-muted); opacity: 0; transition: opacity 0.15s ease; }
.group:hover .comment-actions,
.group:focus-within .comment-actions { opacity: 1; }
@media (max-width: 767px) {
  .comment-actions { opacity: 1; }
}

.comment-like-toggle-inactive { color: var(--text-muted); }
.comment-like-toggle-inactive:hover { color: var(--accent-danger); }
.comment-like-toggle-active { color: var(--accent-danger); }

.comment-website-link { color: var(--text-muted); }
.comment-website-link:hover { color: var(--accent-primary); }
</style>
```

- [ ] **Step 3: Verify no stale identifiers remain**

Run from repo root:

```bash
grep -nE "likeCount|isLiked|likingInProgress|toggleLike|fetchLikeStatus|likedArticles" nuxt-public/app/components/CommentSection.vue
```

Expected: no output (zero matches). If anything matches, the rewrite is incomplete — recheck Step 2.

- [ ] **Step 4: Verify the new structure**

Run:
```bash
grep -cE "getAvatarUrl|getDiceBearUrl|newComment\.website" nuxt-public/app/components/CommentSection.vue
```

Expected: ≥ 3 (avatar utility used + newComment.website present). Confirms the rewrite contains the new logic.

- [ ] **Step 5: Run type check**

From `nuxt-public/`: `npx nuxi typecheck` (or `pnpm exec nuxi typecheck`). The project may not have a `typecheck` script — use `vue-tsc` directly: `npx vue-tsc --noEmit`.

Expected: no new errors introduced by this change. Pre-existing errors (if any) are out of scope — confirm by diffing against the current state: errors count must not increase.

- [ ] **Step 6: Run lint**

From repo root: `pnpm lint` (if configured) or `pnpm exec eslint nuxt-public/app/components/CommentSection.vue nuxt-public/app/utils/avatar.ts nuxt-public/app/utils/md5.ts` (if eslint is installed; otherwise skip this step and note "no eslint configured").

Expected: no new errors.

- [ ] **Step 7: Commit (only after explicit user OK)**

Do NOT commit without explicit user authorization. Show the diff (`git diff nuxt-public/app/components/CommentSection.vue`) and ASK before committing. If the user OKs, suggested commit message:
```
refactor(comment-section): redesign UI to GitHub/shadcn style; add website field; Gravatar-first avatars
```

---

## Task 5: Manual end-to-end verification

**Files:** None (read-only inspection of running app + grep)

**No code changes.** This task is the visual + functional acceptance pass against the spec scenarios.

- [ ] **Step 1: Start the dev server**

From `nuxt-public/`: `pnpm dev`. Wait for the server to report "ready" / listening on a port (default 3000).

- [ ] **Step 2: Verify Scenario: 标题行形态 (spec.md "标题行形态")**

Open a browser to any article detail page (e.g. `http://localhost:3000/articles/<some-id>`). Confirm:
- Top of the comment section shows `评论` (size xl, semibold, `--text-primary`).
- Right side shows `(<count>)` (size sm, `--text-muted`).
- No "big heart + count" block at the top.

- [ ] **Step 3: Verify Scenario: 列表项形态 (spec.md "列表项形态")**

With a page that has comments:
- Each comment shows a 40px round avatar with 1px border, author name in 14px semibold, dot, relative time.
- Author badge (when `comment.isAdmin === true`) appears as a small rounded pill in accent color.
- Content is plain text, wraps naturally, no Markdown rendering.
- Action row (`❤ N`, `Website`) is invisible at rest, fades in on hover (or focus-within).
- Action row is always visible on viewport ≤ 767px.

- [ ] **Step 4: Verify Scenario: Author 徽章形态 (spec.md)**

Toggle the dev server's dark mode (use the site's ThemeSwitcher if present, else manually add/remove `.dark` on `<html>`). Confirm:
- Author badge background tints to accent in both modes.
- Badge text color remains legible in both modes.

- [ ] **Step 5: Verify Scenario: 列表项分割线 (spec.md)**

Confirm a thin `--border-color-light` line above the first item, between items, and below the last item. No "last item has no border" exception.

- [ ] **Step 6: Verify Scenario: 加载态 (spec.md)**

Hard-refresh the page with DevTools Network throttled to "Slow 3G" (or temporarily set `$apiBase` to a non-routable URL to force a delay). Confirm 3 skeleton rows appear (avatar circle + 2 lines), NOT a UProgress bar.

- [ ] **Step 7: Verify Scenario: 空态 (spec.md)**

Open an article with no comments. Confirm `<StateEmpty>` renders with icon `heroicons:chat-bubble-oval-left-ellipsis` and description `还没有评论，来留下第一条吧～`.

- [ ] **Step 8: Verify Scenario: 错误态 (spec.md)**

Temporarily edit `nuxt-public/app/composables/useComments.ts` to point `baseURL` at a 404 URL (or use DevTools "Block request URL" to intercept `*/comments/article/*`). Reload. Confirm the error block with "重试" button appears; click it and confirm the request fires again.

Revert the temporary change when done.

- [ ] **Step 9: Verify Scenario: 表单字段 + 提交 payload (spec.md "表单包含 website 字段")**

Fill in `author`, leave `email` and `website` empty, fill `content`, submit. Open DevTools Network and inspect the POST body to `*/comments`. Confirm payload is:
```json
{ "articleId": <num>, "author": "...", "email": "", "website": "", "content": "..." }
```

Fill in `website = "https://example.com"`, submit again. Confirm payload has `"website": "https://example.com"`.

- [ ] **Step 10: Verify Scenario: 头像 URL 生成 (spec.md)**

Open a comment that has a `comment.email` whose Gravatar exists (any common test email). In DevTools Network, find the avatar request. Confirm URL matches:
`https://www.gravatar.com/avatar/<32-hex-md5>?d=404&s=80`

For a comment without email, confirm URL matches:
`https://api.dicebear.com/7.x/notionists/svg?seed=<encoded-name>&backgroundColor=transparent`

- [ ] **Step 11: Verify Scenario: onError 兜底 (spec.md)**

Use a comment with a `comment.email` that has no Gravatar (any random string like `nobody-here-12345@example.com`). Confirm:
- Initial request to gravatar.com returns 404.
- `<img>` immediately re-requests the DiceBear URL (visible in DevTools Network as a second request).
- Final visible avatar is the DiceBear illustration.
- No white flash during the switch (the `<UAvatar>` container size stays fixed, only the `src` swaps).

- [ ] **Step 12: Verify Scenario: 点赞单条评论 (preserved behavior)**

Click the heart on any comment. Confirm:
- Heart icon toggles to solid.
- Count increments by 1.
- The corresponding `POST */comments/<id>/like` request fires.
- Reloading the page keeps the visual increment (server-side state).

- [ ] **Step 13: Verify Scenario: 明暗主题零新增 CSS 变量 (spec.md)**

Run from repo root:
```bash
grep -nE "^\s*--[a-z][a-z0-9-]*\s*:" nuxt-public/app/components/CommentSection.vue
```

Expected: zero matches (no new CSS variable DEFINITIONS — only references to existing ones via `var(--xxx)` are allowed).

- [ ] **Step 14: Verify mobile viewport (375x667)**

In Chrome DevTools, set viewport to 375x667. Reload an article page. Confirm:
- Form fields stack vertically (1 column).
- Action rows on each comment are always visible (not hover-gated).
- No horizontal scroll.
- Skeleton / empty / error blocks all render legibly.

- [ ] **Step 15: Final commit (only after explicit user OK)**

If any visual tweaks were applied during verification, stage only those changes. Show the final `git status` and `git diff --stat`, then ASK before committing.

Suggested commit message if anything was tweaked:
```
style(comment-section): minor tweaks from manual verification pass
```

---

## Self-Review (already applied)

1. **Spec coverage:** Each spec scenario maps to a task — Task 4 covers structural rewrite (scenarios: 标题行 / 列表项 / Author 徽章 / 列表项分割线 / 加载态 / 空态 / 错误态 / 表单字段 / 提交 payload); Task 3 covers 头像 URL 生成; Task 4's `onAvatarError` covers onError 兜底; Task 4's deletion list covers 不存在 article-level like; Task 4's style block covers 明暗主题零新增 CSS 变量; Task 5 covers 点赞单条 + 移动端 + 明暗切换无闪烁.
2. **Placeholder scan:** No TBD/TODO/"implement later" patterns in any step. All code shown is complete.
3. **Type consistency:** `getAvatarUrl(email?, name)` / `getDiceBearUrl(name)` / `md5(input)` signatures are defined in Tasks 2-3 and consumed identically in Task 4. `currentAvatarSrc(comment)` and `onAvatarError(commentId, event)` are the only new component-local helpers; both are self-contained.
4. **No backend, type, or composable signature changes** — verified by `proposal.md` "不修改" list mirrored in Global Constraints.
5. **No test framework introduced** — explicit in Global Constraint, utility verification uses Node one-liners.
6. **No unauthorized commits** — every commit step explicitly says "ASK before committing" (CLAUDE.md §3.2).

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-14-comment-section-redesign.md`. Two execution options:

1. **Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
