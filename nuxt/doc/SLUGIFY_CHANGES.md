# Slugify 改动记录

日期：2026-02-01  
范围：Nuxt 前端、ASP.NET Core 后端、数据库结构

## 目标

- 文章详情页使用更友好的 SEO URL：`/article/{id}-{slug}`
- 保留 `id` 稳定性，slug 可读且可变更
- 旧链接 ` /article/{id}` 301 跳转到规范 URL

## 后端改动（BlogApi）

### 模型与数据库

- 新增字段：`Article.Slug`
- 表 `articles` 新增列 `slug`，并建立唯一索引

相关文件：
- `backend-dotnet/BlogApi/Models/Article.cs`
- `backend-dotnet/BlogApi/Data/BlogDbContext.cs`

### DTO

新增 `Slug` 字段（Create/Update/Summary/WithComments）：
- `backend-dotnet/BlogApi/DTOs/ArticleDto.cs`

### Slug 生成逻辑

- 新增 `SlugHelper.Slugify`（英文 slug）
- 创建文章时：`Slug = GenerateUniqueSlugAsync(dto.Slug ?? dto.Title)`
- 更新文章时：若传 `slug` 则更新，否则仅在空值时补全
- 自动去重：发现重复时追加 `-2/-3/...`

相关文件：
- `backend-dotnet/BlogApi/Utils/SlugHelper.cs`
- `backend-dotnet/BlogApi/Services/ArticleService.cs`

## 前端改动（Nuxt）

### 详情页路由与 SEO

- 详情页支持 `id-slug`：`/article/{id}-{slug}`
- 解析 `route.params.id`，提取 `id` 请求数据
- slug 不匹配时 301 跳转到 canonical URL
- 增加 `canonical` 与 `og:url`

相关文件：
- `nuxt/app/pages/article/[id].vue`

### 列表与后台预览链接

所有跳转链接统一使用 `id-slug`，若无 slug 则回退 `id`：

- 首页列表：`nuxt/app/pages/index.vue`
- 教程列表：`nuxt/app/pages/tutorials.vue`
- 随机跳转：`nuxt/app/components/WelcomeSection.vue`
- 后台仪表盘：`nuxt/app/pages/admin/index.vue`
- 后台文章列表：`nuxt/app/pages/admin/articles/index.vue`

### 后台编辑器

- 增加可选 slug 输入框（英文）
- 留空时由后端自动生成

相关文件：
- `nuxt/app/pages/admin/articles/[id].vue`

## 数据库迁移说明（SQLite）

项目当前使用 `EnsureCreated`，不会自动迁移已有表，需手动执行：

```sql
ALTER TABLE articles ADD COLUMN slug TEXT;
UPDATE articles SET slug = 'article-' || id WHERE slug IS NULL OR slug = '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
```

## URL 规范

- 规范 URL：`/article/{id}-{slug}`
- 旧 URL：`/article/{id}`（自动 301）
- slug 可手动修改，修改后仍通过 301 统一到最新规范 URL

## 注意事项

- 中文标题会被过滤为英文 slug（若结果为空，会回退为 `article` 并追加序号）
- 若对历史文章要求更好的英文 slug，可在后台手动填写并保存

