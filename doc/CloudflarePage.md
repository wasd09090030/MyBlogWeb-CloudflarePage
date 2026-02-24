 已完成（本聊天已改）

  1. backend-dotnet/BlogApi/appsettings.json：已补 Cors:AllowedOrigins 白名单。效果：后端只允许指定域名跨域。
  2. backend-dotnet/BlogApi/Program.cs：已改为从配置读取 CORS，不再 AllowAnyOrigin()。效果：默认不开放全网跨域。
  3. .github/workflows/release.yml：已改生产构建 API 变量为 https://backend.wasd09090030.top/api。效果：前端构建默认走 HTTPS API。

  ———

  Cloudflare Pages 迁移（必须改）

  1. nuxt-public/（新目录，建议从 nuxt/ 精简复制）

  - 怎么做：只保留前台页面和依赖（首页、文章、画廊、about）。
  - 达到效果：前台独立项目，重建快，不受 admin/tools 影响。
  - 保留：原 nuxt/ 继续承载后台管理。

  2. nuxt-public/nuxt.config.ts

  - 怎么做：
      - runtimeConfig.public.apiBase 和 apiBaseServer 指向 https://backend.wasd09090030.top/api。
      - 去掉/替换 nitro.preset = 'node-server' 的依赖思路，按静态站配置。
      - 配置 nitro.prerender，并用 hooks['prerender:routes'] 动态拉文章列表生成 /article/*。
      - nitro.prerender.autoSubfolderIndex = false（Cloudflare 路由匹配兼容）。
  - 达到效果：构建期生成静态文章页，Cloudflare Pages 直接托管。
  - 保留：现有 SEO、Schema、MDC 渲染逻辑。

  3. nuxt-public/package.json

  - 怎么做：确保有 generate 脚本（nuxt generate）。
  - 达到效果：Cloudflare 可直接使用静态产物。
  - 保留：dev、typecheck 脚本。

  4. nuxt-public/app/features/article-list/containers/ArticleListPageContainer.vue

  - 怎么做：把首屏数据获取从纯 onMounted 改成 useAsyncData（初始列表）。
  - 达到效果：首页 HTML 构建时就有内容，SEO/首屏更好。
  - 保留：现有分页、筛选、交互逻辑。

  5. nuxt-public/app/features/gallery-public/containers/GalleryPageContainer.vue

  - 怎么做：首屏 gallery 数据改 useAsyncData；图片预加载和 slider 保持客户端执行。
  - 达到效果：画廊页面静态可见，交互仍保留。
  - 保留：你现在的 Worker 预加载与动画。

  6. nuxt-public/app/features/article-detail/composables/useArticleDetailPage.ts

  - 怎么做：确保详情数据在预渲染阶段会请求并落盘（关键是 asyncData key 和 prerender 路由一致）。
  - 达到效果：文章详情可直出静态页，不依赖首次客户端请求。
  - 保留：canonical、SEO、TOC、结构化数据逻辑。

  7. nuxt-public/.env.production

  - 怎么做：写入
    NUXT_PUBLIC_API_BASE_URL=https://backend.wasd09090030.top/api
    NUXT_API_BASE_URL=https://backend.wasd09090030.top/api
    NUXT_PUBLIC_SITE_URL=https://blog.wasd09090030.top
  - 达到效果：构建与运行期一致走 HTTPS 后端。
  - 保留：其他生产参数。

  ———

  Cloudflare Pages 配置（非文件项）

  1. Root directory：nuxt-public
  2. Build command：npm ci && npm run generate
  3. Output directory：.output/public
  4. 环境变量：与 nuxt-public/.env.production 一致（Preview/Production 都配）

  ———

  可选改（第二阶段）

  1. .github/workflows/pages-public.yml（新建）

  - 怎么做：只在 nuxt-public/** 变更时触发部署。
  - 效果：前台自动化发布更清晰。
  - 保留：现有 release 流程用于原项目/后台。
  ———

  明确保留不改

  1. nuxt/app/pages/admin/**、nuxt/app/features/*-admin/**：继续在原项目。
  2. backend-dotnet/BlogApi/Controllers/** 业务接口路径：不改协议、不改资源模型。
  3. nuxt/NuxtNginx.txt 的本地反代思路：继续用于自托管场景。
