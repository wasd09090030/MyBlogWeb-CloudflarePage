import { backendUrl, requireAccessToken } from '~~/server/utils/backend'
import { assertSafeMutation } from '~~/server/utils/request-security'

const allowed = [
  /^articles(?:\/\d+)?$/, /^comments\/admin\/(all|pending)$/, /^comments\/admin\/\d+\/status$/,
  /^gallery(?:\/admin|\/refresh-dimensions|\/batch\/(sort-order|import)|\/\d+(?:\/(toggle-active|dimensions))?)?$/,
  /^imagebed\/config$/, /^ai\/summary$/, /^auth\/change-password$/
]

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path') || ''
  if (!allowed.some(rule => rule.test(path))) throw createError({ statusCode: 404, statusMessage: 'Unsupported administration API route' })
  assertSafeMutation(event)
  const token = await requireAccessToken(event)
  const method = event.method.toUpperCase()
  const query = getQuery(event)
  const rawBody = ['GET', 'HEAD'].includes(method) ? undefined : await readRawBody(event, false)
  try {
    return await $fetch(backendUrl(path), {
      method: method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      query,
      body: rawBody,
      headers: {
        authorization: `Bearer ${token}`,
        ...(rawBody ? { 'content-type': getHeader(event, 'content-type') || 'application/json' } : {})
      }
    })
  } catch (error: any) {
    const statusCode = error?.response?.status || error?.statusCode || 502
    if (statusCode === 401) throw createError({ statusCode: 401, statusMessage: 'Session expired' })
    throw createError({ statusCode, statusMessage: error?.data?.message || error?.data?.error || 'Backend request failed' })
  }
})
