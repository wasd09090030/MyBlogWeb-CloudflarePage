# Nuxt strict 渐进开启（已完成）

## 目标
- 在不阻断业务交付的前提下，将 `nuxt/app + nuxt/server` 渐进收敛到可启用 `typescript.strict` 的状态。
- 采用“分批目录治理 + 先观察后门禁（non-blocking -> blocking）”策略。

## 当前基线（2026-02-18）
- `nuxt typecheck`：通过（仅 `nuxt-site-config` localhost 警告）
- `nuxt/app + nuxt/server` 指标：
  - `any`：0
  - `as unknown as`：0
  - `@ts-ignore/@ts-expect-error`：0
  - `unknown`：88（主要在边界层与错误收敛）

## 分阶段计划
| 阶段 | 范围 | 目标 | 门禁策略 | 状态 |
|---|---|---|---|---|
| Phase 0 | 配置与度量 | 固化脚本、口径、回滚点 | non-blocking | ✅ 已完成 |
| Phase 1 | `app/features/article-admin` `app/features/tutorials/utils` `app/features/gallery-public/utils` | 低风险试点 strict 检查 | non-blocking（通过后转 blocking） | ✅ non-blocking 已通过 |
| Phase 2 | `app/features/article-list` + `app/shared/{api,cache,errors}` + `server` | 收敛仓储与共享边界类型 | 先 non-blocking | ✅ non-blocking 已通过 |
| Phase 3 | `app/features/article-detail` + `app/features/gallery-admin` | 高风险模块治理 | 先 non-blocking | ✅ non-blocking 已通过 |
| Phase 4 | `app + server` 全域 | 评估并切换全局 strict | blocking | ✅ 已通过 |

## 执行日志
### 2026-02-18 / Step 1
- 新增脚本：
  - `typecheck:strict:phase1`
  - `typecheck:strict:phase1:ci`
- 新增配置：`nuxt/tsconfig.strict.phase1.json`
- 说明：该配置仅覆盖低风险试点目录，并开启 `strict`，用于先行验证治理成本。

### 2026-02-18 / Step 2
- 首次执行 `npm run typecheck:strict:phase1`：出现 20 个错误（配置噪声 + 严格空值收窄）。
- 调整 `tsconfig.strict.phase1.json`：补充 Nuxt 生成类型声明与 `node` 类型后，得到可行动错误清单。
- 完成第一批修复（空值收窄、数组索引安全、请求 body 类型收紧、Cookie 赋值 null-safe）。
- 最终执行结果：`npm run typecheck:strict:phase1` 通过（0 错误）。

### 2026-02-18 / Step 3（下一步）
- 将 `typecheck:strict:phase1:ci` 先接入 CI 为 non-blocking 观测（建议 1-2 天）。
- 若持续稳定，再切换为 blocking，进入 Phase 2。

### 2026-02-18 / Step 4（Phase 2）
- 新增脚本：
  - `typecheck:strict:phase2`
  - `typecheck:strict:phase2:ci`
- 新增配置：`nuxt/tsconfig.strict.phase2.json`
- 首次执行 `npm run typecheck:strict:phase2`：2 个错误（均在 `article-list` 范围内，属于低风险空值收窄）。
- 修复后复跑：`npm run typecheck:strict:phase2` 通过（0 错误）。
- 结论：Phase 2 已达到 non-blocking 通过条件，可进入 CI 观测期。

### 2026-02-18 / Step 5（Phase 3）
- 新增脚本：
  - `typecheck:strict:phase3`
  - `typecheck:strict:phase3:ci`
- 新增配置：`nuxt/tsconfig.strict.phase3.json`
- 首次执行 `npm run typecheck:strict:phase3`：2 个错误（`ImagebedFileArea.vue` 模板内联回调隐式 any）。
- 修复后复跑：`npm run typecheck:strict:phase3` 通过（0 错误）。
- 结论：Phase 3 已达到 non-blocking 通过条件，可进入 CI 观测期。

### 2026-02-18 / Step 6（Phase 4）
- 新增脚本：
  - `typecheck:strict:phase4`
  - `typecheck:strict:phase4:ci`
- 新增配置：`nuxt/tsconfig.strict.phase4.json`
- 首次执行 `npm run typecheck:strict:phase4`：51 个错误（7 个文件，主要为 plugin/worker 的索引安全、unknown 收敛与联合类型分支收窄）。
- 完成分批修复（`app/plugins/*` 与 `app/utils/workers/*`），复跑 `npm run typecheck:strict:phase4` 通过（0 错误）。
- 同步修复 `app/shared/api/client.ts`：处理 `TypedInternalResponse<NitroFetchRequest, T, "get">` 与 `T` 的泛型不兼容问题，文件内当前无编译错误。
- 结论：Phase 4 已达到 blocking 门禁条件，strict 渐进迁移闭环完成。

## 回滚策略
- 目录级回滚：从 `tsconfig.strict.phase1.json` 的 `include` 中移除对应目录。
- 门禁回滚：`typecheck:strict:phase1:ci` 从 blocking 退回 non-blocking。
- 代码回滚：按阶段独立提交，逐阶段可单独回退。

## 下一步
- ✅ 已将 `typecheck:strict:phase4:ci` 接入主流程（release workflow）作为 blocking 校验。
- 后续新增模块默认按 strict 标准开发，避免回归。
