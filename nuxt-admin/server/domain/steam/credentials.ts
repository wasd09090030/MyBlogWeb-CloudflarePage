import type { H3Event } from 'h3'
import { getCloudflareEnv } from '~~/server/utils/cloudflare'
import { execute, getDb, nowIso, queryFirst } from '~~/server/utils/d1'
import { createSecretBox, loadKeyRing, type SealedSecret } from '~~/server/utils/secret-box'
import { createSteamClient, SteamApiError } from '~~/server/utils/steam-client'

const STEAM_ID_PATTERN = /^\d{17}$/
const API_KEY_PATTERN = /^[0-9A-Fa-f]{32}$/
const PURPOSE = 'steam-credential'

export type SteamCredentialSource = 'db' | 'env' | 'none'

export type SteamCredentialState = {
  steamId: string | null
  hasKey: boolean
  keyLast4: string | null
  source: SteamCredentialSource
  updatedAt: string | null
  updatedBy: string | null
  /** True when a stored row exists but cannot be opened with the current keys. */
  decryptionFailed: boolean
}

export type SteamCredentials = { steamId: string, apiKey: string, source: Exclude<SteamCredentialSource, 'none'> }

type CredentialRow = {
  steam_id: string
  api_key_cipher: string | null
  api_key_iv: string | null
  key_id: string | null
  key_last4: string | null
  updated_at: string
  updated_by: string | null
}

function envCredentials(event: H3Event): { steamId: string, apiKey: string } | null {
  const env = getCloudflareEnv(event)
  const steamId = env.STEAM_ID?.trim() || ''
  const apiKey = env.STEAM_API_KEY?.trim() || ''
  if (!STEAM_ID_PATTERN.test(steamId) || apiKey.length < 16) return null
  return { steamId, apiKey }
}

/**
 * Current key first, then the retired key, so rotating the secret does not
 * break rows written before the rotation.
 */
async function secretBoxFor(event: H3Event) {
  const env = getCloudflareEnv(event)
  const ring = await loadKeyRing({
    current: env.STEAM_CREDENTIAL_KEY || env.SESSION_PEPPER,
    previous: env.STEAM_CREDENTIAL_KEY_PREVIOUS
  })
  return createSecretBox(ring, PURPOSE)
}

async function readRow(event: H3Event): Promise<CredentialRow | null> {
  return await queryFirst<CredentialRow>(
    getDb(event),
    `SELECT steam_id, api_key_cipher, api_key_iv, key_id, key_last4, updated_at, updated_by
       FROM steam_credentials WHERE id = 1`
  )
}

async function decryptRow(event: H3Event, row: CredentialRow | null): Promise<string | null> {
  if (!row?.api_key_cipher || !row.api_key_iv || !row.key_id) return null
  const sealed: SealedSecret = { keyId: row.key_id, cipher: row.api_key_cipher, iv: row.api_key_iv }
  return await (await secretBoxFor(event)).open(sealed)
}

/** Masked view for the admin UI. Never returns the key. */
export async function readCredentialState(event: H3Event): Promise<SteamCredentialState> {
  const row = await readRow(event)
  const env = envCredentials(event)
  const decrypted = row ? await decryptRow(event, row) : null

  if (row && decrypted) {
    return {
      steamId: row.steam_id,
      hasKey: true,
      keyLast4: row.key_last4,
      source: 'db',
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
      decryptionFailed: false
    }
  }

  if (row && row.api_key_cipher) {
    // A row exists but cannot be opened (key rotated without previous, or legacy row).
    return {
      steamId: env?.steamId ?? row.steam_id,
      hasKey: Boolean(env),
      keyLast4: env ? lastFourOf(env.apiKey) : row.key_last4,
      source: env ? 'env' : 'none',
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
      decryptionFailed: true
    }
  }

  return {
    steamId: env?.steamId ?? row?.steam_id ?? null,
    hasKey: Boolean(env),
    keyLast4: env ? lastFourOf(env.apiKey) : null,
    source: env ? 'env' : 'none',
    updatedAt: row?.updated_at ?? null,
    updatedBy: row?.updated_by ?? null,
    decryptionFailed: false
  }
}

