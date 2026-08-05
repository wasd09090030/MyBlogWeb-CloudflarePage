import { defineNitroErrorHandler } from 'nitropack/runtime'
import { send, setResponseHeaders, setResponseStatus } from 'h3'

/**
 * Always return JSON errors from the blog-api Worker, regardless of the
 * client's Accept header.
 *
 * blog-api is a pure API Worker (the admin SPA is served by the separate
 * myblog-admin Pages project), so HTML error pages are never useful here.
 * Nuxt's default error handler renders an HTML error page for browser-like
 * requests; reusing Nitro's defaultHandler keeps the same
 * { error, url, statusCode, statusMessage, message, data } shape the
 * frontend already parses, but always serialized as JSON.
 */
export default defineNitroErrorHandler(async (error, event, { defaultHandler }) => {
  const res = defaultHandler(error, event)
  setResponseHeaders(event, res.headers)
  setResponseStatus(event, res.status, res.statusText)
  return send(event, JSON.stringify(res.body, null, 2))
})
