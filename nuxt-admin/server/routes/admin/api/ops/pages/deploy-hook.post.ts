import { backendFetch, requireAccessToken } from '~~/server/utils/backend'
import { assertSafeMutation } from '~~/server/utils/request-security'

type DeployResult = { success: boolean, message: string }

export default defineEventHandler(async (event) => {
  assertSafeMutation(event)
  const token = await requireAccessToken(event)
  return await backendFetch<DeployResult>('/ops/pages/deploy-hook', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` }
  })
})
