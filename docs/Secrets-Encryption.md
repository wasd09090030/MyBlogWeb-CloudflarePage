# 密钥与加密存储

> 适用范围：`blog-api` 中**必须落库、又必须还原成明文**的敏感值。当前唯一使用者是 Steam API Key（后台「游戏」页填写）。
>
> 一句话威胁模型：能保护**数据库导出、备份、`wrangler d1 execute` 被看到**；不能保护**拥有 Worker 部署权限的人**或运行时被攻破的实例。

## 1. 速览

| 数据 | 存哪 | 处理方式 | 能否还原 |
| --- | --- | --- | --- |
| Steam API Key | D1 `steam_credentials.api_key_cipher` | AES-256-GCM 加密 | 能（需 Worker secret） |
| 管理员密码 | D1 `admin_users.password_hash` | PBKDF2-SHA256（10 万次）单向哈希 | 否 |
| 会话令牌 | D1 `admin_sessions.token_hash` | SHA-256(pepper:token) 单向哈希 | 否 |
| 文章 / 日记 / 画廊 / 评论正文 / 图片 URL | D1 | 明文 | — |
| `IMAGE_API_TOKEN`、`PAGES_DEPLOY_HOOK_URL`、`DEEPSEEK_API_KEY`、`STEAM_SYNC_TOKEN` | Worker Secret | 平台加密存储，不进代码 | 平台不可回读 |

原则：**能哈希的不要加密，能放 Secret 的不要落库，公开内容永远不加密。**

## 2. 为什么还要在应用层加密

Cloudflare 的 D1 磁盘本身是加密的，但以下路径仍会暴露明文：

- `wrangler d1 export` / 手动备份 / 迁移到本地 SQLite
- Dashboard 的 D1 控制台 SQL 查询
- 排查问题时把某张表贴给别人

所以对「必须可逆」的值，在写入前用 Worker 里的密钥再加密一次。密钥只在 Cloudflare Secret 中，D1 里只有密文。

## 3. 设计

实现：`nuxt-admin/server/utils/secret-box.ts`

```
主密钥 secret  = STEAM_CREDENTIAL_KEY || SESSION_PEPPER     （前者优先）
子密钥 key     = SHA-256("dsh:secret-box:v1:<purpose>:<secret>")
加密           = AES-256-GCM，12 字节随机 IV
附加认证数据   = "<purpose>:<keyId>"
keyId          = SHA-256(<secret>) 前 8 字节的十六进制（16 字符）
```

四个设计点：

1. **按用途派生**：不同 `purpose`（当前是 `steam-credential`）派生出不同子密钥，密文不能跨字段复用。
2. **AAD 绑定**：把 `purpose:keyId` 作为 AAD，篡改密文或跨字段搬运都会解密失败，而不是解出脏数据。
3. **keyId 自描述**：密文旁边记录主密钥指纹，解密时据此挑选当前或上一把钥匙，轮换不需要人工维护版本号。
4. **失败闭合**：任何异常（密钥不符、被篡改、旧格式）都返回 `null`，不会抛 500，也不会静默返回空串。

### 存储结构

`steam_credentials`（单行，`id = 1`）：

| 列 | 含义 |
| --- | --- |
| `steam_id` | 17 位 SteamID64，**明文**（本就是公开标识） |
| `api_key_cipher` | Base64 密文 |
| `api_key_iv` | Base64 的 12 字节 IV |
| `key_id` | 加密时使用的主密钥指纹；`NULL` 视为旧格式，不可解 |
| `key_last4` | 密钥后四位，仅用于后台确认「换没换」 |
| `updated_at` / `updated_by` | 审计字段 |

迁移：`0008_steam_credentials.sql`（建表）、`0009_steam_credentials_key_id.sql`（补 `key_id`）。

### 解密顺序

```
1. 读 D1 行 → 有 key_id 且密文完整 → 用当前密钥解
2. 失败 → 用 STEAM_CREDENTIAL_KEY_PREVIOUS 解（轮换过渡期）
3. 仍失败 → 回退环境变量 STEAM_ID / STEAM_API_KEY
4. 都没有 → 视为未配置；后台返回 decryptionFailed: true 并提示重新填写
```

## 4. 配置清单

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `STEAM_CREDENTIAL_KEY` | Secret | 建议 | 专用加密密钥，32+ 随机字符 |
| `STEAM_CREDENTIAL_KEY_PREVIOUS` | Secret | 轮换时 | 旧密钥，让旧密文仍可解 |
| `SESSION_PEPPER` | Secret | 已有 | 未配专用密钥时的回退来源（域分离派生，不直接复用） |
| `STEAM_SYNC_TOKEN` | Secret × 2 | 是 | `blog-api` 与 `blog-router` 值必须一致，cron 调同步端点用 |
| `STEAM_ID` / `STEAM_API_KEY` | Var / Secret | 否 | 兜底路径；后台填了凭证后不生效 |

> ⚠️ **Variables 是明文**：会进 git、Dashboard 明文可见。加密密钥只能放 Secret。

```powershell
cd nuxt-admin
npx wrangler secret put STEAM_CREDENTIAL_KEY --config wrangler.toml
```

