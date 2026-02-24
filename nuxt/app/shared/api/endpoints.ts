/**
 * API 端点映射（单一事实来源）。
 *
 * 设计目标：
 * 1) 将散落在业务代码中的字符串端点收敛到一处；
 * 2) 后端路径变更时只需改这里，避免“同一接口多处漏改”；
 * 3) 保持 feature 代码只关注业务语义，不关心 URL 细节。
 */
export const API_ENDPOINTS = {
  articles: {
    // 对齐后端 ArticlesController: [Route("api/[controller]")] + 常规 REST 路径。
    list: '/articles',
    detail: (id: string | number) => `/articles/${id}`
  },
  ai: {
    // 对齐后端 AiController: [HttpPost("summary")]，稳定端点为 /ai/summary。
    summary: '/ai/summary'
  },
  gallery: {
    // 对齐后端 GalleryController 的公开与管理端点。
    publicList: '/gallery',
    adminList: '/gallery/admin',
    detail: (id: string | number) => `/gallery/${id}`,
    toggleActive: (id: string | number) => `/gallery/${id}/toggle-active`,
    batchImport: '/gallery/batch/import',
    batchSortOrder: '/gallery/batch/sort-order',
    refreshDimensions: '/gallery/refresh-dimensions'
  }
} as const
