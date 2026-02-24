# 前端回归验证脚本说明

本说明对应脚本：`nuxt/scripts/validate-front-regression.ps1`

## 1. 脚本目标

用于批次 A~E 改造后的快速验证，覆盖：
- 关键代码规则（缓存 key 统一、端点漂移防回归）
- 前端关键路由可访问性
- 后端基础接口可达性（可选）

## 2. 使用方式

在 `nuxt/` 目录执行：

```powershell
# 默认：启动 dev 服务 + 前后端检查 + 脚本结束自动关闭 dev 服务
.\scripts\validate-front-regression.ps1

# 已手动启动 dev 服务时（不重复启动）
.\scripts\validate-front-regression.ps1 -SkipDevServer

# 仅前端检查（后端暂不可用时）
.\scripts\validate-front-regression.ps1 -SkipBackendChecks

# 执行后保留 dev 服务（便于继续手工验证）
.\scripts\validate-front-regression.ps1 -KeepDevServer
```

## 3. 可调参数

- `-BaseUrl`：前端地址，默认 `http://localhost:3000`
- `-BackendApiBase`：后端 API 地址，默认 `http://localhost:5000/api`
- `-StartupTimeoutSec`：前端启动等待秒数，默认 `180`
- `-SkipDevServer`：跳过启动前端服务
- `-SkipBackendChecks`：跳过后端接口可达性检查
- `-KeepDevServer`：脚本结束时不关闭 dev 服务

## 4. 检查项

### 4.1 结构规则检查
- `workerPrefetch` 必须使用 `buildArticleAsyncDataKey`
- `articleDetailPage` 必须使用 `buildArticleAsyncDataKey`
- `articleNavigation` 必须使用 `buildArticleAsyncDataKey`
- `workerPrefetch` 不允许再出现 `/galleries` 漂移端点

### 4.2 前端路由烟雾检查
- `/`
- `/gallery`
- `/tutorials`
- `/admin/gallery`
- `/admin/articles/1`

### 4.3 后端接口可达性检查（可选）
- `GET /articles?summary=true&page=1&limit=1`
- `GET /gallery`

## 5. 失败处理

脚本失败时：
1. 先看终端的 `[FAIL]` 信息。
2. 若是前端未启动，查看 `nuxt/log-regression-dev.txt`。
3. 若是后端检查失败，可用 `-SkipBackendChecks` 先执行前端回归。

## 6. 手工补充验证（建议）

自动脚本后，补充以下手工验证：
- 后台文章编辑页：加载、保存、AI 概要
- 后台画廊页：上传/排序/删除
- 前台文章详情跳转：观察是否出现“命中预加载缓存”日志
- 观察 Network：同一路由切换后是否出现明显重复请求激增
