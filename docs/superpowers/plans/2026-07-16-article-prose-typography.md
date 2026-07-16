# Article Prose Typography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `nuxt-public` article Markdown/MDC prose read like Tailwind Typography while keeping Nuxt UI v4 Prose as the renderer.

**Architecture:** Keep rendering behavior in `MarkdownRenderer.vue` unchanged. Put element-level Markdown styles in Nuxt UI Prose slots (`app.config.ts`) and put container plus legacy `v-html` fallback rules in `prose-theme.css`; keep only special-content support in the desktop/mobile prose custom files.

**Tech Stack:** Nuxt 4, Nuxt UI v4 Prose, Tailwind CSS v4 utilities, CSS split into desktop/mobile files.

---

## File Structure

- Modify `nuxt-public/app/app.config.ts`: Tune Nuxt UI `ui.prose` slots to Typography-like spacing, restrained decoration, and quiet inline element styling.
- Modify `nuxt-public/app/assets/css/components/prose-theme.css`: Set `article-prose` reading width and align legacy fallback with the same visual model.
- Modify `nuxt-public/app/assets/css/components/prose-custom.desktop.css`: Keep only code pseudo-element cleanup, KaTeX overflow, and selection color.
- Modify `nuxt-public/app/assets/css/components/prose-custom.mobile.css`: Keep mobile overflow and size guards within allowed `max-width` breakpoints.
- Do not modify `nuxt-public/app/components/MarkdownRenderer.vue` unless verification proves a width breakout class is required.

## Current Worktree Guard

The implementation target files already have uncommitted changes. Treat them as user-owned until proven otherwise.

- [ ] **Step 1: Snapshot relevant current diff**

Run:

```powershell
git diff -- nuxt-public/app/app.config.ts nuxt-public/app/assets/css/components/prose-theme.css nuxt-public/app/assets/css/components/prose-custom.desktop.css nuxt-public/app/assets/css/components/prose-custom.mobile.css
```

Expected: diff shows current Nuxt UI Prose slot configuration and `article-prose` CSS. Do not reset these files.

- [ ] **Step 2: Confirm no renderer changes are needed**

Run:

```powershell
Select-String -Path "nuxt-public/app/components/MarkdownRenderer.vue" -Pattern "article-prose|max-w-none|legacyProseClasses|proseClasses" -Context 2,2
```

Expected: `proseClasses` includes `article-prose`, size modifier, and `max-w-none`. The implementation should not remove the renderer classes; width can be controlled in CSS with selector specificity.

## Task 1: Nuxt UI Prose Slots

**Files:**
- Modify: `nuxt-public/app/app.config.ts`

- [ ] **Step 1: Replace the `ui.prose` object with Typography-inspired Nuxt UI slots**

In `nuxt-public/app/app.config.ts`, keep `ui.colors` unchanged and replace only the `prose: { ... }` block with:

