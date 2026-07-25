import { imagebedConfig, imagebedUrl } from '~~/server/utils/imagebed'
import { assertSafeMutation } from '~~/server/utils/request-security'

export default defineEventHandler(async (event) => {
  assertSafeMutation(event)
  const body = await readBody<{ files?: string[] }>(event)
  const files = body.files?.filter(Boolean) || []
  if (!files.length || files.length > 100) throw createError({ statusCode: 400, statusMessage: 'Select between 1 and 100 files' })
  const config = await imagebedConfig(event)
  const results = await Promise.allSettled(files.map(file => $fetch(imagebedUrl(config, `api/manage/delete/${encodeURIComponent(file)}`), { headers: { authorization: `Bearer ${config.apiToken}` } })))
  return { deleted: results.filter(result => result.status === 'fulfilled').length, failed: results.filter(result => result.status === 'rejected').length }
})
