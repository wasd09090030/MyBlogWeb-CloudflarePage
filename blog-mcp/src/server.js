/**
 * MCP 服务装配：注册工具表、把异常映射成工具错误、stdio 传输。
 *
 * 这里不打印任何东西。stdio 模式下 stdout 是 JSON-RPC 通道，
 * 任何一行普通文本都会让客户端解析失败；诊断一律走 stderr。
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { formatApiError } from './api.js'
import { tools } from './tools.js'

/**
 * `parseResponse` 在 2xx 但正文不是 JSON 时返回 `{ error: '...' }`。
 * 这种响应是坏掉的网关页，不是数据 —— 只有 `error` 一个键的对象一律当失败。
 * @param {unknown} result
 * @returns {boolean}
 */
function isErrorOnlyPayload(result) {
  if (result === null || typeof result !== 'object' || Array.isArray(result)) return false
  const keys = Object.keys(result)
  return keys.length === 1 && keys[0] === 'error'
}

/**
 * @param {import('./api.js').ApiClient} api
 * @returns {McpServer}
 */
export function createMcpServer(api) {
  const server = new McpServer({ name: 'blog-mcp', version: '0.1.0' })
  for (const tool of tools) {
    // 空 schema 用 z.object({}) 而不是 {}：SDK 只把「带 _def 的对象」当 schema，
    // 裸空对象会被当成没有 schema 而跳过校验，调用参数也就无法保证是对象。
    const inputSchema = Object.keys(tool.inputSchema).length > 0 ? tool.inputSchema : z.object({})
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema },
      async (args) => {
        try {
          const result = await tool.run(/** @type {Record<string, any>} */ (args) ?? {}, api)
          if (isErrorOnlyPayload(result)) {
            const detail = /** @type {{ error: unknown }} */ (result).error
            return { isError: true, content: [{ type: 'text', text: String(detail) }] }
          }
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) ?? 'null' }] }
        } catch (error) {
          return { isError: true, content: [{ type: 'text', text: formatApiError(error) }] }
        }
      }
    )
  }
  return server
}

/**
 * 走 stdio 提供服务，直到客户端关闭连接。
 * @param {import('./api.js').ApiClient} api
 * @returns {Promise<void>}
 */
export async function serveStdio(api) {
  const server = createMcpServer(api)
  await server.connect(new StdioServerTransport())
}