/** D1 first, environment second. Returns null when neither is usable. */
export async function resolveSteamCredentials(event: H3Event): Promise<SteamCredentials | null> {
  const row = await readRow(event)
  if (row) {
    const decrypted = await decryptRow(event, row)
    if (decrypted && STEAM_ID_PATTERN.test(row.steam_id)) {
      return { steamId: row.steam_id, apiKey: decrypted, source: 'db' }
    }
  }
  const env = envCredentials(event)
  return env ? { ...env, source: 'env' } : null
}

async function validateWithSteam(event: H3Event, steamId: string, apiKey: string) {
  const client = createSteamClient({ apiKey, budget: 2 })
  let summary: Awaited<ReturnType<typeof client.getPlayerSummaries>>
  try {
    summary = await client.getPlayerSummaries(steamId)
  } catch (error) {
    if (error instanceof SteamApiError && (error.status === 401 || error.status === 403)) {
      throw createError({ statusCode: 400, statusMessage: 'Steam 拒绝了这组凭证：API Key 无效或已被吊销' })
    }
    throw createError({ statusCode: 502, statusMessage: '暂时无法连接 Steam 校验凭证，请稍后重试' })
  }
  if (!summary) {
    throw createError({ statusCode: 400, statusMessage: '找不到该 SteamID，请确认是 17 位 SteamID64' })
  }
  return summary
}

export type SaveCredentialsInput = { steamId?: unknown, apiKey?: unknown }

export async function saveCredentials(event: H3Event, input: SaveCredentialsInput, updatedBy: string | null): Promise<SteamCredentialState> {
  const steamId = String(input.steamId ?? '').trim()
  if (!STEAM_ID_PATTERN.test(steamId)) {
    throw createError({ statusCode: 400, statusMessage: 'SteamID 必须是 17 位数字（SteamID64）' })
  }

  const provided = String(input.apiKey ?? '').trim()
  if (provided && !API_KEY_PATTERN.test(provided)) {
    throw createError({ statusCode: 400, statusMessage: 'API Key 格式不对，应为 32 位十六进制字符串' })
  }

  const box = await secretBoxFor(event)
  if (!box.available) {
    throw createError({ statusCode: 503, statusMessage: '未配置加密密钥：请设置 STEAM_CREDENTIAL_KEY 或 SESSION_PEPPER 后再保存凭证' })
  }

  const row = await readRow(event)
  const existingKey = provided ? null : await decryptRow(event, row)
  const apiKey = provided || existingKey
  if (!apiKey) {
    throw createError({ statusCode: 400, statusMessage: '首次保存必须填写 API Key' })
  }

  await validateWithSteam(event, steamId, apiKey)

  const now = nowIso()
  if (provided) {
    const sealed = await box.seal(provided)
    await execute(
      getDb(event),
      `INSERT INTO steam_credentials (id, steam_id, api_key_cipher, api_key_iv, key_id, key_last4, updated_at, updated_by)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET steam_id = excluded.steam_id, api_key_cipher = excluded.api_key_cipher,
         api_key_iv = excluded.api_key_iv, key_id = excluded.key_id, key_last4 = excluded.key_last4,
         updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
      steamId,
      sealed.cipher,
      sealed.iv,
      sealed.keyId,
      lastFourOf(provided),
      now,
      updatedBy
    )
  } else {
    await execute(
      getDb(event),
      `INSERT INTO steam_credentials (id, steam_id, updated_at, updated_by)
       VALUES (1, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET steam_id = excluded.steam_id, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
      steamId,
      now,
      updatedBy
    )
  }

  return await readCredentialState(event)
}

export async function clearCredentials(event: H3Event): Promise<SteamCredentialState> {
  await execute(getDb(event), 'DELETE FROM steam_credentials WHERE id = 1')
  return await readCredentialState(event)
}

function lastFourOf(value: string): string {
  return value.slice(-4)
}
