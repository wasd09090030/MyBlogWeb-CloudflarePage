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
  apiToken?: unknown
}

export type SafeImagebedConfig = {
  domain: string
  uploadFolder: string
  configured: boolean
}

export type CfImageConfig = {
  isEnabled: boolean
  zoneDomain: string | null
  useHttps: boolean
  fit: string
  width: number
  quality: number
  format: string
  signatureParam: string
  useWorker: boolean
  workerBaseUrl: string | null
  tokenTtlSeconds: number
}

type CfImageConfigRow = {
  id: number
  is_enabled: number
  zone_domain: string | null
  use_https: number
  fit: string
  width: number
  quality: number
  format: string
  signature_param: string
  use_worker: number
  worker_base_url: string | null
  token_ttl_seconds: number
}

function fallbackDomain(event: H3Event): string {
  const configured = getCloudflareEnv(event).PUBLIC_ASSET_ORIGIN?.trim()
  return configured ? configured.replace(/\/file\/?$/i, '') : getRequestURL(event).origin
}

function mapSafeConfig(event: H3Event, row: ImagebedConfigRow | null): SafeImagebedConfig {
  const domain = row?.domain?.trim() || fallbackDomain(event)
  return { domain, uploadFolder: row?.upload_folder || '', configured: Boolean(domain) }
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
  if (!['http:', 'https:'].includes(url.protocol)) throw createError({ statusCode: 400, statusMessage: 'Image domain must use HTTP or HTTPS' })
  const uploadFolder = String(input.uploadFolder ?? current?.upload_folder ?? '').trim().replace(/^\/+|\/+$/g, '').slice(0, 512)
  const now = nowIso()
  if (current) {
    await execute(getDb(event), 'UPDATE imagebed_configs SET domain = ?, upload_folder = ?, updated_at = ? WHERE id = ?', rawDomain.replace(/\/$/, ''), uploadFolder || null, now, current.id)
  } else {
    await execute(getDb(event), 'INSERT INTO imagebed_configs (domain, upload_folder, created_at, updated_at) VALUES (?, ?, ?, ?)', rawDomain.replace(/\/$/, ''), uploadFolder || null, now, now)
  }
  return await getImagebedConfig(event)
}

function mapCfConfig(row: CfImageConfigRow | null): CfImageConfig {
  return {
    isEnabled: row ? row.is_enabled === 1 : true,
    zoneDomain: row?.zone_domain || null,
    useHttps: row ? row.use_https === 1 : true,
    fit: row?.fit || 'scale-down',
    width: row?.width || 300,
    quality: row?.quality || 50,
    format: row?.format || 'webp',
    signatureParam: row?.signature_param || 'sig',
    useWorker: row ? row.use_worker === 1 : false,
    workerBaseUrl: row?.worker_base_url || null,
    tokenTtlSeconds: row?.token_ttl_seconds || 3600
  }
}

export async function getCfImageConfig(event: H3Event): Promise<CfImageConfig> {
  const row = await queryFirst<CfImageConfigRow>(getDb(event), `
    SELECT id, is_enabled, zone_domain, use_https, fit, width, quality, format,
           signature_param, use_worker, worker_base_url, token_ttl_seconds
    FROM cf_image_configs ORDER BY id ASC LIMIT 1
  `)
  return mapCfConfig(row)
}

export async function saveCfImageConfig(event: H3Event, input: Record<string, unknown>): Promise<CfImageConfig> {
  const current = await queryFirst<CfImageConfigRow>(getDb(event), 'SELECT id, is_enabled, zone_domain, use_https, fit, width, quality, format, signature_param, use_worker, worker_base_url, token_ttl_seconds FROM cf_image_configs ORDER BY id ASC LIMIT 1')
  const config = {
    isEnabled: input.isEnabled === undefined ? current?.is_enabled !== 0 : Boolean(input.isEnabled),
    zoneDomain: input.zoneDomain === undefined ? current?.zone_domain || null : String(input.zoneDomain || '').trim() || null,
    useHttps: input.useHttps === undefined ? current?.use_https !== 0 : Boolean(input.useHttps),
    fit: String(input.fit ?? current?.fit ?? 'scale-down').trim().slice(0, 32) || 'scale-down',
    width: Math.min(Math.max(Number(input.width ?? current?.width ?? 300) || 300, 0), 4096),
    quality: Math.min(Math.max(Number(input.quality ?? current?.quality ?? 50) || 50, 0), 100),
    format: String(input.format ?? current?.format ?? 'webp').trim().toLowerCase().slice(0, 16) || 'webp',
    signatureParam: String(input.signatureParam ?? current?.signature_param ?? 'sig').trim().slice(0, 32) || 'sig',
    useWorker: input.useWorker === undefined ? current?.use_worker === 1 : Boolean(input.useWorker),
    workerBaseUrl: input.workerBaseUrl === undefined ? current?.worker_base_url || null : String(input.workerBaseUrl || '').trim() || null,
    tokenTtlSeconds: Math.min(Math.max(Number(input.tokenTtlSeconds ?? current?.token_ttl_seconds ?? 3600) || 3600, 60), 86_400)
  }
  if (config.useWorker && !config.workerBaseUrl) throw createError({ statusCode: 400, statusMessage: 'workerBaseUrl is required when useWorker is enabled' })
  const now = nowIso()
  if (current) {
    await execute(getDb(event), `UPDATE cf_image_configs SET is_enabled = ?, zone_domain = ?, use_https = ?, fit = ?, width = ?, quality = ?, format = ?, signature_param = ?, use_worker = ?, worker_base_url = ?, token_ttl_seconds = ?, updated_at = ? WHERE id = ?`, config.isEnabled ? 1 : 0, config.zoneDomain, config.useHttps ? 1 : 0, config.fit, config.width, config.quality, config.format, config.signatureParam, config.useWorker ? 1 : 0, config.workerBaseUrl, config.tokenTtlSeconds, now, current.id)
  } else {
    await execute(getDb(event), `INSERT INTO cf_image_configs (is_enabled, zone_domain, use_https, fit, width, quality, format, signature_param, use_worker, worker_base_url, token_ttl_seconds, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, config.isEnabled ? 1 : 0, config.zoneDomain, config.useHttps ? 1 : 0, config.fit, config.width, config.quality, config.format, config.signatureParam, config.useWorker ? 1 : 0, config.workerBaseUrl, config.tokenTtlSeconds, now, now)
  }
  return await getCfImageConfig(event)
}
