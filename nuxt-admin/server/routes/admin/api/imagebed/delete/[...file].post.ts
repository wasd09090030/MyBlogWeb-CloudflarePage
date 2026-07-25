import { imagebedConfig, imagebedUrl } from '~~/server/utils/imagebed'
import { assertSafeMutation } from '~~/server/utils/request-security'
export default defineEventHandler(async (event) => {
  assertSafeMutation(event)
  const config = await imagebedConfig(event)
  const file = getRouterParam(event, 'file') || ''
  return await $fetch(imagebedUrl(config, `api/manage/delete/${encodeURIComponent(file)}`), { headers: { authorization: `Bearer ${config.apiToken}` } })
})