生成随机值：

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
-join ($bytes | ForEach-Object { $_.ToString('x2') })
```

## 5. 操作手册

### 5.1 首次启用

1. `npx wrangler secret put STEAM_CREDENTIAL_KEY`（可跳过，退回 `SESSION_PEPPER`）
2. 部署 `blog-api` 与后台 Pages
3. 登录后台「游戏」页填 SteamID64 + API Key → 保存（会调一次 Steam 校验）
4. 点「立即同步」确认状态变「正常」

### 5.2 轮换加密密钥

1. 生成并写入新密钥：

   ```powershell
   cd nuxt-admin
   npx wrangler secret put STEAM_CREDENTIAL_KEY --config wrangler.toml
   ```

2. 把**旧值**填进 previous（这一步不做，旧密文就会解不开）：

   ```powershell
   npx wrangler secret put STEAM_CREDENTIAL_KEY_PREVIOUS --config wrangler.toml
   ```

3. 重新部署，让新 secret 生效：

   ```powershell
   npm run deploy:api
   ```

4. 登录后台，在凭证卡点一次「保存并验证」——会用新密钥重新加密（`key_id` 随之更新）
5. 确认 `/games` 数据正常后删除旧钥匙：

```powershell
npx wrangler secret delete STEAM_CREDENTIAL_KEY_PREVIOUS --config wrangler.toml
```

要点：**先加 previous 再删旧值**。如果直接换掉 current 且没有 previous，旧密文会变成「不可解密」，后台会提示重新填写（不会丢别的数据）。

### 5.3 密钥丢失

Secret 不可回读。若 `STEAM_CREDENTIAL_KEY` 丢失：

- 若还记得旧值 → 按 5.2 填回去即可
- 若完全丢失 → 重新设置一个新值，后台会显示 `decryptionFailed: true`，重新填一次 Steam API Key 即可（Steam Key 可随时在 Steam 页面 Regenerate，成本很低）

因此**建议把密钥同时存进密码管理器**，但不要存进仓库、聊天记录或截图。

### 5.4 清除后台凭证

后台凭证卡「清除后台凭证」→ 删除 D1 行：

- 若存在 env 兜底 → 自动回退，来源徽章变「环境变量」
- 否则 → 来源变「未配置」，公开页显示提示而不是报错

## 6. 故障排查

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 后台显示「来源：未配置」+ `decryptionFailed: true` | 密文与当前/上一把密钥都不匹配（换过 key 没留 previous，或旧格式行） | 重新填写 API Key |
| 保存返回 503 | 既没配 `STEAM_CREDENTIAL_KEY` 也没配 `SESSION_PEPPER` | 配置其一后重试 |
| 保存返回 400「Steam 拒绝了这组凭证」 | Key 错误或被吊销 | 在 Steam 页面重新生成 |
| 保存返回 400「找不到该 SteamID」 | ID 不是 17 位 SteamID64 | 用 steamid.io 转换 |
| 保存返回 502 | Worker 连不上 Steam（超时/5xx），此时**不会写库** | 稍后重试 |
| 同步成功但页面空 | Steam 隐私设置「游戏详情」非公开 | 改为公开后重新同步 |
| cron 报 401 | 两个 Worker 的 `STEAM_SYNC_TOKEN` 不一致 | 两边写同一个值 |

## 7. 代码地图

| 文件 | 职责 |
| --- | --- |
| `nuxt-admin/server/utils/secret-box.ts` | 通用加密盒：派生、seal、open、keyId |
| `nuxt-admin/server/domain/steam/credentials.ts` | 凭证读写、校验、轮换兼容、env 回退 |
| `nuxt-admin/server/routes/admin/api/steam/credentials.{get,put,delete}.ts` | 只写不读的 HTTP 契约 |
| `nuxt-admin/server/domain/steam/sync.ts` | 同步时解析凭证（D1 优先） |
| `nuxt-admin/shared/steam-showcases.ts` | 与加密无关，展柜配置校验 |
| `nuxt-admin/scripts/check-secret-box.mjs` | 加密行为断言（7 项） |

## 8. 如何加密新字段

1. 新增列：`ALTER TABLE ... ADD COLUMN xxx_cipher TEXT`、`xxx_iv TEXT`、`key_id TEXT`
2. 选一个稳定的 `purpose`（如 `imagebed-token`），**一旦上线不要再改**
3. 写入：`const sealed = await box.seal(plaintext)` → 存 `sealed.cipher / iv / keyId`
4. 读取：`const plain = await box.open({ keyId, cipher, iv })`，`null` 即视为不可用
5. 后台读取接口只回掩码，不回明文
6. 在 `scripts/check-secret-box.mjs` 里补一条用途隔离断言

## 9. 验证

```powershell
cd nuxt-admin
node --experimental-strip-types scripts/check-secret-box.mjs
```

覆盖：往返、指纹稳定性、用途绑定、轮换可解、未知 keyId 拒绝、篡改拒绝、缺 keyId 视为旧格式。

## 10. 已知限制

- 拥有 Worker 部署权限的人可以替换 Secret 再解密 → 属于平台边界，**不要给不受信任的人部署权限**
- 密钥丢失且无备份 = 已存凭证作废（可重新填写，Steam Key 可再生）
- AAD 只绑定用途与 keyId，不绑定行 ID；当前单行表场景无影响，未来多行表建议把主键拼进 `purpose`
- 评论邮箱等访客个人数据目前仍是明文（公开页需要它算 Gravatar），属于独立待办，不在本机制覆盖范围内
