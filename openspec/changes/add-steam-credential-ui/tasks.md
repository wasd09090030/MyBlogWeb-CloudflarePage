## 1. 数据与加密

- [x] 1.1 新增 `nuxt-admin/migrations/0008_steam_credentials.sql`：单行表 `steam_credentials`（steam_id、cipher、iv、key_last4、updated_at、updated_by），不写初始数据。
- [x] 1.2 新增 `server/utils/secret-box.ts`（取代最初的 `steam-crypto.ts`）：`SHA-256("dsh:secret-box:v1:<purpose>:<master>")` 派生 AES-GCM 密钥，AAD 绑定 purpose + keyId，解码失败返回 null 而不是抛错。
- [x] 1.3 新增 `migrations/0009_steam_credentials_key_id.sql`：密文记录主密钥指纹 `key_id`；旧行（无 key_id）按不可解处理并提示重新填写。
- [x] 1.4 轮换支持：`STEAM_CREDENTIAL_KEY_PREVIOUS` 参与解密候选，按 `key_id` 精确匹配当前或上一把钥匙；两把都对不上时回退 env 并提示。
- [x] 1.5 新增 `scripts/check-secret-box.mjs`：往返、指纹稳定性、用途绑定、轮换、未知 keyId、篡改、缺 keyId 共 7 项断言全部通过。

## 2. 凭证域逻辑

- [x] 2.1 新增 `server/domain/steam/credentials.ts`：`readCredentialState`（掩码 + 来源 + 审计）、`resolveSteamCredentials`（D1 优先、env 兜底）、`saveCredentials`（格式校验 → Steam 校验 → 加密 upsert）、`clearCredentials`。
- [x] 2.2 保存前校验：`GetPlayerSummaries` 一次调用；401/403 → 400「Steam 拒绝」，空列表 → 400「找不到账号」，超时/5xx → 502，且都不落库（本地已验超时分支：502 且原行未被覆盖）。
- [x] 2.3 缺加密密钥 → 503 并指出应配置 `STEAM_CREDENTIAL_KEY` 或 `SESSION_PEPPER`；密文不可解 → 视为无 D1 凭证并回退 env，同时给「重新保存」提示。

## 3. 同步与状态接入

- [x] 3.1 把 `sync.ts` 的 `readSteamEnvironment` 换成 `resolveSteamCredentials`，`readSnapshotMeta` 与 `runSteamSync` 改用新函数。
- [x] 3.2 `admin/api/steam/status` 返回凭证来源（db/env/none）与最近更新时间，供后台展示。

## 4. 路由

- [x] 4.1 `GET /admin/api/steam/credentials`：会话保护，只回掩码与审计。
- [x] 4.2 `PUT /admin/api/steam/credentials`：`assertSafeMutation` + 会话，body `{ steamId, apiKey? }`，apiKey 为空表示保留原 key。
- [x] 4.3 `DELETE /admin/api/steam/credentials`：删除 D1 行并回退 env。

## 5. 后台页面

- [x] 5.1 `/admin/gaming` 顶部新增凭证卡：SteamID 输入、API key 密码框（占位提示已保存的后四位）、保存并验证、清除（二次确认）。
- [x] 5.2 保存成功后清空输入框并刷新掩码提示；失败展示后端字段错误；页面注明「密钥加密存储、不可回显」。
- [x] 5.3 同步卡与展柜管理器保持原交互，凭证来源与更新时间一并展示；侧边栏入口更名为「游戏」。

## 6. 验证与文档

- [x] 6.1 `npm run build:api` 与 `npm run generate`（admin）通过。
- [x] 6.2 本地 `wrangler dev` 验证：未登录 401、越权来源 403、非法 SteamID/Key 格式 400、Steam 不可达 502 且不落库、直接查 D1 只见密文（`key_last4=cdef`、cipher 非明文）、GET 只回掩码、解密后可发起同步（用存储的假 key 触发失败说明解密成功而非 unconfigured）。真实 key 的 400/成功分支因本机当前无法访问 Steam 未能实测。
- [x] 6.3 更新 `.dev.vars.example` 与 `CLAUDE.md`：凭证改为后台填写、env 作为兜底、`STEAM_CREDENTIAL_KEY` 的作用与轮换影响。
- [x] 6.4 `openspec validate add-steam-credential-ui --strict` 通过。

