# Nuxt 前端迁移清单（结构清晰化 / 功能边界化 / 组件独立化）

## 阶段 0：基线与约束（1 天）
- [ ] 明确目录约束：页面仅编排，业务逻辑进入 feature composables，数据请求进入 feature services。
- [ ] 统一命名规范：`features/<domain>/{components,composables,services,types}`。
- [ ] 定义共享层：`app/shared/{ui,api,utils,types}`。
- [ ] 建立迁移规则：旧路径保留兼容导出，先迁后删。

## 阶段 1：低风险目录迁移（2~3 天）
- [x] 建立按页面拆分的文章 feature：`features/article-list`、`features/article-detail`、`features/article-admin`。
- [x] 将 `useArticles` 核心逻辑迁移到 `features/article-list/composables/useArticlesFeature`。
- [x] 将列表页 API 收敛到 `features/article-list/services/articles.repository`。
- [x] 页面中新增逻辑优先使用 feature 路径，不再直接增强旧 composable。
- [x] 将 `components/ArticleList/*` 迁移到 `features/article-list/components/*`。
- [x] 将 `functions/ArticleList/*` 迁移到 `features/article-list/utils/*`。
- [x] 将 `useAdminArticles` 迁移到 `features/article-admin/composables/useAdminArticlesFeature`，旧入口兼容转发。
- [x] 将 `useAdminComments` 迁移到 `features/article-admin/composables/useAdminCommentsFeature`，旧入口兼容转发。
- [x] 将文章详情页业务逻辑下沉到 `features/article-detail/composables/useArticleDetailPage`。
- [x] 将 `components/ArticleDetail/*` 迁移到 `features/article-detail/components/*` 并改为显式导入。
- [x] 将详情页 API 独立到 `features/article-detail/services/articleDetail.repository`。
- [x] 建立画廊域 feature 基础层：`features/gallery/composables` 与 `features/gallery/utils`。
- [x] 将 gallery 按页面拆分为 `features/gallery-public` 与 `features/gallery-admin`。
- [x] 将 `useGallery` 迁移到 `features/gallery-public/composables/useGalleryFeature`，旧入口保持兼容转发。
- [x] 将 `functions/Gallery/*` 迁移到 `features/gallery-public/utils/*` 并完成页面引用切换。
- [x] 将 `components/gallery/*` 迁移到 `features/gallery-public/components/*` 并完成页面引用切换。
- [x] 将 `useAdminGallery` 迁移到 `features/gallery-admin/composables/useAdminGalleryFeature`，旧入口兼容转发。

## 阶段 2：职责拆分与收敛（3~5 天）
- [x] 统一 API 客户端入口（baseURL、错误映射、重试策略）。
- [x] 将缓存策略从业务 composable 中拆分为独立 cache 模块（可替换）。
- [x] 为 article/gallery/admin 各自建立统一返回类型（Result 或 DTO）。
- [x] 清理跨域依赖：feature 之间不直接互相引用内部文件。

## 阶段 3：组件独立化（3~5 天）
- [x] 容器/展示组件分离：容器负责数据，展示组件仅 props/emits。（首批已完成：gallery、article-detail）
- [x] 共用 UI 组件下沉到 `shared/ui`（如 Loading、Skeleton、Empty、Error）。（首批已完成：gallery 的 Loading/Error/Empty）
- [x] 为关键通用组件补充最小文档（输入、输出、示例）。（首批已完成：`shared/ui` 状态组件）

### 阶段 3 增量进展（持续）
- [x] `article-detail` 的加载/错误/空态已接入 `shared/ui`。
- [x] `index` 首屏 ArticleList 已拆为 feature 容器：`features/article-list/containers/ArticleListPageContainer.vue`。
- [x] WelcomeSection 首屏入口已收敛到 feature 路径：`features/home/components/HomeWelcomeSection.vue`（layout 已切换）。
- [x] 入口收敛升级为实现收敛：已删除 `app/composables` 中 `useArticles/useGallery/useAdmin*/useArticleCache` 薄封装文件并完成引用切换。
- [x] 教程页已容器化为 `features/tutorials/containers/TutorialsPageContainer.vue`，并将 `app/functions/Tutorials/*` 迁移到 `features/tutorials/utils/*`。
- [x] 后台重页已容器化：`admin/gallery/index`、`admin/articles/[id]` 页面降为薄入口。
- [x] API 端点统一收敛到 `app/shared/api/endpoints.ts`，首批链路去除散落硬编码端点。
- [x] Worker composable 已完成工厂化收敛：公共模板下沉到 `app/utils/workers/composableFactory.ts`。
- [x] 状态组件已收敛到 `shared/ui`，旧 `LoadingSpinner/SkeletonLoader` 转为兼容壳并标注移除条件。
- [x] 缓存 key 已统一到 `app/shared/cache/keys.ts`，并对齐 Worker 预取写回与详情页读取规则。

## 阶段 4：长期治理（持续）
- [ ] 将可复用能力沉淀为 `layers/`（主题、通用文章能力等）。
- [ ] 按月清理旧兼容导出，减少双路径维护成本。
- [ ] 将 `nuxt.config.ts` 拆分为主题、SEO、构建、缓存策略等可维护模块（可通过本地 module 或配置工厂）。

## 验收标准
- [ ] 新功能开发仅需改动单一 feature 域（不跨 3 个以上顶层目录）。
- [ ] 页面文件行数和复杂度持续下降（页面只保留编排逻辑）。
- [ ] 组件复用时不依赖具体页面上下文。
- [ ] 迁移阶段中无功能回归（首页文章、分类、详情、搜索保持可用）。