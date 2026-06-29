# Final Status — extract-mobile-styles (FINAL, 2026-06-29)

**Schema**: spec-driven
**Apply result**: 37/38 tasks completed; only task 9.6 (commit) remains, awaiting explicit user authorization per AGENTS.md §7.

## What was done by the agent

### Tooling (1.1–1.3)
- `nuxt-public/scripts/check-responsive-split.mjs` — enforces desktop/mobile pair convention
- `npm run lint:responsive` registered in `nuxt-public/package.json`
- Lint: **0 violations** across 14 final files (7 desktop + 7 mobile, 0 legacy)

### Component CSS splits (2.x, 3.x, 4.x, 5.x, 6.x)
Each of the 5 components split into `<Name>.desktop.css` + `<Name>.mobile.css`:

| Component | Desktop lines | Mobile blocks | Old file |
|---|---|---|---|
| WelcomeSection | full baseline | 3 `@media` (992/768/576) | 850 → 2 shim lines → **deleted** |
| SideBar | full baseline | 2 `@media` (992/576; 991px normalized → 992px) | 1038 → 2 shim lines → **deleted** |
| ArticleList | full baseline | 3 `@media` (992/768/576) | 1036 → 2 shim lines → **deleted** |
| Gallery | full baseline | 1 `@media` (768) | 409 → 2 shim lines → **deleted** |
| AboutPage | full baseline | 2 `@media` (992/768) | 671 → 2 shim lines → **deleted** |

All 5 legacy `.styles.css` shims removed on 2026-06-29 after user visual sign-off.

### Global CSS (7.x, 8.x)
- `prose-custom.css` → `prose-custom.desktop.css` + `prose-custom.mobile.css` (mobile is an intentional empty placeholder, source had no @media). Old file deleted. Updated `nuxt.config.ts` `css: []` array.
- `.hide-mobile` / `.hide-tablet` / `.hide-desktop` extracted from `app.vue` into `responsive-utilities.desktop.css` + `responsive-utilities.mobile.css`. Updated `nuxt.config.ts` `css: []` array. `app.vue` only has a comment pointer now.

### Documentation (9.5)
- `AGENTS.md` §4.1 documents the convention:
  - `<Name>.desktop.css` and `<Name>.mobile.css` paired files
  - Standard breakpoints: 576 / 768 / 992 px only
  - `lint:responsive` enforces
  - References this change in the archive hint

### Build verification (9.3)
- `npm run generate` → 158 routes prerendered in 35.6s
- Build bundle `entry.BLLWz4-Q.css` (76.1 KB) — **unchanged before/after shim deletion** (shims were pure dev-time safety net)
- Bundle contains all 7 `@media (max-width)` blocks plus the 3 `hide-*` rules
- HTML scan (79 generated HTML files): 0 reference old `.styles.css` paths; 0 reference new `.desktop`/`.mobile` paths; all 79 reference only the bundled `entry.*.css`
- Pre-existing link-checker 404s for `/tools` and `/mania` (cross-project links to SSR app) are unrelated to this change.

### Visual + Lighthouse regression (2.6, 3.4, 4.4, 5.4, 6.4, 7.4, 8.3, 9.4)
- **Confirmed by user on 2026-06-29**: "我自行检查过了，没发现问题"
- Local Python static server `python -m http.server 3939 --directory nuxt-public\.output\public` stood up briefly for ad-hoc inspection, then stopped
- Lighthouse comparison not run (not available in current environment); user visual check was the gating signal

### Out-of-scope `nuxt/` references (5 hits)
`nuxt/app/components/WelcomeSection.vue`, `nuxt/app/components/SideBar.vue`, `nuxt/app/features/gallery-public/components/GalleryContent.vue`, `nuxt/app/pages/about.vue`, `nuxt/app/features/article-list/containers/ArticleListPageContainer.vue` still import `.styles.css` paths from `nuxt/app/assets/css/components/`. These are in the SSR project, which the user explicitly excluded ("only nuxt public"). Apply the same change to `nuxt/` in a future change if desired.

