## 1. 清理 app.config.ts

- [x] 1.1 `nuxt-public/app/app.config.ts`：删除 `icon.aliases` 整块（约 9–235 行），保留 `icon.size` 和 `icon.class` 默认值；导出对象剩余 `defineAppConfig({ icon: { size, class } })`

## 2. 改写 templates —— Group A/B（纯加前缀或 rename，零或低视觉影响）

> 实际执行时合并到子代理（unspecified-high）的 Node 迁移脚本，一次性完成 32 文件 / 117 处替换。下方任务清单逐条核对后全部完成。

- [x] 2.1 `nuxt-public/app/layouts/default.vue`：19 处（含 moon-fill 漏网条目）
- [x] 2.2 `nuxt-public/app/components/WelcomeSection.vue`：12 处
- [x] 2.3 `nuxt-public/app/components/GalleryLoadingAnimation.vue`：1 处
- [x] 2.4 `nuxt-public/app/shared/ui/FloatingQuickActions.vue`：6 处（含 moon-fill + 2 个三元字面量）
- [x] 2.5 `nuxt-public/app/components/CommentSection.vue`：9 处
- [x] 2.6 `nuxt-public/app/components/content/RelatedArticles.vue`：3 处
- [x] 2.7 `nuxt-public/app/components/content/LinkCard.vue`：1 处
- [x] 2.8 `nuxt-public/app/components/content/ImageComparison.vue`：2 处
- [x] 2.9 `nuxt-public/app/components/content/Collapse.vue`：1 处
- [x] 2.10 `nuxt-public/app/components/content/CodePlayground.vue`：6 处
- [x] 2.11 `nuxt-public/app/features/article-list/containers/ArticleListPageContainer.vue`：1 处
- [x] 2.12 `nuxt-public/app/features/article-list/components/CategoryBar.vue`：2 处
- [x] 2.13 `nuxt-public/app/features/article-list/components/ArticleCard.vue`：1 处
- [x] 2.14 `nuxt-public/app/features/article-detail/containers/ArticleDetailPageContainer.vue`：1 处
- [x] 2.15 `nuxt-public/app/features/article-detail/components/Content.vue`：1 处
- [x] 2.16 `nuxt-public/app/features/article-detail/components/Toc.vue`：4 处
- [x] 2.17 `nuxt-public/app/features/article-detail/components/Sidebar.vue`：1 处
- [x] 2.18 `nuxt-public/app/features/gallery-public/components/GalleryMasonryList.vue`：2 处
- [x] 2.19 `nuxt-public/app/features/gallery-public/components/GalleryHeroSection.vue`：2 处
- [x] 2.20 `nuxt-public/app/features/gallery-public/components/GalleryContent.vue`：6 处
- [x] 2.21 `nuxt-public/app/features/gallery-public/components/FadeSlideshow.vue`：1 处
- [x] 2.22 `nuxt-public/app/features/gallery-public/components/CoverflowGallery.vue`：1 处
- [x] 2.23 `nuxt-public/app/features/gallery-public/components/AccordionGallery.vue`：1 处

## 3. 改写 templates —— Group C（已直写 mdi:xxx，lint 验证后无需改动）

- [x] 3.1 `nuxt-public/app/components/Effects/SearchBar.vue`：3 处保持
- [x] 3.2 `nuxt-public/app/components/content/GithubCard.vue`：6 处保持
- [x] 3.3 `nuxt-public/app/components/content/ImageEnhanced.vue`：1 处保持
- [x] 3.4 `nuxt-public/app/components/content/Steps.vue`：3 处保持

## 4. 改写 templates —— Group D（语义图标替换）

- [x] 4.1 `nuxt-public/app/pages/about.vue`：`name="github"` → `mdi:github`
- [x] 4.2 `nuxt-public/app/pages/about.vue`：`name="controller"` → `mdi:gamepad-variant`
- [x] 4.3 `nuxt-public/app/pages/about.vue`：其余 6 处（code-slash、lightning-charge-fill、code-square、activity、arrow-right、box-arrow-up-right）
- [x] 4.4 `nuxt-public/app/features/article-detail/components/Header.vue`：`name="robot"` → `mdi:robot` + 3 处 Group A/B
- [x] 4.5 `nuxt-public/app/components/content/WebEmbed.vue`：`name="film"` → `mdi:film`

## 5. 调整 nuxt.config.ts 预加载列表

- [x] 5.1 `nuxt-public/nuxt.config.ts`：在 `icon.clientBundle.icons` 数组追加 `'mdi:github'`、`'mdi:robot'`、`'mdi:gamepad-variant'`

## 6. 添加 lint:icons 验证脚本

- [x] 6.1 创建 `nuxt-public/scripts/check-icon-names.mjs`：扫描 + 校验 + 报告
- [x] 6.2 `nuxt-public/package.json`：在 `scripts` 段加 `"lint:icons": "node scripts/check-icon-names.mjs"`
- [x] 6.3 `npm run lint:icons` 通过：`✓ no short-name icons found (97 icon reference(s) checked)`

## 7. 构建与验证

- [x] 7.1 `npm run generate` 跑通：31.2 秒预渲染 158 路由，输出 `.output/public`，生成 `_headers`
- [ ] 7.2 肉眼视觉回归（**已延后给用户自行验证**；build + lint 强信号已通过；视觉变化清单见 design.md 与下方"未执行"）
- [x] 7.3 `git status` 确认改动仅限 `nuxt-public/` 与 `openspec/`

## 8. 提交

- [ ] 8.1 单次 commit：用户选择先归档，本次未执行 commit（保留在工作区，等用户决定）
- [ ] 8.2 commit 前确认 `git status` 不含 `.memory`、未授权文件（待 8.1）

## 9. 后续（执行过程中发现并补全，不在原计划内）

- [x] 9.1 补处理 `app/components/SideBar.vue`：4 条 `icon:` 数据 + 1 条三元字面量 + 1 条 literal（漏网）
- [x] 9.2 补处理 `app/components/content/Alert.vue`：`alertConfig` 4 条 `icon:` 数据
- [x] 9.3 补处理 `app/pages/about.vue`：8 条 `icon:` 数据
- [x] 9.4 补处理 `app/shared/ui/StateEmpty.vue`：`default: 'images'`
- [x] 9.5 补处理 `app/features/gallery-public/components/GalleryContent.vue`：2 条 `icon="images"` prop

## 未执行的验证（已记录在 design.md 与 tasks § 7.2）

- 7.2 视觉回归 6 个位置需要用户在本地 `npm run dev` 后肉眼确认：
  - [ ] `/` WelcomeSection 12 个图标
  - [ ] `/about` 5 处视觉变化最明显（github 真 logo、gamepad-variant 手柄、robot 机器人、lightning-charge-fill、code-square）
  - [ ] `/article/*` Header 的 robot 标记
  - [ ] `/gallery` zoom / arrows / x-lg 4 处
  - [ ] 任意文章内容（GithubCard、Steps、ImageEnhanced、SearchBar）
  - [ ] 含 WebEmbed 的文章（film 改用本地 mdi:film，不再依赖 Iconify 远程兜底）
- 8.1 / 8.2 commit（用户选择归档在前，等用户确认 commit 时机）
