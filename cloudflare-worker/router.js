/**
 * Cloudflare Worker — 混合架构路由分发
 *
 * 同一域名下，根据路径将请求分发到：
 * - Cloudflare Pages（静态博客）
 * - 云服务器（动态 SSR：admin/tools/mania）
 */

// ===== 配置 =====
const PAGES_ORIGIN = 'https://myblogweb-cloudflarepage.pages.dev'  // Cloudflare Pages 部署地址
const SERVER_ORIGIN = 'https://server.wasd09090030.top'

// 需要转发到云服务器的路径前缀
const SERVER_ROUTES = ['/admin', '/tools', '/mania', '/api', '/images']

// ===== Worker =====
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname

    // 判断是否走云服务器
    const isServerRoute = SERVER_ROUTES.some(prefix => path.startsWith(prefix))

    if (isServerRoute) {
      // 转发到云服务器
      const target = new URL(path + url.search, SERVER_ORIGIN)
      const newRequest = new Request(target, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'manual'
      })
      // 传递客户端真实 IP
      newRequest.headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '')
      newRequest.headers.set('X-Forwarded-Host', url.hostname)
      return fetch(newRequest)
    }

    // 其余请求走 Cloudflare Pages
    // 方式一：如果 Worker 绑定了 Pages（推荐）
    if (env.ASSETS) {
      return env.ASSETS.fetch(request)
    }

    // 方式二：直接 fetch Pages 域名
    const pagesUrl = new URL(path + url.search, PAGES_ORIGIN)
    return fetch(pagesUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body
    })
  }
}