```ts
    prose: {
      h1: {
        slots: {
          base: 'scroll-mt-20 text-4xl md:text-5xl font-extrabold text-highlighted mb-8 leading-none'
        }
      },
      h2: {
        slots: {
          base: 'scroll-mt-20 text-3xl font-bold text-highlighted mt-12 mb-5 leading-tight',
          link: 'group inline-flex items-center gap-2 no-underline text-highlighted hover:text-[var(--accent-primary)]',
          leading: 'opacity-0 group-hover:opacity-100 transition-opacity',
          leadingIcon: 'size-4 text-muted'
        }
      },
      h3: {
        slots: {
          base: 'scroll-mt-20 text-2xl font-bold text-highlighted mt-10 mb-3 leading-snug',
          link: 'group inline-flex items-center gap-2 no-underline text-highlighted hover:text-[var(--accent-primary)]',
          leading: 'opacity-0 group-hover:opacity-100 transition-opacity',
          leadingIcon: 'size-4 text-muted'
        }
      },
      h4: {
        slots: {
          base: 'scroll-mt-20 text-xl font-bold text-highlighted mt-8 mb-3 leading-snug',
          link: 'group inline-flex items-center gap-2 no-underline text-highlighted hover:text-[var(--accent-primary)]',
          leading: 'opacity-0 group-hover:opacity-100 transition-opacity',
          leadingIcon: 'size-4 text-muted'
        }
      },
      p: {
        base: 'my-5 leading-8 text-toned'
      },
      a: {
        base: 'font-semibold text-highlighted underline decoration-muted underline-offset-4 transition-colors hover:text-[var(--accent-primary)] hover:decoration-[var(--accent-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:color-mix(in_srgb,var(--accent-primary)_35%,transparent)]'
      },
      ul: {
        base: 'my-5 list-disc ps-7 space-y-2 text-toned marker:text-muted'
      },
      ol: {
        base: 'my-5 list-decimal ps-7 space-y-2 text-toned marker:text-muted marker:font-normal'
      },
      li: {
        base: 'leading-8 ps-1'
      },
      blockquote: {
        base: 'my-7 border-s-4 border-muted ps-5 text-highlighted italic [&_p]:my-0 [&_strong]:text-highlighted'
      },
      table: {
        slots: {
          root: 'my-8 w-full overflow-x-auto',
          base: 'w-full min-w-full border-collapse text-sm'
        }
      },
      thead: {
        base: 'border-b border-muted'
      },
      th: {
        base: 'border-b border-muted px-3 py-2 text-start font-semibold text-highlighted'
      },
      td: {
        base: 'border-b border-muted px-3 py-2 text-toned align-top'
      },
      code: {
        base: 'rounded px-1.5 py-0.5 font-mono text-[0.875em] font-semibold',
        variants: {
          color: {
            neutral: 'bg-muted/60 text-highlighted'
          }
        },
        defaultVariants: {
          color: 'neutral'
        }
      },
      pre: {
        slots: {
          root: 'article-code-block relative my-7',
          base: 'overflow-x-auto rounded-lg bg-slate-950 px-4 py-4 text-sm leading-7 text-slate-200',
          copy: 'absolute top-3 end-3 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
          header: 'flex items-center gap-2 rounded-t-lg border border-b-0 border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-300',
          filename: 'font-semibold text-slate-200',
          icon: 'size-4 text-slate-400'
        }
      },
      img: {
        slots: {
          base: 'my-8 mx-auto rounded-lg border border-muted',
          overlay: 'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm',
          content: 'fixed inset-0 z-50 flex items-center justify-center p-4',
          zoomedImage: 'max-h-[90vh] max-w-[90vw] rounded-lg shadow-xl'
        }
      },
      hr: {
        base: 'my-10 border-0 border-t border-muted'
      }
    }
```

- [ ] **Step 2: Run TypeScript syntax check by parsing the file**

Run:

```powershell
node -e "import('./nuxt-public/app/app.config.ts').then(() => console.log('app.config parse ok')).catch((e) => { console.error(e); process.exit(1) })"
```

Expected: either `app.config parse ok`, or a Nuxt alias/loader-related import error that does not point to TypeScript syntax in `app.config.ts`. If the error is a syntax error, fix the changed block before continuing.

## Task 2: Article Container and Legacy Fallback

**Files:**
- Modify: `nuxt-public/app/assets/css/components/prose-theme.css`

- [ ] **Step 1: Replace `.article-prose` root and size rules**

Set the top root section to:

```css
.article-prose {
  max-width: 65ch;
  margin-inline: auto;
  color: var(--ui-text-toned, #374151);
}

.article-prose--sm {
  font-size: 0.875rem;
  line-height: 1.714;
}

.article-prose--base {
  font-size: 1rem;
  line-height: 1.75;
}

.article-prose--lg {
  font-size: 1.125rem;
  line-height: 1.777;
}

.article-prose--xl {
  font-size: 1.25rem;
  line-height: 1.8;
}

.article-prose--2xl {
  font-size: 1.5rem;
  line-height: 1.666;
}

.article-prose :where(h1, h2, h3, h4, h5, h6) {
  scroll-margin-top: 5rem;
}
```

- [ ] **Step 2: Add spacing correction after headings**

Place this after the heading scroll-margin rule:

```css
.article-prose :where(h2, h3, h4) + :where(p, ul, ol, blockquote, pre, table) {
  margin-top: 0;
}
```

- [ ] **Step 3: Replace legacy heading and paragraph rules**

Update legacy fallback rules to:

```css
.article-prose--legacy :where(h1, h2, h3, h4, h5, h6) {
  color: var(--ui-text-highlighted, #111827);
  font-weight: 800;
  letter-spacing: 0;
}

.article-prose--legacy h1 {
  margin-bottom: 2rem;
  font-size: 2.666em;
  line-height: 1;
}

.article-prose--legacy h2 {
  margin-top: 2.25em;
  margin-bottom: 1em;
  font-size: 1.555em;
  line-height: 1.285;
}

.article-prose--legacy h3 {
  margin-top: 2em;
  margin-bottom: 0.75em;
  font-size: 1.333em;
  line-height: 1.333;
}

.article-prose--legacy h4 {
  margin-top: 1.75em;
  margin-bottom: 0.75em;
  font-size: 1.125em;
  line-height: 1.4;
}

.article-prose--legacy p {
  margin-top: 1.25em;
  margin-bottom: 1.25em;
  color: var(--ui-text-toned, #374151);
  line-height: inherit;
}
```

