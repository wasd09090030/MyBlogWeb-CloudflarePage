# Nuxt 3 博客前台

这是从Vue3项目迁移过来的Nuxt 3博客前台应用。

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

访问: http://localhost:3000

### 构建生产版本
```bash
npm run build
```

## 📁 项目结构

- `components/` - 通用组件（自动导入）
- `composables/` - API composables（自动导入）
- `layouts/` - 布局组件
- `pages/` - 页面组件（文件路由）
- `plugins/` - 插件
- `public/` - 静态资源
- `stores/` - Pinia状态管理

## ⚙️ 环境配置

创建`.env`文件并配置：

```bash
NUXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
NUXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 🎯 功能特性

- ✅ 文章列表（分页、搜索、筛选）
- ✅ 文章详情（Markdown、代码高亮、评论）
- ✅ 图片画廊
- ✅ SSR服务端渲染
- ✅ SEO优化

## 🛠️ 技术栈

- Nuxt 3.20.0
- Vue 3.5.22
- Pinia 2.1.7
- Bootstrap 5.3.6

更多详情请查看 MIGRATION_SUMMARY.md
