## ADDED Requirements

### Requirement: 文章列表摘要接口返回封面缩略图地址
文章摘要类接口（`GET /api/articles?summary=true`、`GET /api/articles/search`）返回的每篇文章 SHALL 携带 `thumbnailUrl` 字段，其值由后端基于 `CoverImage` 与全局 `CfImageConfig` 动态生成，不落库存储。

#### Scenario: 缩略图配置已启用
- **WHEN** 客户端请求文章摘要列表，且全局 `CfImageConfig.IsEnabled` 为 true
- **THEN** 返回的每篇文章的 `thumbnailUrl` 是基于 `CfImageConfig`（宽度、质量、格式、fit 等参数）生成的缩放后图片地址

#### Scenario: 缩略图配置未启用或缺失
- **WHEN** 客户端请求文章摘要列表，且 `CfImageConfig` 不存在或 `IsEnabled` 为 false
- **THEN** 返回的 `thumbnailUrl` 回退为该文章原始的 `coverImage` 地址

#### Scenario: 文章无封面图
- **WHEN** 文章的 `coverImage` 为空或 null
- **THEN** 返回的 `thumbnailUrl` 为 null，不生成任何缩略图地址

### Requirement: 文章列表页封面图优先使用缩略图
文章列表卡片（ArticleCard）渲染封面图时 SHALL 优先使用后端返回的 `thumbnailUrl`，仅当 `thumbnailUrl` 不存在时才回退使用 `coverImage`。

#### Scenario: 缩略图字段存在
- **WHEN** 文章数据包含非空的 `thumbnailUrl`
- **THEN** 列表卡片的 `<img>` 元素的 `src` 使用 `thumbnailUrl`

#### Scenario: 缩略图字段缺失
- **WHEN** 文章数据的 `thumbnailUrl` 为空或未定义，但 `coverImage` 存在
- **THEN** 列表卡片的 `<img>` 元素的 `src` 回退使用 `coverImage`

### Requirement: 文章详情页封面图始终使用原图
文章详情页（ArticleDetail）的封面图组件 SHALL 始终渲染 `coverImage` 原图地址，不受列表页缩略图逻辑影响，且详情类接口（`GET /api/articles/{id}`、完整文章列表接口）不需要返回 `thumbnailUrl` 字段。

#### Scenario: 查看文章详情
- **WHEN** 用户打开某篇文章的详情页
- **THEN** 封面图组件的 `<img>` 元素的 `src` 使用该文章的 `coverImage` 原图地址，而非任何缩放后的地址
