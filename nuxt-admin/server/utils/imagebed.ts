import type { H3Event } from 'h3'
import type { ImagebedConfig } from '~~/app/types/admin'
import { backendFetch, requireAccessToken } from './backend'

export async function imagebedConfig(event: H3Event): Promise<ImagebedConfig> {
  const token = await requireAccessToken(event)
  return await backendFetch<ImagebedConfig>('imagebed/config', { headers: { authorization: `Bearer ${token}` } })
}

export function imagebedUrl(config: ImagebedConfig, path: string) {
  return `${config.domain.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}