- [ ] **Step 4: Replace legacy inline, list, blockquote, table, code, image, and hr rules**

Use these declarations for the corresponding legacy selectors:

```css
.article-prose--legacy a {
  color: var(--ui-text-highlighted, #111827);
  font-weight: 600;
  text-decoration: underline;
  text-decoration-color: var(--ui-border, #d4d4d8);
  text-underline-offset: 4px;
  transition: color 0.15s ease-in-out, text-decoration-color 0.15s ease-in-out;
}

.article-prose--legacy a:hover {
  color: var(--ui-primary, #2563eb);
  text-decoration-color: var(--ui-primary, #2563eb);
}

.article-prose--legacy :where(ul, ol) {
  margin-top: 1.25em;
  margin-bottom: 1.25em;
  padding-left: 1.625em;
  color: var(--ui-text-toned, #374151);
}

.article-prose--legacy ul {
  list-style-type: disc;
}

.article-prose--legacy ol {
  list-style-type: decimal;
}

.article-prose--legacy li {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
  padding-left: 0.375em;
  line-height: inherit;
}

.article-prose--legacy li::marker {
  color: var(--ui-text-muted, #a1a1aa);
}

.article-prose--legacy blockquote {
  margin-top: 1.666em;
  margin-bottom: 1.666em;
  padding-left: 1em;
  border-left: 4px solid var(--ui-border, #d4d4d8);
  color: var(--ui-text-highlighted, #111827);
  font-style: italic;
  font-weight: 500;
}

.article-prose--legacy table {
  width: 100%;
  margin-top: 2em;
  margin-bottom: 2em;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.article-prose--legacy thead {
  border-bottom: 1px solid var(--ui-border, #d4d4d8);
}

.article-prose--legacy th,
.article-prose--legacy td {
  padding: 0.571em;
  border-bottom: 1px solid var(--ui-border, #e5e7eb);
  text-align: left;
}

.article-prose--legacy th {
  color: var(--ui-text-highlighted, #111827);
  font-weight: 700;
}

.article-prose--legacy td {
  color: var(--ui-text-toned, #374151);
}

.article-prose--legacy :not(pre) > code {
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  background: var(--ui-bg-muted, #f4f4f5);
  color: var(--ui-text-highlighted, #111827);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875em;
  font-weight: 600;
}

.article-prose--legacy pre {
  margin-top: 1.714em;
  margin-bottom: 1.714em;
  padding: 0.857em 1.142em;
  overflow-x: auto;
  border-radius: 0.5rem;
  background: #18181b;
  color: #e4e4e7;
  font-size: 0.875rem;
  line-height: 1.714;
}

.article-prose--legacy img {
  display: block;
  margin: 2em auto;
  border: 1px solid var(--ui-border, #e5e7eb);
  border-radius: 0.5rem;
}

.article-prose--legacy hr {
  margin-top: 2.5em;
  margin-bottom: 2.5em;
  border: 0;
  border-top: 1px solid var(--ui-border, #e5e7eb);
}
```

- [ ] **Step 5: Search for old decoration that should be gone**

Run:

```powershell
Select-String -Path "nuxt-public/app/assets/css/components/prose-theme.css" -Pattern "linear-gradient|shadow|rounded-xl|after|border-bottom"
```

Expected: no matches for decorative prose rules in `prose-theme.css`. If matches remain in legacy prose selectors, remove them unless they are unrelated comments.

## Task 3: Desktop and Mobile Support Rules

**Files:**
- Modify: `nuxt-public/app/assets/css/components/prose-custom.desktop.css`
- Modify: `nuxt-public/app/assets/css/components/prose-custom.mobile.css`

- [ ] **Step 1: Keep desktop custom CSS minimal**

Ensure `prose-custom.desktop.css` contains only these behavior-level rules:

```css
/**
 * 文章特殊内容兜底 - 桌面端基线。
 *
 * 标准 Markdown 元素样式由 Nuxt UI Prose (`app.config.ts -> ui.prose`) 负责。
 * 本文件只处理 Prose 组件不负责的内容：KaTeX、选中文本、legacy code 细节。
 * Mermaid 与自定义 MDC 块级显示位于 MarkdownRenderer.vue，因为它们由该组件运行时接管。
 */

.article-prose :not(pre) > code::before,
.article-prose :not(pre) > code::after {
  content: '' !important;
}

.article-prose .katex-display {
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
  overflow-x: auto;
  overflow-y: hidden;
}

.article-prose ::selection {
  background-color: color-mix(in srgb, var(--ui-primary, #2563eb) 20%, transparent);
}

.dark .article-prose ::selection {
  background-color: color-mix(in srgb, var(--ui-primary, #60a5fa) 30%, transparent);
}
```

