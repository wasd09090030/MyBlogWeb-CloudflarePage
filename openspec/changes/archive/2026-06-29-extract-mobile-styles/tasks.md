## 1. Tooling & Foundation

- [x] 1.1 Add `nuxt-public/scripts/check-responsive-split.mjs` script that scans `nuxt-public/app/assets/css/components/` and fails on: mixed `.styles.css` containing `@media` blocks, `.desktop.css` containing `@media (max-width: ...)`, `.mobile.css` containing unwrapped rules, non-standard breakpoint values, or missing pair files.
- [x] 1.2 Register `npm run lint:responsive` in `nuxt-public/package.json` `scripts` field.
- [x] 1.3 Run the script once against the current codebase to confirm it reports the expected 6 mixed files as violations before any code is touched.

## 2. WelcomeSection Migration (highest LCP impact)

- [x] 2.1 Read `nuxt-public/app/assets/css/components/WelcomeSection.styles.css` and split the file: top-level rules go to `WelcomeSection.desktop.css`; the three `@media (max-width: 992px|768px|576px)` blocks go to `WelcomeSection.mobile.css`.
- [x] 2.2 Create `nuxt-public/app/assets/css/components/WelcomeSection.desktop.css` with the desktop baseline.
- [x] 2.3 Create `nuxt-public/app/assets/css/components/WelcomeSection.mobile.css` with the three `@media` blocks.
- [x] 2.4 Replace the `@import '~/assets/css/components/WelcomeSection.styles.css';` in `nuxt-public/app/components/WelcomeSection.vue` (around line 259) with two imports: desktop first, mobile second.
- [x] 2.5 Replace the body of `WelcomeSection.styles.css` with `@import './WelcomeSection.desktop.css'; @import './WelcomeSection.mobile.css';` so the legacy file becomes a thin re-export during the migration window.
- [ ] 2.6 Run `npm run dev` in `nuxt-public/`, open the home page in Chrome DevTools at 1280px / 768px / 375px, and confirm visual parity against the pre-migration screenshot.

## 3. SideBar Migration (global layout)

- [x] 3.1 Split `SideBar.styles.css` into `SideBar.desktop.css` + `SideBar.mobile.css` following the same convention.
- [x] 3.2 Update the `@import` in `nuxt-public/app/components/SideBar.vue` (around line 216) to import both paired files in order.
- [x] 3.3 Convert the old `SideBar.styles.css` into a re-export of the two new files.
- [ ] 3.4 Verify every page using the SideBar renders correctly at 1280px / 768px / 375px.

## 4. ArticleList Migration

- [x] 4.1 Split `ArticleList.styles.css` into `ArticleList.desktop.css` + `ArticleList.mobile.css`.
- [x] 4.2 Update the `@import` in `nuxt-public/app/features/article-list/containers/ArticleListPageContainer.vue` (around line 363) to import both paired files.
- [x] 4.3 Convert the old `ArticleList.styles.css` into a re-export of the two new files.
- [ ] 4.4 Verify the article list page at 1280px / 768px / 375px.

## 5. Gallery Migration

- [x] 5.1 Split `Gallery.styles.css` into `Gallery.desktop.css` + `Gallery.mobile.css`.
- [x] 5.2 Update the `@import` in `nuxt-public/app/features/gallery-public/components/GalleryContent.vue` (around line 219) to import both paired files.
- [x] 5.3 Convert the old `Gallery.styles.css` into a re-export of the two new files.
- [ ] 5.4 Verify the gallery page (both artwork and game screenshot tabs) at 1280px / 768px / 375px.

## 6. AboutPage Migration

- [x] 6.1 Split `AboutPage.styles.css` into `AboutPage.desktop.css` + `AboutPage.mobile.css`.
- [x] 6.2 Update the `@import` in `nuxt-public/app/pages/about.vue` (around line 380) to import both paired files.
- [x] 6.3 Convert the old `AboutPage.styles.css` into a re-export of the two new files.
- [ ] 6.4 Verify the about page at 1280px / 768px / 375px.

## 7. Prose-Custom Migration (global, via nuxt.config)

- [x] 7.1 Split `prose-custom.css` into `prose-custom.desktop.css` + `prose-custom.mobile.css` (the file currently has a single `@media (max-width: 576px)` block). NOTE: actual file had no @media blocks; created empty mobile placeholder + full desktop.
- [x] 7.2 Update the `css: []` array in `nuxt-public/nuxt.config.ts` (around lines 23-28) to list the desktop file before the mobile file in place of `prose-custom.css`.
- [x] 7.3 Delete the old `prose-custom.css` (or leave empty; this is a global file, no Vue component to keep a re-export in).
- [ ] 7.4 Verify article detail page prose rendering at 1280px / 375px.

## 8. Global Responsive Utility Migration

- [x] 8.1 Extract the three `.hide-mobile` / `.hide-tablet` / `.hide-desktop` blocks from `nuxt-public/app/app.vue` (lines 231-247) into `responsive-utilities.desktop.css` and `responsive-utilities.mobile.css`.
- [x] 8.2 Add the two new utility files to the `css: []` array in `nuxt.config.ts`, removing the inlined blocks from `app.vue`.
- [ ] 8.3 Verify the utility classes still hide/show correctly at all three breakpoints.

## 9. Cleanup & Documentation

- [ ] 9.1 Delete the 6 now-empty `.styles.css` files (WelcomeSection, SideBar, ArticleList, Gallery, AboutPage) once their re-exports are confirmed working. (DEFERRED: keeping as compat shim until user confirms visual parity; safe to remove in a follow-up commit.)
- [x] 9.2 Run `npm run lint:responsive` and confirm zero violations.
- [x] 9.3 Run `npm run generate` in `nuxt-public/` to confirm SSG build succeeds. (158 routes prerendered successfully; the link-checker 404s for /tools and /mania are pre-existing, not caused by this change.)
- [ ] 9.4 Run Chrome DevTools Lighthouse on the home page and confirm no regression in LCP / CLS compared to the pre-migration baseline. (DEFERRED: user visual verification.)
- [x] 9.5 Update `AGENTS.md` "编码与风格约定" and the relevant README sections to document the desktop/mobile paired-file convention.
- [ ] 9.6 Git commit per component (or per logical group) with messages following the repo style: e.g., `refactor(public): split WelcomeSection styles into desktop/mobile pair`. (DEFERRED: requires explicit user authorization for git operations.)
