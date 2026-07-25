import { imagebedConfig, imagebedUrl } from '~~/server/utils/imagebed'
type ImagebedList = { files?: Array<{ name: string; metadata?: Record<string, string> }>; directories?: string[]; totalCount?: number; returnedCount?: number }
export default defineEventHandler(async (event) => {
  const config = await imagebedConfig(event)
  const response = await $fetch<ImagebedList>(imagebedUrl(config, 'api/manage/list'), { query: { ...getQuery(event), channel: 'CloudflareR2', fileType: 'image' }, headers: { authorization: `Bearer ${config.apiToken}` } })
  return { files: response.files || [], directories: response.directories || [], totalCount: response.totalCount || 0, returnedCount: response.returnedCount || 0, domain: config.domain }
})
