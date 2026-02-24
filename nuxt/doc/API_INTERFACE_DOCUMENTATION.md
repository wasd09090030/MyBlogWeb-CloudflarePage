# 前后端接口调连文档

本文档详细描述了前端 Nuxt 应用与后端 .NET 8 API 之间的接口交互规范、数据结构及调用方式。

## 1. 基础配置

### 1.1 API 基础地址
- **生产环境**: `https://blog.wasd09090030.top/api`
- **开发环境**: `http://localhost:5000/api`

### 1.2 前端配置 (.env)
```ini
NUXT_PUBLIC_API_BASE_URL=https://blog.wasd09090030.top/api
```

### 1.3 认证机制
- **方式**: JWT (JSON Web Token)
- **Header**: `Authorization: Bearer {token}`
- **刷新机制**: 双 Token 机制 (Access Token + Refresh Token)

---

## 2. 认证模块 (Auth)

### 2.1 管理员登录
- **端点**: `POST /auth/login`
- **前端调用**: `useAuthStore().verifyAdminPassword(password)` / `login(username, password)`
- **请求体 (LoginDto)**:
  ```json
  {
    "username": "admin",
    "password": "your_password"
  }
  ```
- **响应体 (AuthResponse)**:
  ```json
  {
    "success": true,
    "message": "登录成功",
    "token": "eyJhbGci...",
    "refreshToken": "7f8e...",
    "expiresAt": "2023-10-27T10:00:00Z"
  }
  ```

### 2.2 刷新 Token
- **端点**: `POST /auth/refresh`
- **前端调用**: `useAuthStore().refreshAccessToken()`
- **请求体 (RefreshTokenDto)**:
  ```json
  {
    "refreshToken": "7f8e..."
  }
  ```
- **响应体**: 同登录响应

### 2.3 登出
- **端点**: `POST /auth/logout`
- **前端调用**: `useAuthStore().logout()`
- **Header**: 需要认证
- **响应体**:
  ```json
  {
    "success": true,
    "message": "已成功登出"
  }
  ```

### 2.4 修改密码
- **端点**: `POST /auth/change-password`
- **前端调用**: `useAuthStore().changePassword(current, new)`
- **Header**: 需要认证
- **请求体 (ChangePasswordDto)**:
  ```json
  {
    "currentPassword": "old_password",
    "newPassword": "new_password"
  }
  ```

---

## 3. 文章模块 (Articles)

### 3.1 获取文章列表
- **端点**: `GET /articles`
- **前端调用**: `useArticles().getArticles({ page, limit, category, summary })`
- **参数**:
  - `page`: 页码 (可选)
  - `limit`: 每页数量 (可选)
  - `category`: 分类 ID (可选)
  - `summary`: 是否返回摘要 (可选, 默认为 false)
- **响应体**: 
  - 分页模式:
    ```json
    {
      "items": [ ... ],
      "totalItems": 100,
      "page": 1,
      "pageSize": 10,
      "totalPages": 10
    }
    ```
  - 列表模式: `[ Article, ... ]`

### 3.2 获取文章详情
- **端点**: `GET /articles/{id}`
- **前端调用**: `useArticles().getArticleById(id)`
- **响应体 (Article)**:
  ```json
  {
    "id": 1,
    "title": "文章标题",
    "content": "HTML内容",
    "contentMarkdown": "Markdown内容",
    "coverImage": "https://...",
    "category": 1,
    "tags": ["tag1", "tag2"],
    "createdAt": "...",
    "updatedAt": "...",
    "views": 100,
    "likes": 10
  }
  ```

### 3.3 获取推荐文章
- **端点**: `GET /articles/featured`
- **前端调用**: `useArticles().getFeaturedArticles(limit)`
- **参数**: `limit` (默认 5)
- **响应体**: `[ Article, ... ]`

### 3.4 搜索文章
- **端点**: `GET /articles/search`
- **前端调用**: `useArticles().searchArticles(keyword)`
- **参数**: `keyword`
- **响应体**: `[ ArticleSummaryDto, ... ]`

### 3.5 创建文章 (Admin)
- **端点**: `POST /articles`
- **前端调用**: `useAdminArticles().createArticle(dto)`
- **Header**: 需要认证
- **请求体 (CreateArticleDto)**:
  ```json
  {
    "title": "标题",
    "content": "HTML",
    "contentMarkdown": "MD",
    "coverImage": "url",
    "category": 1,
    "tags": ["tag"],
    "aiSummary": "摘要"
  }
  ```

### 3.6 更新文章 (Admin)
- **端点**: `PUT /articles/{id}`
- **前端调用**: `useAdminArticles().updateArticle(id, dto)`
- **Header**: 需要认证
- **请求体 (UpdateArticleDto)**: 同创建，字段可选

### 3.7 删除文章 (Admin)
- **端点**: `DELETE /articles/{id}`
- **前端调用**: `useAdminArticles().deleteArticle(id)`
- **Header**: 需要认证

---

## 4. 评论模块 (Comments)

### 4.1 获取文章评论
- **端点**: `GET /comments/article/{articleId}`
- **前端调用**: `useComments().getCommentsByArticle(articleId)`
- **响应体**: `[ Comment, ... ]`

