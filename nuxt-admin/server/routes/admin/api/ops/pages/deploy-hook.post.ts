import { triggerPagesDeploy } from '~~/server/domain/operations'
import { requireAdminSession } from '~~/server/domain/auth'
import { assertSafeMutation } from '~~/server/utils/request-security'

type DeployResult = { success: boolean, message: string }

export default defineEventHandler(async (event) => {
  assertSafeMutation(event)
  await requireAdminSession(event)
  return await triggerPagesDeploy(event)
})
