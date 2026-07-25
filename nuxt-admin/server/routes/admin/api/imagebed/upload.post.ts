import { imagebedConfig, imagebedUrl } from '~~/server/utils/imagebed'
import { assertSafeMutation } from '~~/server/utils/request-security'
export default defineEventHandler(async (event) => {
  assertSafeMutation(event)
  const config = await imagebedConfig(event)
  const body = await readRawBody(event, false)
  const contentType = getHeader(event, 'content-type') || ''
  return await $fetch(imagebedUrl(config, 'upload'), { method: 'POST', query: { uploadChannel: 'cfr2', returnFormat: 'default', ...(config.uploadFolder ? { uploadFolder: config.uploadFolder } : {}) }, body, headers: { authorization: `Bearer ${config.apiToken}`, 'content-type': contentType } })
})
