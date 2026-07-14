# Tasks: Tailwind CSS v4 升级

## 1. 依赖与构建配置

- [x] 1.1 package.json：tailwindcss 升 4.x，新增 @tailwindcss/vite，移除 autoprefixer / cssnano / postcss
- [x] 1.2 nuxt.config.ts：移除 postcss 配置块，vite.plugins 注入 tailwindcss()

## 2. CSS 入口与配置移植

- [x] 2.1 tailwind.css：改为 @import "tailwindcss" + @plugin "@tailwindcss/typography" + @custom-variant dark
- [x] 2.2 tailwind.css：加入 v3 兼容基础样式（边框默认色 / 占位符色 / 按钮指针）
- [x] 2.3 prose 定制从 tailwind.config.js 移植为 CSS（新文件 app/assets/css/components/prose-theme.css：两态变量写死 + 未被 prose-custom 覆盖的元素样式 + lg 覆盖；blog 死配置不移植）
- [x] 2.4 删除 tailwind.config.js

## 3. 工具类改名

- [x] 3.1 运行 npx @tailwindcss/upgrade 处理 .vue 中的 v3 类名改名（9 个文件：shadow-sm→shadow-xs、flex-shrink-0→shrink-0、bg-gradient-to-r→bg-linear-to-r 等），git diff 已审查；工具对 layout.css 的无关字节规范化已还原

## 4. 验证

- [x] 4.1 npm run generate 构建通过（158 路由预渲染；link-checker 报的 /tools、/mania 404 为布局中历史存在的外链，与本次无关）
- [x] 4.2 静态产物预览目视回归：首页（明/暗）、文章详情 prose + Naive UI 评论表单（明/暗）、画廊时间线 editorial 布局——均正常，控制台无错误/警告
- [x] 4.3 未发现回归差异；CSS 体积对比未执行（dist/ 是 .output/public 镜像，无 v3 基线），新产物 CSS 总计 314K

## 5. 收尾

- [x] 5.1 更新 .memory（progress + 索引），确认 .memory 未被暂存（工作区无任何暂存内容）
