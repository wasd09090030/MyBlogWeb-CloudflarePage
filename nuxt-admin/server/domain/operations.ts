import type { H3Event } from 'h3'
import { getCloudflareEnv, getRequiredSecret } from '~~/server/utils/cloudflare'
import { fallbackSlug } from '~~/server/utils/slug'

type DeepSeekResponse = { choices?: Array<{ message?: { content?: string } }> }

function timeoutSignal(milliseconds: number) {
  return typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(milliseconds) : undefined
}

export async function generateArticleSummary(event: H3Event, input: Record<string, unknown>) {
  const title = String(input.title || '').trim()
  const content = String(input.content || '').trim()
  if (!title || !content) throw createError({ statusCode: 400, statusMessage: 'Title and content are required' })
  if (title.length > 500 || content.length > 80_000) throw createError({ statusCode: 413, statusMessage: 'Article content is too large for summarization' })
  const env = getCloudflareEnv(event)
  const apiKey = getRequiredSecret(event, 'DEEPSEEK_API_KEY')
  const endpoint = env.DEEPSEEK_API_URL?.trim() || 'https://api.deepseek.com/v1/chat/completions'
  const model = env.DEEPSEEK_MODEL?.trim() || 'deepseek-chat'
  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'Return strict JSON with keys summary and slug. Summary must be concise Chinese text; slug must contain only lowercase letters, digits, and hyphens.' },
          { role: 'user', content: JSON.stringify({ title, content }) }
        ]
      }),
      signal: timeoutSignal(20_000)
    })
  } catch {
    throw createError({ statusCode: 504, statusMessage: 'AI provider timed out' })
  }
  if (!response.ok) throw createError({ statusCode: 502, statusMessage: 'AI provider request failed' })
  const payload = await response.json() as DeepSeekResponse
  const raw = payload.choices?.[0]?.message?.content?.trim() || ''
  let parsed: Record<string, unknown> = {}
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')) as Record<string, unknown>
  } catch {
    parsed = { summary: raw }
  }
  const summary = String(parsed.summary || raw).trim()
  if (!summary) throw createError({ statusCode: 502, statusMessage: 'AI provider returned an empty summary' })
  const slug = fallbackSlug(String(parsed.slug || title))
  return { summary: summary.slice(0, 2000), slug }
}

export async function triggerPagesDeploy(event: H3Event) {
  const env = getCloudflareEnv(event)
  const hook = env.PAGES_DEPLOY_HOOK_URL?.trim()
  let response: Response
  try {
    if (hook) {
      response = await fetch(hook, { method: 'POST', signal: timeoutSignal(15_000) })
    } else {
      const token = getRequiredSecret(event, 'CLOUDFLARE_API_TOKEN')
      const accountId = getRequiredSecret(event, 'CLOUDFLARE_ACCOUNT_ID')
      const project = getRequiredSecret(event, 'PAGES_PROJECT_NAME')
      response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(project)}/deployments`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({}),
        signal: timeoutSignal(15_000)
      })
    }
  } catch {
    throw createError({ statusCode: 504, statusMessage: 'Pages deployment request timed out' })
  }
  if (!response.ok) throw createError({ statusCode: 502, statusMessage: 'Pages deployment request failed' })
  return { success: true, message: 'Pages deployment triggered' }
}
