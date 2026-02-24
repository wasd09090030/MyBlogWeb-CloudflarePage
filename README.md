# 个人博客系统 (MyBlogWeb)

一个现代化的全栈个人博客系统，采用 Nuxt 3 + ASP.NET Core 8.0 架构，支持文章管理、评论系统、图片画廊、音乐播放和 osu! beatmap 展示功能。

## ✨ 核心特性

- 🎵 **音乐播放器** - 内置高品质背景音乐播放
- 📝 **文章系统** - Markdown 编辑，分类管理，实时搜索，SEO 优化
- 💬 **评论功能** - 完整的评论发表和管理系统
- 🖼️ **图片画廊** - 多种展示模式（幻灯片、手风琴、3D覆盖流、瀑布流）
- 🎮 **Beatmap 管理** - osu! 谱面展示和管理
- 🔐 **JWT 认证** - 安全的身份验证，Token 自动刷新机制
- 🛡️ **管理后台** - 功能完整的内容管理系统
- 📱 **响应式设计** - 完美适配各种设备
- 🌙 **主题切换** - 明暗主题，自动保存偏好
- ⚡ **性能优化** - 路由预加载、懒加载、图片优化

## 🚀 技术栈

### 前端 (Nuxt 3)
- **框架**: Nuxt 3 + Vue 3 (Composition API)
- **状态管理**: Pinia
- **UI 框架**: NaiveUI + TailwindCSS
- **构建工具**: Vite
- **Markdown**: MDC (Markdown Components)
- **图片轮播**: Keen Slider
- **动画**: CSS Transitions + Transform

### 后端 (.NET 8.0)
- **框架**: ASP.NET Core Web API 8.0
- **ORM**: Entity Framework Core
- **数据库**: SQLite
- **身份认证**: JWT (Access Token + Refresh Token)
- **图床集成**: Cloudflare Images

### 特色功能
- 组件化开发，高度模块化
- RESTful API 设计
- JWT 双 Token 认证（2小时有效期 + 7天刷新）
- 自动 Token 刷新（后台定时器 + 智能重试）
- 图片预加载和懒加载
- 页面过渡动画
- SEO 友好（动态 meta、sitemap）

## 📁 项目结构

```
MyBlogWeb/
├── nuxt/                           # 前端 Nuxt 3 项目
│   ├── app/
│   │   ├── components/            # Vue 组件
│   │   │   ├── gallery/          # 画廊组件（轮播、手风琴等）
│   │   │   ├── ArticleList/      # 文章列表组件
│   │   │   └── ArticleDetail/    # 文章详情组件
│   │   ├── composables/           # 组合式函数
│   │   ├── functions/             # 工具函数模块
│   │   │   ├── ArticleList/      # 文章列表功能
│   │   │   └── Gallery/           # 画廊功能（图片加载、缩放、拖拽）
│   │   ├── layouts/               # 布局组件
│   │   ├── pages/                 # 页面路由
│   │   ├── stores/                # Pinia 状态管理
│   │   └── utils/                 # 工具函数
│   ├── public/                    # 静态资源
│   └── nuxt.config.ts            # Nuxt 配置
│
├── backend-dotnet/                # 后端 .NET 项目
│   └── BlogApi/
│       ├── Controllers/           # API 控制器
│       ├── Services/              # 业务逻辑层
│       ├── Models/                # 数据模型
│       ├── DTOs/                  # 数据传输对象
│       ├── Data/                  # 数据库上下文
│       ├── Utils/                 # 工具类
│       └── appsettings.json      # 配置文件
│
└── README.md                      # 项目文档
```

## 🛠️ 快速开始

### 环境要求
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **.NET SDK** >= 8.0

### 安装依赖

```bash
# 前端依赖
cd nuxt
npm install

# 后端自动管理依赖（通过 .csproj）
```

### 开发环境运行

```bash
# 1. 启动后端服务 (默认 http://localhost:3000)
cd backend-dotnet/BlogApi
dotnet run

# 2. 启动前端开发服务器 (默认 http://localhost:3000)
cd nuxt
npm run dev
```

### 管理后台
- **地址**: http://localhost:3000/admin/login
- **默认密码**: `admin123` ⚠️ **请在首次登录后立即修改**

## 📦 构建部署

### 前端构建

```bash
cd nuxt
npm run build          # 生产环境构建
npm run generate       # 静态站点生成 (SSG)
npm run preview        # 预览构建结果
```

### 后端构建

```bash
cd backend-dotnet/BlogApi
dotnet build -c Release
dotnet publish -c Release -o ./publish
```

### 生产环境部署

```bash
# 使用 PM2 管理 Nuxt 应用（参考 nuxt/ecosystem.config.js）
cd nuxt
pm2 start ecosystem.config.js --env production

# 使用 systemd 或 Docker 部署 .NET API
```

## 🎯 主要功能

### 文章系统
- ✅ Markdown 编辑和渲染（支持 MDC 组件）
- ✅ 文章分类（学习、游戏、作品、资源、其他）
- ✅ 实时搜索和分页显示
- ✅ 文章点赞统计
- ✅ SEO 优化（动态 meta 标签、URL slugify）
- ✅ 代码高亮和语法支持
- ✅ 目录（TOC）自动生成和高亮跟踪

