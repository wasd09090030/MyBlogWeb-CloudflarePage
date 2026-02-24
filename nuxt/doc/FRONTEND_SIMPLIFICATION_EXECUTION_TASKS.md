# 前端简化改造执行清单（组件 / API / Worker）

> 用途：将已确认 DRAFT 转换为“实施代理可直接开工”的任务清单。
> 范围：集中式改造，覆盖组件层、API 调用层、Worker 层。
> 首批页面：`app/pages/admin/gallery/index.vue`、`app/pages/admin/articles/[id].vue`。

---

## 0. 执行约束（开工前必读）

- [ ] **仅改任务范围文件**：避免顺手修复无关问题，降低回归面。
- [ ] **小步提交可回滚**：每个任务单元都可独立回退。
- [ ] **页面保持薄入口**：`pages/*` 仅负责路由参数与容器装配。
- [ ] **统一注释标准（完整注释）**：
  - 必写“为什么”（设计取舍、历史兼容、边界条件）。
  - 必写“失败策略”（重试、超时、降级、用户提示来源）。
  - 必写“协议语义”（Worker 消息字段、API 结果字段含义）。

---

## 1. 目录与边界清单（先建立，再实施）

### 1.1 组件边界
- `app/pages/*`：只做编排，不写业务状态机与请求细节。
- `app/features/*/containers`：页面容器，负责状态编排与事件路由。
- `app/features/*/composables`：业务逻辑与副作用。
- `app/shared/ui`：跨域复用状态组件（Loading/Error/Empty）。

### 1.2 API 边界
- `app/shared/api/client.ts`：统一请求入口（基础配置、拦截、错误归一）。
- `app/features/*/services`：按业务封装 endpoint 与 DTO 映射。
- 页面层禁止新增 `$fetch/fetch` 直写。

### 1.3 Worker 边界
- `app/utils/workers/types.ts`：统一消息协议与任务类型。
- `app/utils/workers/workerManager.ts`：统一创建、超时、销毁策略。
- `app/composables/use*Worker.ts`：仅保留轻薄调用壳，公共逻辑下沉工厂。

---

## 2. 实施批次（可直接执行）

## 批次 A：后台页面容器化（高优先）

### A-1 `admin/gallery/index` 变薄

**目标文件**
- `app/pages/admin/gallery/index.vue`
- `app/features/gallery-admin/containers/*`（若不存在则新增）
- `app/features/gallery-admin/composables/useAdminGalleryFeature.ts`

**执行步骤**
- [x] 将页面内数据加载、提交、错误处理、提示文案组装迁移到 feature 容器/composable。
- [x] 页面保留：路由参数、容器挂载、极少量 UI 编排。
- [x] 页面中所有直接请求调用替换为 feature service/composable 调用。

**注释要求（必须）**
- [x] 在容器入口写明“为何容器化”（降低 `pages` 复杂度 + 便于回归）。
- [x] 在关键动作（保存、排序、删除）写明“失败后的降级行为”。

**验收标准**
- [x] `index.vue` 行为与现状一致，页面逻辑显著减少。
- [ ] 功能回归通过：列表加载、创建、更新、删除、排序。

**回滚点**
- [ ] 保留原页面逻辑快照（单次提交可逆），异常时回退本批次提交。

---

### A-2 `admin/articles/[id]` 变薄

**目标文件**
- `app/pages/admin/articles/[id].vue`
- `app/features/article-admin/containers/*`（若不存在则新增）
- `app/features/article-admin/composables/useAdminArticlesFeature.ts`

**执行步骤**
- [x] 下沉编辑页状态机：加载、草稿、保存、发布、AI 摘要、异常提示。
- [x] 页面保留路由参数解析与容器挂载。
- [x] AI 摘要调用统一走 feature service，不允许页面直调 endpoint。

**注释要求（必须）**
- [x] 解释 AI 摘要 endpoint 兼容策略（历史端点差异与最终统一目标）。
- [ ] 解释保存流程的防抖/并发保护策略（若存在）。

