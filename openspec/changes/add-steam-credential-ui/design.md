## Context

现有实现把凭证放在部署配置里：`STEAM_ID` 在 `nuxt-admin/wrangler.toml` 的 `[vars]`，`STEAM_API_KEY` 是 Worker Secret。这样最安全，但站长改一次凭证就要走命令行并重新部署，无法在后台自助维护。

需求是「后台可填」，这必然要把密钥写进可持久化的位置。可选位置只有两个：D1 或 KV。两者都是明文存储（Cloudflare 加密磁盘，但导出、备份、`wrangler d1 execute` 都能看到值），所以必须在应用层再加密一次。

设计参考稿：本变更为纯后台功能，无独立视觉稿；页面结构见 `app/pages/admin/gaming/index.vue`。

## Goals / Non-Goals

**Goals:**

- 后台一个页面完成：填/换 SteamID 与 API key、校验、保存、清除、看同步状态、编辑展柜。
- 密钥不以明文落库，也永不回传给浏览器。
- 旧的环境变量配置继续可用，可作为兜底或迁移过渡。

**Non-Goals:**

- 不做多账号 / 多 Steam 档案。
- 不做凭证历史版本、回滚或「上次使用的 key」对比。
- 不把解密密钥放进 D1 或前端；不提供「显示密钥」按钮。
- 不改公开站与 `blog-router` 的定时触发链路。

## Decisions

### 1. 凭证存 D1，但用 AES-GCM 加密后再写

`steam_credentials` 单行表存 `steam_id`（明文，本就是公开标识）、`api_key_cipher`、`api_key_iv`、`key_last4`、`updated_at`、`updated_by`。

- 理由：D1 导出/备份/`d1 execute` 只能拿到密文；`steam_id` 不需要加密，加密它只会增加解密失败面。
- 备选：明文存 D1（否决，备份即泄露）；只存 env（否决，无法后台自助）。
- 备选：存 KV（否决，同样是明文，且本项目 KV 未启用）。

### 2. 密钥派生：专用 secret 优先，回退 SESSION_PEPPER，并支持轮换

主密钥 = `STEAM_CREDENTIAL_KEY || SESSION_PEPPER`；用途子密钥 = `SHA-256("dsh:secret-box:v1:<purpose>:<master>")`。密文同时记录 `key_id`（主密钥的 SHA-256 前 8 字节指纹）与 AAD（`<purpose>:<key_id>`）。

- 理由：域分离避免会话签名密钥被直接当作加密密钥；AAD 让密文无法在字段间搬运；`key_id` 让轮换自描述——把新值放进 `STEAM_CREDENTIAL_KEY`、旧值放进 `STEAM_CREDENTIAL_KEY_PREVIOUS`，旧密文仍能解。
- 代价：`key_id` 是两把钥匙都对不上时（例如只换不回填 previous）才会暴露「解不开」，此时按未配置处理并提示重新填写。
- 备选：手工维护 `key_version` 计数（否决——运维要记数字，容易错）；只支持单把钥匙（否决——轮换即数据作废）。

### 3. 读取接口只回掩码，写入是唯一入口

`GET /admin/api/steam/credentials` 返回 `{ steamId, hasKey, keyLast4, source, updatedAt, updatedBy }`；`PUT` 接收 `{ steamId, apiKey? }`，`apiKey` 省略或为空表示「保持原 key」。

- 理由：后台页面一旦能回显 key，任何 XSS、浏览器扩展、截图都会直接泄露。
- 掩码取后四位，仅用于让站长确认「换没换」。

### 4. 保存前用一次 Steam 调用校验

`PUT` 先用提交的 `steamId + apiKey` 调 `ISteamUser/GetPlayerSummaries`：

- 401/403 → 400「Steam 拒绝了这组凭证」
- 空 players → 400「找不到该 SteamID」
- 网络失败 → 502，提示稍后重试，且**不写入**

- 理由：避免把打错的 key 存进去，让后续定时同步连续失败。
- 代价：保存动作会消耗 1 次上游请求；可接受。

### 5. 同步侧改为「D1 优先、env 兜底」

`resolveSteamCredentials(event)`：读 D1 → 解密 → 成功即用；无行或解密失败 → 回退 `STEAM_ID`/`STEAM_API_KEY`。

- 理由：存量部署零改动即可升级；清除 D1 行就等于回退到 env。
- 判定「未配置」的逻辑保持不变（仍返回 `unconfigured`），公开页行为不受影响。

### 6. 后台页面一个页面三段

`/admin/gaming` 从上到下：凭证卡（SteamID、API key 密码框、保存并验证、清除）→ 同步卡（状态、最近时间、立即同步）→ 展柜管理器（原有交互）。

- 理由：凭证、同步、展示是一条链，分页会让「为什么没数据」的排查路径变长。
- 表单用 `type="password"` + `autocomplete="off"`，提交后清空输入框，只留掩码提示。

## Risks / Trade-offs

- **拥有 Worker 部署权限的人**可以替换 secret 并解密密文 → 属于 Cloudflare 平台边界，任何自托管加密都绕不过；文档注明不要把部署权限给不受信任的人。
- **SESSION_PEPPER 轮换**导致密文不可解 → 解密失败降级为「未配置 + 提示重新保存」，不阻塞页面读取。
- **后台 XSS** 仍可能窃取会话（进而能改凭证）→ 掩码读取把「读走 key」降级为「换成自己的 key」，损失可控；会话本身有 HttpOnly Cookie 与同源校验。
- **审计只有最后一人**（`updated_by`）→ 单管理员场景够用，不做操作日志表。
- 校验调用偶发失败会让保存被拒 → 返回可读错误并允许重试，不落库。

## Migration / Rollback

新增 `0008_steam_credentials.sql`（只建表，不写数据）。发布顺序与现有一致：迁移 → `deploy:api` → `deploy:pages`。回滚：代码回退后 D1 里的密文行被忽略（旧代码只读 env），可保留；`STEAM_CREDENTIAL_KEY` 不配也能正常工作（走 SESSION_PEPPER 派生）。

## Open Questions

- 是否需要「更换凭证后自动触发一次同步」——当前保留手动「立即同步」，避免保存请求变长。
- 是否给凭证修改加二次密码确认——当前依赖会话 + 同源校验，若后续有多管理员再补。
