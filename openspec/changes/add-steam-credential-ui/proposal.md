## Why

目前 Steam 凭证只能通过 `wrangler.toml`（STEAM_ID）和 `wrangler secret`（STEAM_API_KEY）配置，修改一次要走命令行、重新部署，站长无法在后台自助更换。但直接把 API key 存进 D1 又会让密钥以明文落在数据库导出、备份和 `d1 execute` 里。

需要的是「后台可填、可改、可清除」，同时**密钥不以明文落库、不回显给浏览器**。

## What Changes

- 后台新增独立的「游戏」页（`/admin/gaming` 升级）：凭证区 + 同步状态区 + 展柜编辑区，三块在同一页。
- 新增凭证存取：`GET/PUT/DELETE /admin/api/steam/credentials`，**只写不读**——读取接口只返回 SteamID、掩码后四位、来源（db/env）与更新时间，永不返回 key。
- 凭证落 D1 前用 AES-GCM 加密（密钥由 Worker secret 派生），数据库导出单独泄露时无法还原明文。
- 保存前用这组凭证调用一次 `GetPlayerSummaries` 做校验，key 错误或 SteamID 不存在直接拒绝保存。
- 同步逻辑改为「先读 D1 凭证，读不到再回退 env」，因此旧的 `STEAM_ID` / `STEAM_API_KEY` 配置继续有效，可平滑迁移。
- 新增审计字段（更新时间、更新人）与「清除凭证」动作；清除后若存在 env 凭证则自动回退。

## Capabilities

### New Capabilities
- `steam-credential-management`: 凭证的加密存储、掩码读取、校验后保存、清除与 env 回退。

### Modified Capabilities
- `steam-library-sync`: 凭据来源从「仅 env」变为「D1 优先、env 兜底」；未配置的判定与提示保持不变。

## Impact

- `nuxt-admin/`：新增 `migrations/0008_steam_credentials.sql`、`server/utils/steam-crypto.ts`、`server/domain/steam/credentials.ts`、`server/routes/admin/api/steam/credentials.{get,put,delete}.ts`；改 `sync.ts` 的凭证解析、`status.get.ts`；重写 `app/pages/admin/gaming/index.vue`。
- 配置：新增可选 secret `STEAM_CREDENTIAL_KEY`；未设置时用 `SESSION_PEPPER` 做域分离派生。
- 公开站与 `blog-router`：无改动。
- 风险：`SESSION_PEPPER` 轮换会导致已存密文不可解，需要重新保存凭证（文档注明）；拥有 Worker 部署权限的人理论上可替换 secret 并解密密文，属于平台边界。
