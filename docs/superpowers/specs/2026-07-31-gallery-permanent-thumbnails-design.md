# 画廊永久缩略图设计

## 背景

文章封面已经使用稳定的 `/images/thumb/i_<publicId>.webp` 路径。Cloudflare Worker 解析 `ImageAsset` 后生成 WebP 缩略图，并返回 `Cache-Control: public, max-age=31536000, immutable`。画廊仍使用带 `exp` 参数的签名缩略图；静态生成后的页面必须在浏览器中重新请求画廊列表来刷新即将过期的 URL。这既降低缓存命中率，也使图片地址不稳定。

所有现有画廊图片均位于 `https://cfimg.wasd09090030.top/file/...`，满足永久缩略图 Worker 的受控源要求。

## 目标

- 画廊图片使用与文章封面相同的、由 `ImageAsset.PublicId` 派生的稳定缩略图 URL。
- 公共画廊页面不再检测 `exp` 或重新请求画廊列表来更新签名 URL。
- 新增、编辑、批量导入和既有画廊记录都可绑定受控来源的 `ImageAsset`。
- 维持后台对原始图床 URL 的编辑与尺寸探测能力。

## 非目标

- 不更改 Cloudflare Worker 的 `/images/thumb/*` 路由、图片变换参数或缓存时间。
- 不支持将任意外部 URL 迁移到永久缩略图通道。
- 不把图片复制到 Nuxt `public/` 目录，也不改变静态站发布流程。

## 方案

### 数据模型与迁移

`Gallery` 增加可空 `ImageAssetId` 及到 `ImageAsset` 的可选关系，删除关联素材时采用 `SetNull`。`DatabaseSchemaService` 在已有数据库上增量增加 `galleries.imageAssetId`，新数据库由 EF 模型直接创建该列。

`ImageAssetBackfillService` 的素材创建逻辑泛化为按图片 URL 和素材类型获取或创建 `ImageAsset`：

- 从 `cfimg.wasd09090030.top/file/...` 提取安全的 storage key。
- 基于 storage key 生成现有格式的稳定 public ID。
- 对已有 public ID 复用记录，不覆盖既有素材种类。
- 新建画廊素材使用 `ImageAssetKind.Gallery`。

文章封面继续调用该共享逻辑，行为保持不变。

### 后端行为

画廊创建、更新图片地址及批量导入时同步绑定画廊 `ImageAssetId`。图片地址更新为另一个对象路径时绑定相应的新素材；更新排序、标签和可见性时不改变素材绑定。

公共画廊查询使用关联素材生成 `thumbnailUrl`：当关联素材有效时，值为 `/images/thumb/i_<publicId>.webp`；没有有效关联素材时返回空值，不退回生成带时效签名的 URL。原始 `imageUrl` 继续供后台管理和尺寸探测使用，但公共前端不得作为图片资源回退。

新增一个受授权的画廊素材回填操作。它只处理尚未绑定素材的画廊项，跳过来源不合法的记录，并返回更新与跳过统计。后台画廊页提供一次性操作入口，成功后刷新列表。发布后须执行该操作，再触发 Cloudflare Pages 重建，使 `/gallery` 的 SSG payload 采用稳定 URL。

### 前端行为

公共画廊类型将 `thumbnailUrl` 作为必需的展示地址语义。所有缩略图、预加载、Hero、瀑布流和全屏预览使用 `thumbnailUrl`；无法获得永久缩略图的记录不加载原始 URL，并沿用已有图片加载失败处理。

移除 `GalleryPageContainer` 中读取 `exp`、判断过期和调用公共画廊 API 刷新 URL 的代码。首屏继续从 SSG payload 水化，无额外画廊列表请求。

后台画廊管理仍以 `imageUrl` 显示和编辑原始来源，便于修正素材地址和保留现有尺寸刷新功能。

## 错误处理与运维

- 不符合受控来源规则的地址不会创建或回填 `ImageAsset`，公共页面不会退回到原图或时效签名 URL。
- Worker 解析素材失败、源对象缺失或图片变换失败时保持既有的 HTTP 错误响应；客户端显示现有加载失败状态。
- `immutable` 的前提是不可原地替换同一对象路径的内容。替换图片必须上传为新对象路径并在后台更新画廊地址，得到新的 public ID 与缓存键。
- 回滚时可暂时恢复旧版本应用；已创建的 `image_assets` 记录和可空外键不影响旧代码读取原始 `imageUrl`。

## 验证

- 后端 SQLite 测试覆盖画廊素材回填、稳定 `thumbnailUrl`、创建和更新时的素材绑定，以及对非受控来源的拒绝。
- 验证公共画廊接口的缩略图 URL 不含 `exp`、`sig` 或时间相关参数。
- 验证画廊页面水化后不再发起刷新画廊列表的请求，且图片请求命中 `/images/thumb/i_<publicId>.webp`。
- 执行后端构建和公共 Nuxt 的定点类型/构建检查。
