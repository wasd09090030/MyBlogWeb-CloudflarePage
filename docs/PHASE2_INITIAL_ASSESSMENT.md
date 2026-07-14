# 阶段二初步评估（职责拆分与收敛）

## 评估范围
- 前端 `app/` 目录中的 feature 边界、API 调用入口、缓存策略与错误处理风格。
- 本评估基于当前已完成迁移（`article-list` / `article-detail` / `article-admin` / `gallery-public` / `gallery-admin`）。

## 当前结论（初步）
- **Feature 边界**：已达到“按页面拆分”目标，列表页、详情页、管理页的核心代码路径已分离。
- **API 边界**：文章详情 API 已从列表 API 中分离（`article-detail/services/articleDetail.repository.ts`），方向正确。
- **兼容策略**：旧 `app/composables/useX` 入口保留转发，迁移风险可控。
- **结果模型**：已引入 shared `AppResult<T>`，article/gallery/admin 均提供统一 Result 返回入口。

## 发现的问题（阶段二关注点）
1. **API 客户端仍不统一**
   - 现象：`resolveApiBaseURL` 已存在，但 `auth.ts`、`useArticleNavigation` 等处仍有重复 `useRuntimeConfig().public.apiBase` 逻辑。
   - 风险：URL 规则变更时需要多点修改，容易不一致。

2. **错误处理模式分散**
   - 现象：大量 `try/catch + console.error + throw error` 在多个 feature 重复。
   - 风险：用户提示不一致，日志格式不统一，排障效率低。

3. **缓存策略分散**
   - 现象：文章缓存（`useArticleCache`）与画廊缓存（`useGalleryFeature`）各自实现。
   - 风险：TTL、并发去重、失效策略难统一，后续治理成本高。

4. **Feature 内部仍有“超域依赖”潜在点**
   - 现象：部分旧工具/composable 仍在 `app/composables` 与 feature 并存。
   - 风险：新开发继续走旧路径，会削弱拆分收益。

## 建议优先级（建议 2 周内完成）
### P0（本周）
- 建立 `app/shared/api/client.ts`：统一公开 `$fetch`、鉴权 `authFetch`、错误包装。
- 在 `auth.ts`、`useArticleNavigation`、各 feature repository 中收敛到统一 client/baseURL。

### P0 进度（已完成）
- [x] 新增统一 API 客户端：[nuxt/app/shared/api/client.ts](nuxt/app/shared/api/client.ts)
- [x] `article-list` repository 已切换到 shared api client
- [x] `article-detail` repository 已切换到 shared api client
- [x] `gallery-public` composable 已切换到 shared api client，并引入统一错误包装入口
- [x] `stores/auth.ts` 已收敛到 shared api client，移除重复 `runtimeConfig.apiBase` 拼接
- [x] `useArticleNavigation.ts` 已改为复用 shared api client（移除 `getApiBase`）
- [x] `gallery-admin`、`article-admin` composables 已接入统一错误包装入口并收敛请求调用风格

### P0 待完成
- [ ] 评估是否将 auth 场景升级为 `$fetch.create` 插件注入（当前为 shared client + `authFetch`）

### P1（下周）
- 建立 `app/shared/cache` 基础模块：
  - `createTimedCacheState(key, ttl)`
  - `withInFlightDedup(key, fn)`
- 将 article/gallery 缓存逐步迁移到 shared cache 模块。

### P1 进度（已完成）
- [x] 新增 shared cache 基础模块：[nuxt/app/shared/cache/index.ts](nuxt/app/shared/cache/index.ts)
- [x] `useArticleCache` 已迁移到 `createTimedCacheState + withInFlightDedup`
- [x] `gallery-public/useGalleryFeature` 已迁移到 `createTimedCacheState + withInFlightDedup`
- [x] `articlePreloadCache.ts` 已迁移到 shared cache（`createTimedMapCache`）
- [x] `workerPrefetch.client.ts` 已迁移到 shared cache（TTL + in-flight 去重）

### P1 待完成
- [ ] 评估是否需要将非业务缓存（如 workerManager 内部队列状态）纳入 shared/cache 统一抽象

### P2（后续）
- 建立 `app/shared/errors`：统一错误类型（网络错误、业务错误、权限错误）。
- 在页面层统一错误展示映射（Toast/Alert 文案一致）。

### P2 进度（已完成）
- [x] 新增错误收敛模块：[nuxt/app/shared/errors/index.ts](nuxt/app/shared/errors/index.ts)
- [x] `article-detail` 链路已接入统一错误映射（`toNuxtErrorPayload + logAppError`）
- [x] `gallery.vue` 已接入统一用户错误文案映射（`mapErrorToUserMessage`）

### P2 待完成
- [ ] 将 `article-list` / `article-admin` / `gallery-admin` 的页面层错误展示逐步接入 `shared/errors`
- [ ] 统一主要管理页的 Toast/Alert 文案模板与错误级别映射规则

## 目标验收（阶段二）
- 任一 feature 的 API 调用不直接读取 `runtimeConfig`，统一通过 shared api client。
- 至少 80% 新增/修改请求都走 `repository -> composable -> page` 链路。
- 缓存策略可配置（TTL、去重、失效）且在 article/gallery 复用。
- 主要页面错误展示风格统一，日志字段一致（模块名/动作/错误码）。
- feature 间不直接互相引用内部文件（仅允许 feature 内部自引用与 shared 依赖）。

## 阶段2补充进展（本轮）
- [x] 新增统一 Result 类型：[nuxt/app/shared/types/result.ts](nuxt/app/shared/types/result.ts)
- [x] `article-list` / `gallery-public` / `article-admin` / `gallery-admin` 已提供 Result 风格返回入口
- [x] `useArticleCache` 实现迁入 feature 内部：[nuxt/app/features/article-list/composables/useArticleCacheFeature.ts](nuxt/app/features/article-list/composables/useArticleCacheFeature.ts)
- [x] 旧入口保持兼容转发：[nuxt/app/composables/useArticleCache.ts](nuxt/app/composables/useArticleCache.ts)
- [x] features 目录扫描已无跨 feature 直接引用

## 低风险实施顺序（建议）
1. 先引入 shared api client，不改页面逻辑，仅替换 repository 内部调用。
2. 再替换缓存实现为 shared cache（保留同名对外 API）。
3. 最后统一错误映射和提示文案。