**验收标准**
- [ ] 编辑、保存、AI 摘要、错误提示行为与改造前一致。
- [x] 页面不再出现大段请求与错误映射细节。

**回滚点**
- [ ] 若摘要或保存异常，单独回滚 A-2，不影响 A-1。

---

## 批次 B：API 调用统一（高优先）

### B-1 统一请求入口与 endpoint 定义

**目标文件**
- `app/shared/api/client.ts`
- `app/features/article-admin/services/*`
- `app/features/gallery-admin/services/*`
- `app/features/gallery-public/composables/useGalleryFeature.ts`

**执行步骤**
- [x] 统一 API 调用通过 shared client（含鉴权链路）。
- [x] 将关键 endpoint 提取为常量映射，移除散落字符串。
- [x] 修正端点漂移：重点核对 `gallery` 与 `ai summary`。

**注释要求（必须）**
- [x] 在 endpoint 映射处标注“后端对齐来源”。
- [x] 在 client 统一入口标注“错误归一化策略与用户提示边界”。

**验收标准**
- [x] 首批页面链路不再出现页面层 `$fetch/fetch` 直写。
- [x] 鉴权失败、业务失败、网络失败提示语义一致。

**回滚点**
- [x] endpoint 常量化独立提交，可单独回退。

---

### B-2 统一返回类型与错误语义

**目标文件**
- `app/shared/errors/*`
- `app/shared/types/*`
- `app/features/*/services/*`（首批页面相关服务优先）

**执行步骤**
- [x] 确定统一 Result 结构（成功/失败/可展示信息）。
- [ ] 统一服务层抛错/返回策略，页面仅消费统一结果。
- [x] 清理页面层重复 try/catch 文案拼接。

**注释要求（必须）**
- [x] 在 Result 类型定义处说明字段语义与使用边界。
- [x] 在错误映射逻辑说明“为什么在此层处理而非页面层”。

**验收标准**
- [x] 关键路径提示文案一致，错误分层清晰。
- [x] 首批页面基本无重复错误处理模板代码。

---

## 批次 C：Worker 封装工厂化（中高优先）

### C-1 抽离 Worker composable 通用工厂

**目标文件**
- `app/utils/workers/workerManager.ts`
- `app/utils/workers/types.ts`
- `app/composables/useMarkdownWorker.ts`
- `app/composables/useSearchWorker.ts`
- `app/composables/useImageProcessorWorker.ts`
- `app/composables/useImagePreloadWorker.ts`
- `app/composables/useExportWorker.ts`

**执行步骤**
- [x] 提炼公共模板：manager 获取、任务发送、超时、fallback、dispose。
- [x] 各 `use*Worker` 仅保留任务参数适配与返回值转换。
- [x] 统一超时等级（短/中/长任务）并在调用点声明。

**注释要求（必须）**
- [x] 协议注释：消息字段含义、可选字段默认值、错误回传格式。
- [x] 生命周期注释：何时释放、为何采用当前策略（singleton/refCount）。
- [x] 降级注释：主线程 fallback 的触发条件与用户可见影响。

**验收标准**
- [x] `use*Worker` 文件重复模板显著减少。
- [x] worker 超时/异常路径行为一致且可预测。

**回滚点**
- [x] 工厂引入与单个 worker 改造分提交，失败可逐个回退。

---

## 批次 D：状态组件收敛（中优先）

### D-1 Loading/Error/Empty 统一入口

**目标文件**
- `app/shared/ui/StateLoading.vue`
- `app/shared/ui/StateError.vue`
- `app/shared/ui/StateEmpty.vue`
- `app/components/LoadingSpinner.vue`
- `app/components/SkeletonLoader.vue`
- 首批页面/容器引用点

**执行步骤**
- [x] 明确共享状态组件为唯一推荐入口。
- [x] 替换首批页面及相关容器的旧状态组件引用。
- [x] 旧组件若保留，增加“过渡期兼容”标识与移除计划。