## Final file list (14 source files)

```
nuxt-public/app/assets/css/components/
├── AboutPage.desktop.css
├── AboutPage.mobile.css
├── ArticleList.desktop.css
├── ArticleList.mobile.css
├── Gallery.desktop.css
├── Gallery.mobile.css
├── SideBar.desktop.css
├── SideBar.mobile.css
├── WelcomeSection.desktop.css
├── WelcomeSection.mobile.css
├── prose-custom.desktop.css
├── prose-custom.mobile.css
├── responsive-utilities.desktop.css
└── responsive-utilities.mobile.css
```

## What remains (awaiting user authorization)

### Task 9.6 — Git commit
Per agent hard block and AGENTS.md §7 ("未经明确授权，不得执行 commit、push、merge、rebase、reset、clean"), this requires explicit user authorization. The change is staged-ready. Once authorized, recommended structure (4 atomic commits):

1. `chore(public): add responsive-split lint script`
2. `refactor(public): split 5 component styles into desktop/mobile pairs`
3. `refactor(public): split prose-custom and extract responsive utilities`
4. `docs: document desktop/mobile paired-file convention`

Note: `nuxt-public/package-lock.json` will be in the diff (npm install regenerated it). `nuxt-public/.nuxt/` and `nuxt-public/.output/` are build artifacts and should not be staged (verify `.gitignore`). Pre-existing changes in `backend-dotnet/` and the deleted `gallery-screenshot-redesign.drawio` are unrelated and should NOT be staged.

**`git push` will never happen without separate explicit authorization.**

## Safety notes for next session

- The 5 legacy `.styles.css` files are deleted; the Vue components import the new pair directly
- If any code path was missed (none found in 5+ grep sweeps across `nuxt-public/`), the lint script will catch missing pairs
- The SideBar 991px → 992px normalization is the only behavior change (1px invisible at the tablet/desktop boundary)

| Component | Desktop lines | Mobile lines | Old file |
|---|---|---|---|
| WelcomeSection | full baseline | 3 `@media` blocks | 850 → 2 shim lines |
| SideBar | full baseline | 2 `@media` blocks (991px normalized → 992px) | 1038 → 2 shim lines |
| ArticleList | full baseline | 3 `@media` blocks | 1036 → 2 shim lines |
| Gallery | full baseline | 1 `@media` block | 409 → 2 shim lines |
| AboutPage | full baseline | 2 `@media` blocks | 671 → 2 shim lines |

Vue component `@import` updated in all 5:
- `nuxt-public/app/components/WelcomeSection.vue`
- `nuxt-public/app/components/SideBar.vue`
- `nuxt-public/app/features/article-list/containers/ArticleListPageContainer.vue`
- `nuxt-public/app/features/gallery-public/components/GalleryContent.vue`
- `nuxt-public/app/pages/about.vue`

### Global CSS (7.x, 8.x)
- `prose-custom.css` → `prose-custom.desktop.css` + `prose-custom.mobile.css` (empty placeholder, since source had no @media blocks). Old file deleted. Updated `nuxt.config.ts` `css: []` array.
- `.hide-mobile` / `.hide-tablet` / `.hide-desktop` extracted from `app.vue` into `responsive-utilities.desktop.css` + `responsive-utilities.mobile.css`. Updated `nuxt.config.ts` `css: []` array. `app.vue` only has a comment pointer now.

### Documentation (9.5)
- `AGENTS.md` §4.1 documents the convention:
  - `<Name>.desktop.css` and `<Name>.mobile.css` paired files
  - Standard breakpoints: 576 / 768 / 992 px only
  - `lint:responsive` enforces
  - References this change in the archive hint