### 4.2 提交评论
- **端点**: `POST /comments`
- **前端调用**: `useComments().submitComment(commentData)`
- **请求体 (CreateCommentDto)**:
  ```json
  {
    "content": "评论内容",
    "author": "昵称",
    "email": "email@example.com",
    "website": "https://...",
    "articleId": 1,
    "parentId": null
  }
  ```

### 4.3 点赞评论
- **端点**: `POST /comments/{id}/like`
- **前端调用**: `useComments().likeComment(commentId)`

### 4.4 评论管理 (Admin)
- **获取所有**: `GET /comments/admin/all`
- **获取待审核**: `GET /comments/admin/pending`
- **更新状态**: `PATCH /comments/admin/{id}/status`
  - Body: `{ "status": "approved" | "rejected" }`
- **删除**: `DELETE /comments/admin/{id}`

---

## 5. 画廊模块 (Gallery)

### 5.1 获取公开画廊
- **端点**: `GET /gallery`
- **前端调用**: `useGallery().getGalleries()`
- **描述**: 获取所有状态为 Active 的图片
- **响应体**: `[ Gallery, ... ]`

### 5.2 画廊管理 (Admin)
- **获取所有**: `GET /gallery/admin` (包含非激活图片)
- **创建**: `POST /gallery`
  - Body: `{ "imageUrl": "url", "sortOrder": 0, "isActive": true }`
- **更新**: `PATCH /gallery/{id}`
- **获取图片宽高**: `GET /gallery/{id}/dimensions`
- **刷新图片宽高**: `POST /gallery/refresh-dimensions`
- **删除**: `DELETE /gallery/{id}`
- **批量排序**: `PATCH /gallery/batch/sort-order`
  - Body: `[ { "id": 1, "sortOrder": 1 }, ... ]`
- **切换状态**: `PATCH /gallery/{id}/toggle-active`
- **批量导入**: `POST /gallery/batch/import`
  - Body: `{ "imageUrls": ["url1", "url2"], "isActive": true }`

---

### 5.3 Cloudflare 缩略图配置 (Admin)
- **获取配置**: `GET /cf-image-config`
- **保存配置**: `POST /cf-image-config`
  - Body:
    ```json
    {
      "isEnabled": true,
      "zoneDomain": "imgbed.test.test",
      "useHttps": true,
      "fit": "scale-down",
      "width": 300,
      "quality": 50,
      "format": "webp",
      "signatureParam": "sig",
      "useWorker": true,
      "workerBaseUrl": "https://imgworker.wasd09090030.top",
      "tokenTtlSeconds": 3600,
      "signatureToken": "",
      "signatureSecret": "your-secret"
    }
    ```

---

## 6. AI 辅助模块 (Ai)

### 6.1 生成文章摘要
- **端点**: `POST /ai/summary`
- **请求体**:
  ```json
  {
    "content": "文章正文内容...",
    "title": "文章标题"
  }
  ```
- **响应体**:
  ```json
  {
    "summary": "AI生成的摘要内容..."
  }
  ```

---

## 7. 数据模型定义

### Article (文章)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 主键 |
| title | string | 标题 |
| content | string | HTML内容 |
| contentMarkdown | string | Markdown源码 |
| category | enum | 0:技术, 1:生活, 2:其他 |
| tags | string[] | 标签列表 |
| viewCount | int | 阅读量 |
| likeCount | int | 点赞数 |
| createdAt | datetime | 创建时间 |

### Comment (评论)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 主键 |
| content | string | 内容 |
| author | string | 作者 |
| status | string | pending/approved/rejected |
| articleId | int | 关联文章ID |
| parentId | int? | 父评论ID |

### Gallery (画廊)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 主键 |
| imageUrl | string | 图片地址 |
| thumbnailUrl | string? | 缩略图地址（Cloudflare 转换） |
| imageWidth | int? | 图片宽度 |
| imageHeight | int? | 图片高度 |
| sortOrder | int | 排序权重 |
| isActive | bool | 是否显示 |

---

## 8. 前端实现对齐说明（2026-02）

以下为当前 Nuxt 前端已落地的实现约束，用于避免文档与代码漂移：

### 8.1 统一端点来源
- 前端端点统一由 `app/shared/api/endpoints.ts` 提供，禁止在 feature/page 层散落硬编码路径。
- 关键端点（已对齐）：
  - 文章：`/articles`、`/articles/{id}`
  - AI 概要：`/ai/summary`
  - 画廊公开：`/gallery`（注意不是 `/galleries`）
  - 画廊管理：`/gallery/admin`、`/gallery/{id}/toggle-active`、`/gallery/batch/import`、`/gallery/batch/sort-order`

### 8.2 统一缓存 Key 规则
- 文章列表缓存 key 统一通过 `app/shared/cache/keys.ts` 构建：
  - `buildArticlesListCacheKey({ summary, page, limit, category })`
- 推荐列表缓存 key：
  - `buildFeaturedArticlesCacheKey(limit)`
- 文章详情 `useAsyncData` key：
  - `buildArticleAsyncDataKey(idOrRouteParam, slug?)`

### 8.3 预取写回与页面读取对齐
- Worker 预取插件 `app/plugins/workerPrefetch.client.ts` 预取文章后，会将结果写入：
  - 预取 map 缓存（防重复预取）
  - `articlePreloadCache`（供详情页 `getCachedData` 读取）
- 详情页 `app/features/article-detail/composables/useArticleDetailPage.ts` 使用相同 key 规则读取预取缓存，避免“预取成功但页面未命中”。