**注释要求（必须）**
- [x] 在共享状态组件说明“适用场景/不适用场景”。
- [x] 在旧组件标注“兼容期结束条件”。

**验收标准**
- [x] 视觉与交互一致，无样式回退。
- [x] 新增页面默认使用 `shared/ui` 状态组件。

---

## 批次 E：缓存与文档对齐（中优先）

### E-1 缓存策略统一描述 + 关键链路对齐

**目标文件**
- `app/features/article-list/services/articles.repository.ts`
- `app/features/article-list/composables/useArticleCacheFeature.ts`
- `app/plugins/workerPrefetch.client.ts`

**执行步骤**
- [x] 明确缓存 key 规则与失效时机。
- [x] 对齐预取写回与页面读取 key，避免“预取成功但命中不稳”。

**注释要求（必须）**
- [x] 在缓存 key 生成与失效逻辑注明“为什么这样设计”。

**验收标准**
- [x] 首屏与目标页缓存命中行为稳定，无明显重复请求激增。

---

### E-2 文档同步（实施后必须）

**目标文件**
- `nuxt/doc/API_INTERFACE_DOCUMENTATION.md`
- `nuxt/doc/IMAGEBED_IMPLEMENTATION.md`
- `doc/NUXT_FRONTEND_MIGRATION_CHECKLIST.md`

**执行步骤**
- [x] 更新端点、调用入口、目录位置与真实代码一致。
- [x] 将“已完成批次”回写迁移清单并附验证结论。

**验收标准**
- [x] 文档无旧路径/旧调用描述，实施代理可仅靠文档复现改造路径。

---

## 3. 执行顺序与里程碑

### 里程碑 M1（第 1 天）
- 完成 A-1、A-2：两大后台页容器化落地。

### 里程碑 M2（第 2 天）
- 完成 B-1、B-2：API 入口与错误语义统一到首批页面链路。

### 里程碑 M3（第 3 天）
- 完成 C-1、D-1：Worker 工厂化 + 状态组件收敛。

### 里程碑 M4（第 4 天）
- 完成 E-1、E-2：缓存对齐与文档回写。

---

## 4. 验证脚本与人工回归

### 4.1 本地检查
- [ ] 在 `nuxt/` 执行：`npm run dev`
- [ ] 确认无新增阻断错误（编译/类型/运行时）。

### 4.2 定点回归（必须）
- [ ] 后台画廊：加载、上传/编辑、排序、删除。
- [ ] 后台文章编辑：加载、保存、AI 摘要、异常提示。
- [ ] 前台关联页面：文章列表、文章详情、公开画廊。

### 4.3 一致性检查
- [ ] Loading/Error/Empty 展示语义一致。
- [ ] API 错误提示来源一致。
- [ ] Worker 超时与降级行为一致。

---

## 5. 风险清单与应对

- [ ] **端点兼容风险**：AI 摘要与 Gallery 端点历史差异可能触发回归。
  - 应对：先保留兼容分支，再在文档标注“统一目标端点”。
- [ ] **缓存抖动风险**：key 对齐期间可能短时增请求。
  - 应对：分批上线并记录关键请求指标。
- [ ] **Worker 生命周期风险**：释放策略变更可能影响长会话稳定性。
  - 应对：先统一协议与超时，再调整释放策略。

---

## 6. 提交建议（供实施代理）

- 提交 1：`feat(admin): 容器化 gallery/articles 编辑页`
- 提交 2：`refactor(api): 统一 client 与 endpoint 映射`
- 提交 3：`refactor(worker): 提炼 worker composable 工厂`
- 提交 4：`refactor(ui): 收敛状态组件到 shared/ui`
- 提交 5：`docs: 同步 API/迁移/实现文档`

> 说明：若任一提交出现关键回归，可按提交粒度回滚，不影响其余批次推进。
