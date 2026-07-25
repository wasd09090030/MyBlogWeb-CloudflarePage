import { imagebedConfig } from '~~/server/utils/imagebed'
export default defineEventHandler(async (event) => {
  const config = await imagebedConfig(event)
  return { domain: config.domain, uploadFolder: config.uploadFolder, configured: Boolean(config.domain && config.apiToken) }
})