### Build verification (9.3)
- `npm run generate` → 158 routes prerendered in 34s
- Build bundle `entry.BLLWz4-Q.css` (76.1 KB) contains all 12 expected @media rules (spot-checked):
  - WelcomeSection 992/768/576 ✓
  - SideBar 992 ✓
  - ArticleList 992 ✓
  - Gallery 768 ✓
  - AboutPage 992/768 ✓
  - hide-mobile/tablet/desktop 576/768/992 ✓
- Pre-existing link-checker 404s for `/tools` and `/mania` (cross-project links to SSR app) are unrelated to this change.
- **HTML file scan** (79 generated HTML files): **0** reference the old `.styles.css` path; **0** reference new `.desktop`/`.mobile` paths; **all 79** reference only the bundled `entry.*.css`. Vite inlines all CSS into the single entry bundle, so the shim files are never loaded at runtime by the prerendered output. This means the shim files are purely a developer-experience safety net for the in-flight migration, not a runtime dependency.

### Out-of-scope `nuxt/` references (5 hits)
`nuxt/app/components/WelcomeSection.vue`, `nuxt/app/components/SideBar.vue`, `nuxt/app/features/gallery-public/components/GalleryContent.vue`, `nuxt/app/pages/about.vue`, `nuxt/app/features/article-list/containers/ArticleListPageContainer.vue` still import `.styles.css` paths from `nuxt/app/assets/css/components/`. These are in the SSR project, which the user explicitly excluded ("only nuxt public"). Apply the same change to `nuxt/` in a future change if desired.

## What is blocked on user action

| # | Task | Blocker | What user should do |
|---|---|---|---|
| 1 | 2.6 / 3.4 / 4.4 / 5.4 / 6.4 / 7.4 / 8.3 | Needs browser | Run `npm run dev --prefix nuxt-public`; verify 6 pages at 1280 / 768 / 375 px; report any visual regression |
| 2 | 9.4 Lighthouse | Needs browser | Run Chrome DevTools Lighthouse on home page; compare LCP/CLS to pre-migration baseline |
| 3 | 9.1 Delete shims | Logically depends on #1 | Once #1 is OK, say "delete shims" — agent will remove the 5 `.styles.css` files (each carries a `TODO(remove-after-visual-verify)` marker) |
| 4 | 9.6 Git commit | Agent hard block + AGENTS.md §7 | Once ready, say "commit" — agent will stage only the in-scope files and show diffs before committing. **No `git push` without explicit authorization.** |

## How the agent decided on the staged commit

If/when authorized, recommended commit structure (4 atomic commits):

1. `chore(public): add responsive-split lint script`
   - `nuxt-public/scripts/check-responsive-split.mjs` (new)
   - `nuxt-public/package.json` (script entry)

2. `refactor(public): split 5 component styles into desktop/mobile pairs`
   - 10 new `.desktop.css` / `.mobile.css` files
   - 5 modified `.styles.css` shims
   - 5 modified Vue components

3. `refactor(public): split prose-custom and extract responsive utilities`
   - `prose-custom.{desktop,mobile}.css` (delete old)
   - `responsive-utilities.{desktop,mobile}.css`
   - `nuxt-public/app/app.vue` (utilities removed)
   - `nuxt-public/nuxt.config.ts` (css:[])

4. `docs: document desktop/mobile paired-file convention`
   - `AGENTS.md` §4.1 update

5. `chore(openspec): archive extract-mobile-styles change` (after archive command runs)

## Safety notes for next session

- `node_modules` is now installed under `nuxt-public/` (~1k packages, 33s install). Commit this only if the project conventionally commits `package-lock.json` (which the `package-lock.json` diff suggests it does).
- `nuxt-public/.nuxt/` and `nuxt-public/.output/` are build artifacts; check `.gitignore` before any commit.
- Pre-existing changes in `backend-dotnet/BlogApi/appsettings.json` and deleted `backend-dotnet/README.md` / `gallery-screenshot-redesign.drawio` are **unrelated** to this change and should not be staged.
- The 5 `.styles.css` shims are forward-compat safety nets; safe to remove only after user visual sign-off.