- [ ] **Step 2: Keep mobile rules inside the allowed breakpoint**

Ensure `prose-custom.mobile.css` contains:

```css
/* 文章特殊内容兜底 - 移动端覆盖。全部规则必须位于允许的 max-width 断点内。 */

@media (max-width: 768px) {
  .article-prose {
    max-width: none;
    overflow-wrap: anywhere;
  }

  .article-prose--lg,
  .article-prose--xl,
  .article-prose--2xl {
    font-size: 1rem;
    line-height: 1.75;
  }

  .article-prose .katex-display {
    margin-top: 1rem;
    margin-bottom: 1rem;
  }

  .article-prose--legacy h1 {
    font-size: 1.875rem;
  }

  .article-prose--legacy h2 {
    font-size: 1.5rem;
  }

  .article-prose--legacy h3 {
    font-size: 1.25rem;
  }

  .article-prose--legacy pre,
  .article-prose--legacy th,
  .article-prose--legacy td {
    padding: 0.75rem;
  }
}
```

- [ ] **Step 3: Verify mobile breakpoint convention**

Run:

```powershell
Select-String -Path "nuxt-public/app/assets/css/components/prose-custom.mobile.css" -Pattern "@media"
```

Expected: only allowed `max-width: 768px` media rules are present.

## Task 4: Static Checks

**Files:**
- Read-only check across changed prose files.

- [ ] **Step 1: Search for old `.prose` selectors in `nuxt-public` custom prose CSS**

Run:

```powershell
Select-String -Path "nuxt-public/app/assets/css/components/prose-theme.css","nuxt-public/app/assets/css/components/prose-custom.desktop.css","nuxt-public/app/assets/css/components/prose-custom.mobile.css" -Pattern "\\.prose(\\s|\\.|:|$)"
```

Expected: no output. `nuxt-public` should use `.article-prose`, not old Tailwind Typography `.prose` selectors.

- [ ] **Step 2: Search for rejected dependency changes**

Run:

```powershell
Select-String -Path "nuxt-public/package.json","nuxt-public/nuxt.config.ts","nuxt-public/app/assets/css/tailwind.css","nuxt-public/app/assets/css/main.css" -Pattern "@tailwindcss/typography|typography"
```

Expected: no new `@tailwindcss/typography` plugin setup in `nuxt-public`. If existing unrelated user changes mention it, report them before editing package files.

- [ ] **Step 3: Run a Nuxt config/style sanity check**

Run:

```powershell
npm run generate
```

Working directory: `nuxt-public`

Expected: static generation completes, or fails for an existing API/network/prerender dependency unrelated to CSS syntax. If it fails on CSS parsing or Nuxt UI prose config, fix the implementation before proceeding.

## Task 5: Browser Verification

**Files:**
- No planned source edits unless visual verification exposes a bug.

- [ ] **Step 1: Start the static frontend dev server**

Run:

```powershell
npm run dev -- --host 127.0.0.1
```

Working directory: `nuxt-public`

Expected: Nuxt dev server prints a local URL. If the default port is occupied, use the printed alternate URL.

- [ ] **Step 2: Open an article page and verify core prose**

Use Chrome DevTools or a normal browser against an existing article route. Verify:

- Body text is centered and near 65ch on desktop.
- h2 has no gradient underline.
- Links are underlined but do not have a hover background by default.
- Blockquote is a prose left-border quote, not a card.
- Table is light bordered, not shadow/card styled.
- Code block remains readable with dark background.
- Image rounding is modest.

- [ ] **Step 3: Verify mobile width**

Use a viewport near 390px wide. Verify:

- `.article-prose` uses available mobile width.
- Text does not overflow.
- Code/table content scrolls instead of breaking layout.

## Commit Guidance

Because the implementation files already contain uncommitted work, commit only if the user confirms the whole current file state belongs to this task or after staging precise hunks.

Safe status command:

```powershell
git status --short
```

If committing only this task's hunks is safe:

```powershell
git add -p -- nuxt-public/app/app.config.ts nuxt-public/app/assets/css/components/prose-theme.css nuxt-public/app/assets/css/components/prose-custom.desktop.css nuxt-public/app/assets/css/components/prose-custom.mobile.css
git commit -m "style(nuxt-public): 调整文章排版为 Typography 风格"
```

If unrelated user edits are mixed in the same hunks, do not commit. Report the exact files and verification results.

## Self-Review

- Spec coverage: Tasks cover Nuxt UI Prose slots, article container width, legacy fallback, special-content guard rules, no Typography dependency migration, and verification.
- Placeholder scan: No placeholder or deferred implementation language is present.
- Type consistency: The plan uses existing files and selectors: `article-prose`, `article-prose--legacy`, `ui.prose`, and Nuxt UI slot keys.
