import type { H3Event } from 'h3'
import { execute, getDb, nowIso, queryFirst } from '~~/server/utils/d1'
import { getCloudflareEnv } from '~~/server/utils/cloudflare'

type ImagebedConfigRow = {
  id: number
  domain: string
  upload_folder: string | null
  created_at: string
  updated_at: string
}

export type ImagebedConfigInput = {
  domain?: unknown
  uploadFolder?: unknown
}

export type SafeImagebedConfig = {
  domain: string
  uploadFolder: string
  configured: boolean
}

function fallbackDomain(event: H3Event): string {
  const env = getCloudflareEnv(event)
  const configured = env.PUBLIC_ASSET_ORIGIN?.trim() || env.IMAGE_API_BASE_URL?.trim()
  return configured ? configured.replace(/\/file\/?$/i, '').replace(/\/$/, '') : getRequestURL(event).origin
}

function mapSafeConfig(event: H3Event, row: ImagebedConfigRow | null): SafeImagebedConfig {
  const domain = row?.domain?.trim() || fallbackDomain(event)
  const env = getCloudflareEnv(event)
  const configured = Boolean(domain && env.IMAGE_API_BASE_URL?.trim() && env.IMAGE_API_TOKEN?.trim())
  return { domain, uploadFolder: row?.upload_folder || '', configured }
}

export async function getImagebedConfig(event: H3Event): Promise<SafeImagebedConfig> {
  const row = await queryFirst<ImagebedConfigRow>(getDb(event), 'SELECT id, domain, upload_folder, created_at, updated_at FROM imagebed_configs ORDER BY id ASC LIMIT 1')
  return mapSafeConfig(event, row)
}

export async function saveImagebedConfig(event: H3Event, input: ImagebedConfigInput): Promise<SafeImagebedConfig> {
  const current = await queryFirst<ImagebedConfigRow>(getDb(event), 'SELECT id, domain, upload_folder, created_at, updated_at FROM imagebed_configs ORDER BY id ASC LIMIT 1')
  const rawDomain = String(input.domain ?? current?.domain ?? fallbackDomain(event)).trim()
  if (!rawDomain || rawDomain.length > 512) throw createError({ statusCode: 400, statusMessage: 'Image domain is required' })
  let url: URL
  try { url = new URL(rawDomain) } catch { throw createError({ statusCode: 400, statusMessage: 'Image domain must be an absolute URL' }) }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw createError({ statusCode: 400, statusMessage: 'Image domain must use HTTP or HTTPS without credentials' })
  const env = getCloudflareEnv(event)
  const allowedHosts = [env.IMAGE_API_BASE_URL, env.PUBLIC_ASSET_ORIGIN].filter(Boolean).flatMap(value => {
    try { return [new URL(value!).host] } catch { return [] }
  })
  if (allowedHosts.length && !allowedHosts.includes(url.host)) throw createError({ statusCode: 400, statusMessage: 'Image domain must match the configured image provider' })
  const domain = `${url.origin}${url.pathname.replace(/\/file\/?$/i, '').replace(/\/$/, '')}`
  const uploadFolder = String(input.uploadFolder ?? current?.upload_folder ?? '').trim().replace(/^\/+|\/+$/g, '').slice(0, 512)
  const now = nowIso()
  if (current) {
    await execute(getDb(event), 'UPDATE imagebed_configs SET domain = ?, upload_folder = ?, updated_at = ? WHERE id = ?', domain, uploadFolder || null, now, current.id)
  } else {
    await execute(getDb(event), 'INSERT INTO imagebed_configs (domain, upload_folder, created_at, updated_at) VALUES (?, ?, ?, ?)', domain, uploadFolder || null, now, now)
  }
  return await getImagebedConfig(event)
}
