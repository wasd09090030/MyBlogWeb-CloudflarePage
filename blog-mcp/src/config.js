/**
 * 客户端配置：基址默认指向线上博客，可用 BLOG_MCP_URL 覆盖（本地联调指向 http://localhost:3000）。
 */

export const DEFAULT_BASE_URL = 'https://wasd09090030.top'

/**
 * 解析 API 基址，并去掉尾部斜杠。
 * @returns {string}
 */
export function resolveBaseUrl() {
  const configured = process.env.BLOG_MCP_URL?.trim()
  return (configured || DEFAULT_BASE_URL).replace(/\/+$/, '')
}
