import type { H3Event } from 'h3'
import { getCloudflareEnv, getRequiredSecret } from './cloudflare'

export type ImageApiProviderFile = {
  name?: unknown
  metadata?: Record<string, unknown>
  size?: unknown
  type?: unknown
  url?: unknown
}

export type ImageApiListResult = {
  files?: ImageApiProviderFile[]
  directories?: unknown[]
  totalCount?: unknown
  returnedCount?: unknown
  sum?: unknown
}

const REQUEST_TIMEOUT_MS = 15_000

function timeoutSignal(milliseconds: number) {
  return typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(milliseconds) : undefined
}

function normalizeBaseUrl(value: string): string {
  let url: URL
  try { url = new URL(value) } catch { throw createError({ statusCode: 503, statusMessage: 'Image provider URL is invalid' }) }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw createError({ statusCode: 503, statusMessage: 'Image provider URL is invalid' })
  }
  url.search = ''
  url.hash = ''
  url.pathname = url.pathname.replace(/\/+$/, '')
  return url.toString().replace(/\/$/, '')
}

export function getImageApiBaseUrl(event: H3Event): string {
  const env = getCloudflareEnv(event)
  const configured = env.IMAGE_API_BASE_URL?.trim() || env.PUBLIC_ASSET_ORIGIN?.trim()
  if (!configured) throw createError({ statusCode: 503, statusMessage: 'IMAGE_API_BASE_URL is not configured' })
  return normalizeBaseUrl(configured)
}

function getImageApiToken(event: H3Event): string {
  return getRequiredSecret(event, 'IMAGE_API_TOKEN')
}

function providerUrl(event: H3Event, path: string, params?: Record<string, string | undefined>): string {
  const url = new URL(`${getImageApiBaseUrl(event)}/${path.replace(/^\/+/, '')}`)
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, value)
  }
  return url.toString()
}

async function providerRequest(event: H3Event, path: string, init: RequestInit = {}, params?: Record<string, string | undefined>): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('authorization', `Bearer ${getImageApiToken(event)}`)
  headers.set('accept', 'application/json')
  let response: Response
  try {
    response = await fetch(providerUrl(event, path, params), {
      ...init,
      headers,
      signal: init.signal || timeoutSignal(REQUEST_TIMEOUT_MS)
    })
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Image provider request failed' })
  }
  return response
}

async function readJson(response: Response): Promise<unknown> {
  const text = (await response.text()).slice(0, 256 * 1024)
  if (!text.trim()) return null
  try { return JSON.parse(text) } catch { return null }
}

export async function uploadToImageApi(event: H3Event, body: BodyInit, contentType?: string, uploadFolder?: string): Promise<{ src: string }> {
  const headers = new Headers()
  if (contentType) headers.set('content-type', contentType)
  const response = await providerRequest(event, 'upload', { method: 'POST', headers, body }, {
    uploadChannel: 'cfr2',
    returnFormat: 'default',
    uploadFolder: uploadFolder?.trim() || undefined
  })
  const payload = await readJson(response)
  if (!response.ok) throw createError({ statusCode: 502, statusMessage: 'Image provider upload failed' })
  const first = Array.isArray(payload) ? payload[0] as Record<string, unknown> | undefined : undefined
  const src = typeof first?.src === 'string' ? first.src.trim() : ''
  if (!src) throw createError({ statusCode: 502, statusMessage: 'Image provider returned an invalid upload result' })
  return { src }
}

export async function listFromImageApi(event: H3Event, query: { start: number; count: number; search?: string; dir?: string; recursive?: boolean }): Promise<ImageApiListResult> {
  const response = await providerRequest(event, 'api/manage/list', { method: 'GET' }, {
    start: String(query.start),
    count: String(query.count),
    channel: 'CloudflareR2',
    fileType: 'image',
    search: query.search?.trim() || undefined,
    dir: query.dir?.trim() || undefined,
    recursive: query.recursive ? 'true' : undefined
  })
  const payload = await readJson(response)
  if (!response.ok || !payload || typeof payload !== 'object') throw createError({ statusCode: 502, statusMessage: 'Image provider list failed' })
  return payload as ImageApiListResult
}

export async function deleteFromImageApi(event: H3Event, storageKey: string, folder = false): Promise<void> {
  const response = await providerRequest(event, `api/manage/delete/${encodeURIComponent(storageKey)}`, { method: 'GET' }, folder ? { folder: 'true' } : undefined)
  const payload = await readJson(response)
  if (!response.ok || (payload && typeof payload === 'object' && (payload as Record<string, unknown>).success === false)) {
    throw createError({ statusCode: 502, statusMessage: 'Image provider delete failed' })
  }
}

export function normalizeImageSourceUrl(event: H3Event, source: string, configuredDomain: string): string {
  let configured: URL
  let candidate: URL
  try {
    configured = new URL(configuredDomain)
    candidate = new URL(source, configured)
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Image provider returned an invalid URL' })
  }
  if (!['http:', 'https:'].includes(candidate.protocol) || candidate.username || candidate.password) {
    throw createError({ statusCode: 502, statusMessage: 'Image provider returned an invalid URL' })
  }
  const env = getCloudflareEnv(event)
  const allowedHosts = new Set<string>()
  for (const value of [env.IMAGE_API_BASE_URL, env.PUBLIC_ASSET_ORIGIN]) {
    if (!value) continue
    try { allowedHosts.add(new URL(value).host) } catch { /* invalid optional config is handled elsewhere */ }
  }
  if (!allowedHosts.has(configured.host)) throw createError({ statusCode: 502, statusMessage: 'Image provider domain is not configured for this Worker' })
  if (!allowedHosts.has(candidate.host)) throw createError({ statusCode: 502, statusMessage: 'Image provider URL is outside the configured host' })
  return candidate.toString()
}
