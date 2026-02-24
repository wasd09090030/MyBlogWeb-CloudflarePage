# Cloudflare Worker 验签缩略图方案说明

本文总结 Worker 验证流程、Cloudflare image 参数/链接变化，以及为什么该方案能有效防盗链。

## 目标
- 让瀑布流缩略图使用 Cloudflare 图片变换能力。
- 避免直接暴露 `/cdn-cgi/image/` 或可被复用的固定签名参数。
- 通过“可验证 + 可过期”的签名，阻断盗链与参数篡改。

## 现有问题（直接 `/cdn-cgi/image/` + 固定 `sig`）
- 浏览器可见 `sig`，任何人可复制复用。
- WAF 仅能检查 `sig` 是否存在，无法验证真实性。
- 一旦 `sig` 泄露，盗链者可长期使用。

## 新方案概述（Worker 验签）
将所有缩略图请求改为访问 Worker 域名，由 Worker 校验签名和过期时间后，使用 `cf.image` 进行变换。

- Worker 域名（自定义绑定）：`https://imgworker.wasd09090030.top`
- 源图访问路径：`/file/<path>`
- 缩略图路径：`/thumb/<path>`

## 链接格式变化

### 旧链接（直接 Cloudflare 转换）
```
https://imgbed.test.test/cdn-cgi/image/fit=scale-down,width=300,format=webp/https://imgbed.test.test/file/test.jpg?sig=xxx
```
问题：`sig` 固定且可复制，无法验证。

### 新链接（Worker + 签名 + 过期）
```
https://imgworker.wasd09090030.top/thumb/test.jpg
  ?w=300
  &q=50
  &fmt=webp
  &fit=scale-down
  &exp=1700000000
  &sig=<hmac>
```

## Cloudflare image 参数说明
这些参数在 Worker 中被签名后才生效，任何参数篡改都会导致验签失败。

- `w`：宽度（像素）
- `q`：质量（1-100）
- `fmt`：输出格式（webp/avif/jpeg/png/auto）
- `fit`：缩放模式（scale-down/cover/contain/fill/crop/pad）

## Worker 验签逻辑（关键点）

### 1) 计算签名数据串
```
<path>|<w>|<q>|<fmt>|<fit>|<exp>
```

### 2) 用 HMAC-SHA256 计算签名
```
sig = HMAC_SHA256(secret, data)
```

### 3) Worker 侧校验
- `exp` 必须大于当前时间（未过期）
- `sig` 必须与计算结果一致
- 否则拒绝请求

## 为什么这样做能防盗链

### 1) 签名可验证，无法伪造
签名基于 HMAC 密钥，攻击者即便拿到 URL，也无法生成新的合法 `sig`。

### 2) 签名带过期时间
`exp` 过期后自动失效，盗链链接“有寿命”。

### 3) 参数不可篡改
任何改动 `w/q/fmt/fit` 都会改变签名数据串，导致验签失败。

### 4) 真实源图地址不暴露
客户端只访问 Worker，源图域名和 `/file/` 结构可被隐藏或替换。

## WAF 规则配合建议
Worker 是真正的验签点，WAF 仅做“粗过滤”。

建议规则：
```
(http.request.uri.path contains "/thumb/")
and not (http.request.uri.query contains "sig=")
and not (http.request.uri.query contains "exp=")
```

同时建议阻断直连 `/cdn-cgi/image/`，避免绕过 Worker。

## TTL 设置建议
- 推荐：3600 秒（1 小时）
- 若想更严，可降低到 300~900 秒
- TTL 过短会增加缓存失效率与签名刷新频率

## 后端签名生成要点
后端生成缩略图 URL 时必须使用与 Worker 相同的：
- `signing secret`
- 数据串拼接规则
- 参数顺序

示例（伪代码）：
```
data = "path|w|q|fmt|fit|exp"
 sig = HMAC_SHA256(secret, data)
 url = "https://imgworker.wasd09090030.top/thumb/<path>?w=...&q=...&fmt=...&fit=...&exp=...&sig=..."
```

## 小结
Worker 验签方案的核心是：
- **签名可验证**
- **签名可过期**
- **参数不可篡改**

因此它可以有效避免“固定 sig 被复用”的盗链问题，并能安全支持动态 `width/quality/format` 参数。

---

## 部署 / 配置清单（Worker + 后端）

### A. Cloudflare Worker 部署
1) 创建 Worker 项目（JavaScript 或 TypeScript）。
2) 绑定路由（Route）：
   - `imgworker.wasd09090030.top/thumb/*`
3) 在 Worker 设置中配置环境变量（Secrets/Vars）：
   - `SIGNING_SECRET`：签名密钥（必须与后端一致）
   - `SOURCE_HOST`：源图域名（例如 `imgbed.test.test`）
   - 可选默认参数：`DEFAULT_W`、`DEFAULT_Q`、`DEFAULT_FMT`、`DEFAULT_FIT`（若代码支持）
4) 确认 Worker 代码中：
   - 读取 `SIGNING_SECRET` 和 `SOURCE_HOST`
   - 使用 `cf.image` 转换（避免直接拼 `/cdn-cgi/image/`）
   - 校验 `exp` 与 `sig`

### B. DNS / 域名绑定
1) 确认 `imgworker.wasd09090030.top` 已在 Cloudflare DNS 中。
2) 绑定 Worker 自定义域名：
   - Custom Domain: `imgworker.wasd09090030.top`
   - 路由映射到对应 Worker

### C. WAF 规则建议
- 阻止直连 `/cdn-cgi/image/`（避免绕过 Worker）
- 对 `/thumb/` 仅做存在性检查：
```
(http.request.uri.path contains "/thumb/")
and not (http.request.uri.query contains "sig=")
and not (http.request.uri.query contains "exp=")
```
> 注意：WAF 不能校验 HMAC，真正验证在 Worker 内完成。

### D. 后端配置（API 保存）
通过后台配置保存以下字段（建议）：
- `useWorker = true`
- `workerBaseUrl = "https://imgworker.wasd09090030.top"`
- `tokenTtlSeconds = 3600`
- `signatureSecret = <SIGNING_SECRET>`
- `width / quality / format / fit` 按需求设置

### E. 验证步骤（上线前）
1) 打开任意缩略图链接，确认：
   - URL 包含 `exp` + `sig`
   - Worker 返回 200 且图片正常
2) 修改 `w` 或 `q` 参数后访问：
   - 期望返回 403（签名失败）
3) 等待 `exp` 过期后访问：
   - 期望返回 403（过期）
4) 访问 `/cdn-cgi/image/` 直连地址：
   - 期望被 WAF 拦截

### F. 故障排查
- 403 Bad signature：检查 HMAC 数据串拼接顺序是否一致
- 403 Expired：检查服务器时间、TTL 设置是否过短
- 图片 404：确认 `SOURCE_HOST` 和 `/file/<path>` 真实可访问
- Worker 未生效：检查路由绑定是否正确（是否覆盖 `/thumb/*`）