### 评论系统
- ✅ 用户评论发表和展示
- ✅ 管理员审核和删除
- ✅ 评论点赞功能
- ✅ 实时评论计数

### 图片画廊
- ✅ 多种展示模式：
  - 淡入淡出幻灯片
  - 手风琴横向展示
  - 3D 覆盖流效果
  - 响应式瀑布流布局
- ✅ 全屏查看模式（缩放、拖拽、滚轮操作）
- ✅ 图片预加载和懒加载
- ✅ 加载进度显示
- ✅ 游戏截图专区

### 身份认证系统
- ✅ JWT Access Token（2小时有效期）
- ✅ Refresh Token（7天有效期）
- ✅ 自动刷新机制：
  - 后台定时器（每10分钟检查）
  - 提前30分钟自动续期
  - 401 错误智能重试
- ✅ Cookie 持久化
- ✅ 登录状态保持

### 管理后台
- ✅ 文章 CRUD 操作
- ✅ 评论管理和统计
- ✅ 画廊图片管理
- ✅ Beatmap 导入和管理
- ✅ Cloudflare Images 图床配置
- ✅ Markdown 编辑器集成

### 用户界面
- ✅ 响应式设计，完美适配移动端
- ✅ 明暗主题切换（自动保存偏好）
- ✅ 流畅页面过渡动画
- ✅ 智能导航栏
- ✅ 骨架屏加载状态
- ✅ Toast 提示系统

## 🔧 性能优化

### 前端优化
- **路由预加载**: 使用 `prefetchOn` 智能预加载链接
- **组件拆分**: 页面组件模块化（index.vue 拆分为多个子组件）
- **懒加载**: 图片和路由按需加载
- **代码分割**: 动态导入减少初始包体积
- **缓存策略**: 合理使用浏览器缓存

### 图片优化
- **并发控制**: 限制同时加载图片数量（5个并发）
- **渐进加载**: 优先加载前15张，其余按需加载
- **预览图**: 加载过程中显示预览图
- **格式优化**: 支持 WebP 等现代格式

### API 优化
- **连接池**: Entity Framework Core 连接管理
- **查询优化**: 合理使用 Include 和分页
- **响应压缩**: 启用 Gzip/Brotli 压缩

## 🐛 最近改进

### v2.1.0 (2026-02-10)
- ✅ **图片画廊重构**: 拆分大文件，提取工具函数到独立模块
  - `imageLoader.js` - 图片预加载管理
  - `zoomAndDrag.js` - 缩放和拖拽交互
  - `sliderManager.js` - Slider 生命周期管理
  - `utils.js` - 通用工具函数
- ✅ **身份认证优化**: 修复长时间写作时 Token 过期问题
  - Token 有效期延长至 2 小时
  - 增加后台定时检查（每10分钟）
  - 提前30分钟自动刷新（原5分钟）
  - 401 错误智能重试机制
- ✅ **文章列表优化**: 组件模块化拆分
  - CategoryBar、ArticleCard、ArticlePagination
- ✅ **TOC 修复**: 解决首次加载不高亮 Bug
- ✅ **路由过渡**: 优化页面切换动画，减少卡顿

## 📚 配置说明

### 环境变量 (nuxt/.env)

```env
NUXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
NUXT_PUBLIC_SITE_URL=http://localhost:3000
```

### JWT 配置 (backend-dotnet/BlogApi/appsettings.json)

```json
{
  "Jwt": {
    "SecretKey": "your-secret-key-min-32-chars",
    "Issuer": "BlogApi",
    "Audience": "BlogClient",
    "AccessTokenExpirationMinutes": 120,
    "RefreshTokenExpirationDays": 7
  }
}
```

### 图床配置

支持 Cloudflare Images 图床，需在管理后台配置：
- Account ID
- API Token
- Account Hash

详见：[IMAGEBED_IMPLEMENTATION.md](IMAGEBED_IMPLEMENTATION.md)

## 📱 浏览器支持

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 📖 相关文档

- [API 接口文档](API_INTERFACE_DOCUMENTATION.md)
- [图床实现说明](IMAGEBED_IMPLEMENTATION.md)
- [SEO 优化指南](SEO_UPGRADE.md)
- [MDC 组件指南](MDC_COMPONENTS_GUIDE.md)
- [Worker 图片安全](WORKER_IMAGE_SECURITY.md)

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发规范
- 前端：2 空格缩进，Vue 3 Composition API
- 后端：4 空格缩进，PascalCase 命名
- 提交信息：简洁描述，中英文均可

## 📄 许可证

MIT License

## 🙏 致谢

- [Nuxt 3](https://nuxt.com/) - 强大的 Vue 框架
- [ASP.NET Core](https://dotnet.microsoft.com/apps/aspnet) - 高性能后端框架
- [NaiveUI](https://www.naiveui.com/) - 优雅的 Vue 3 组件库
- [Keen Slider](https://keen-slider.io/) - 流畅的轮播组件

---

**开发者**: WyrmKk  
**最后更新**: 2026-02-10
