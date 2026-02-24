# Nuxt 前端 API 封装架构指南

> 本文档描述项目前端的 API 调用体系：网络请求封装、错误处理规范、以及 `server/api` 与 `app/shared/api` 的职责边界。

---

## 1. 总体分层

```
nuxt/
├── server/api/           ← Nuxt 服务端路由（H3 事件处理器，暴露给外部访问）
│   ├── articles/[id].get.ts
│   └── __sitemap__/urls.get.ts
└── app/
    ├── shared/
    │   ├── api/          ← 客户端 API 封装（给 Vue 应用消费后端 .NET API 用）
    │   │   ├── base-url.ts
    │   │   ├── client.ts
    │   │   └── endpoints.ts
    │   └── errors/       ← 错误归一化与用户提示
    │       └── index.ts
    └── features/
        └── article-detail/
            ├── services/ ← Repository（调用 shared/api/client）
            └── composables/ ← 组合式函数（调用 repository + shared/errors）
```

这两个 `api` 目录**完全不同性质**，下面详细说明。

---

## 2. `nuxt/server/api/` —— Nuxt 服务端路由

### 是什么

`server/api/` 是 **Nuxt 为每个文件自动注册的 HTTP 端点**，遵循 [Nuxt Server Routes](https://nuxt.com/docs/guide/directory-structure/server) 规范，底层由 [H3](https://h3.unjs.io/) 驱动。

- 文件命名规则：`[路径]/[name].[method].ts`。  
  例如 `articles/[id].get.ts` → 自动暴露 `GET /api/articles/:id`。
- 代码运行在 **Node.js 服务端**，可使用仅限服务端的包（如 `@nuxtjs/mdc/runtime`）。
- 通过 `useRuntimeConfig()` 访问私有服务端配置（如 `config.apiBaseServer`）。
- 用 `defineEventHandler` / `createError` 等 H3 API 处理请求。

### 当前的两个端点

| 文件 | 注册路由 | 用途 |
|---|---|---|
| `articles/[id].get.ts` | `GET /api/articles/:id` | 从 .NET 后端取文章详情，并在**服务端**完成 Markdown → AST 解析 |
| `__sitemap__/urls.get.ts` | `GET /api/__sitemap__/urls` | 为 `@nuxtjs/sitemap` 模块提供动态 URL 列表 |

### 为什么需要它

以 `articles/[id].get.ts` 为例：

```typescript
// server/api/articles/[id].get.ts（Node.js 环境）
import { parseMarkdown } from '@nuxtjs/mdc/runtime'  // 仅限服务端的包
import { defineEventHandler, getRouterParam, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const articleId = normalizeArticleId(getRouterParam(event, 'id'))

  // 1. 调用 .NET 后端 API
  const response = await $fetch(`${apiBase}/articles/${articleId}`)

  // 2. 在服务端完成 Markdown 解析（节省客户端计算）
  const ast = await parseMarkdown(response.contentMarkdown, {
    highlight: { theme: { default: 'material-theme-lighter', dark: 'material-theme-darker' } },
    toc: { depth: 4 }
  })
  response._mdcAst = ast

  return response
})
```

**关键原因**：`@nuxtjs/mdc/runtime` 的 `parseMarkdown` 含大量 Node.js 运行时依赖，无法在浏览器执行。将其放在 `server/api` 中，可以让服务端预渲染时一次完成"取数据 + 解析 Markdown"，避免客户端二次处理。

---

## 3. `nuxt/app/shared/api/` —— 客户端 API 封装

这是 **Vue 应用代码**（组件、composable、repository）用来请求 .NET 后端的工具层，运行在浏览器（CSR）和 Nuxt SSR 上下文中（同构）。

### 3.1 `base-url.ts` —— URL 解析

```typescript
export function resolveApiBaseURL(): string {
  const config = useRuntimeConfig()

  // SSR 阶段优先使用服务端私有地址（内网直连，绕过 CDN/反向代理）
  if (process.server && config.apiBaseServer) {
    return config.apiBaseServer   // 例如 http://127.0.0.1:5000/api
  }

  // 否则使用公开地址（客户端 / 生产构建）
  return config.public.apiBase   // 例如 /api 或 https://api.example.com/api
}
```

| 场景 | 使用的地址 | 环境变量 |
|---|---|---|
| SSR（服务端渲染） | 内网地址（直连后端） | `NUXT_API_BASE_URL` |
| 浏览器 / 生产 | 公开地址（通过反向代理） | `NUXT_PUBLIC_API_BASE_URL` |
| 本地开发 | `http://localhost:5000/api` | 默认值 |

### 3.2 `client.ts` —— 轻量 HTTP 客户端

封装 Nuxt 内置的 `$fetch`，提供 `get / post / patch / put / del` 语义化方法：

```typescript
export function createApiClient(baseURL = resolveApiBaseURL()) {
  const request = async <T>(path: string, options = {}): Promise<T> => {
    const target = isAbsoluteUrl(path) ? path : `${baseURL}${normalizePath(path)}`
    return await $fetch<T>(target, options)
  }

  return { baseURL, request, get, post, patch, put, del }
}
```

**设计原则**：
- 只负责 URL 拼接与 HTTP 方法封装。
- 不做业务错误翻译（职责边界清晰）。
- `withApiError(scope, action, fn)` 提供最小日志上下文，但不吞异常，原始错误继续向上抛。

### 3.3 `endpoints.ts` —— 端点单一事实来源

```typescript
export const API_ENDPOINTS = {
  articles: {
    list: '/articles',
    detail: (id: string | number) => `/articles/${id}`
  },
  gallery: {
    publicList: '/gallery',
    adminList: '/gallery/admin',
    toggleActive: (id) => `/gallery/${id}/toggle-active`,
    // ...
  }
} as const
```

**好处**：后端路径变更时只改这一个文件，不会出现多处漏改。

---

## 4. `nuxt/app/shared/errors/` —— 错误归一化

### 错误类型定义

```typescript
type AppErrorKind = 'network' | 'auth' | 'forbidden' | 'not-found'
                  | 'validation' | 'server' | 'business' | 'unknown'

type AppError = {
  kind: AppErrorKind
  statusCode?: number
  statusMessage: string
  userMessage: string  // 展示给用户的中文短语
  raw: unknown         // 原始错误对象，用于日志
}
```

### HTTP 状态码映射

| 状态码 | kind | 默认用户提示 |
|---|---|---|
| 401 | `auth` | 登录状态已失效，请重新登录 |
| 403 | `forbidden` | 没有权限执行该操作 |
| 404 | `not-found` | 请求的资源不存在 |
| 400 / 422 | `validation` | 请求参数有误，请检查后重试 |
| 5xx | `server` | 服务器繁忙，请稍后重试 |
| 网络失败 | `network` | 网络连接异常，请检查网络后重试 |
| 无 | `unknown` | 操作失败，请稍后重试 |

### 核心工具函数

```typescript
// 将任意 error 归一化为 AppError
normalizeAppError(error, options)

// 仅提取用户可见的提示文案
mapErrorToUserMessage(error, fallback)

// 转换为 Nuxt createError 所需的 payload
toNuxtErrorPayload(error, options)

// 结构化日志（不吞 error）
logAppError(scope, action, error)
```

---

## 5. Feature 层调用链

从最外层到最内层的调用路径：

```
页面 (pages/) 或容器组件 (containers/)
  └── composable (features/*/composables/useFooPage.ts)
        ├── repository (features/*/services/foo.repository.ts)
        │     └── createApiClient().get('/articles/123')
        │           └── $fetch('http://api.../articles/123')
        └── 错误处理
              ├── logAppError('feature-name', '加载XXX', error)
              └── throw createError(toNuxtErrorPayload(error, { notFound: '文章不存在' }))
```

### 示例：文章详情的完整链路

**1. Repository（纯数据获取）**

```typescript
// features/article-detail/services/articleDetail.repository.ts
export const createArticleDetailRepository = () => ({
  getArticleById: async (id: string | number) => {
    const client = createApiClient()
    return await client.get<Record<string, unknown>>(`/articles/${id}`)
  }
})
```

**2. Composable（组合业务逻辑 + 错误处理）**

```typescript
// features/article-detail/composables/useArticleDetailPage.ts
const { data: article } = await useAsyncData(cacheKey, async () => {
  try {
    return await repository.getArticleById(id)
  } catch (fetchError) {
    logAppError('article-detail', '加载文章详情', fetchError)  // 结构化日志
    throw createError(
      toNuxtErrorPayload(fetchError, {
        fallback: '文章加载失败',
        notFound: '文章不存在'     // 针对 404 定制用户提示
      })
    )
  }
})
```

---

## 6. `server/api` vs `app/shared/api` 本质区别

| 维度 | `nuxt/server/api/` | `nuxt/app/shared/api/` |
|---|---|---|
| **本质** | Nuxt 服务端路由（HTTP 端点） | Vue 应用层工具代码 |
| **运行环境** | Node.js（仅服务端） | 同构（SSR + 浏览器） |
| **调用方** | 浏览器、爬虫、其他服务 | Vue 组件、composable、repository |
| **调用目标** | 由它对外暴露 HTTP 接口 | 调用 .NET 后端 API |
| **目录原因** | Nuxt 框架约定，`server/` 自动注册路由 | 应用业务代码，归属 `app/` |
| **典型用途** | 服务端专有处理（Markdown 解析、sitemap） | 通用 HTTP 请求（GET/POST 等） |

**一句话总结**：
- `server/api/` 是**这个 Nuxt 应用对外提供的 API**。
- `app/shared/api/` 是**这个 Nuxt 应用用来消费 .NET 后端 API 的工具**。

两者职责截然不同，因此不在同一目录下是**正确且符合 Nuxt 框架设计**的做法。

---

## 7. 选择调用方式的快速参考

| 场景 | 推荐做法 |
|---|---|
| 新增业务 API 调用（GET/POST 后端数据） | 在对应 `features/*/services/*.repository.ts` 中用 `createApiClient()` |
| 需要 Node.js 专有包（仅服务端执行） | 在 `server/api/` 下新增服务端路由 |
| 需要定制错误提示文案 | 在 composable 中用 `toNuxtErrorPayload(err, { notFound: '...' })` |
| 需要打错误日志 | 用 `logAppError(scope, action, error)`，不要直接 `console.error` |
| 新增 API 端点路径 | 先加到 `shared/api/endpoints.ts` 再使用 |
