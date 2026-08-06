# 画廊胶片入场设计

## 目标

将画廊的初始加载遮罩从纯文字、毛玻璃和漂浮光斑改为天蓝色胶片掠过效果，让进入画廊时先看到预加载的真实画面，同时不增加网络请求。

## 方案

`GalleryLoadingAnimation` 继续接收现有的 `loadingProgress` 和 `previewImages`。组件从预览列表取前三张图片作为胶片帧；不足三张时循环复用可用图片，完全没有图片时只显示天蓝色背景、进度和状态文本。胶片带作为全屏遮罩背景的一部分，倾斜后缓慢横移。

视觉基调使用天蓝色：深色遮罩为 `#0A2433`，主色为 `#4CC9F0`，浅色高光为 `#B8F3FF`，中间阴影为 `#123B52`。中央信息仅保留等宽进度数值和“照片正在显影”，移除 `GALLERY` 字母逐字动画、品牌副标题及渐变光斑。加载层消失仍由现有 `loading-fade` 路由内过渡负责。

## 响应式与可访问性

桌面端显示三帧 160:215 的胶片。移动端缩小胶片帧、降低倾角并维持信息对比度。`prefers-reduced-motion: reduce` 下取消横移及入场动画，直接显示静止胶片带；进度继续使用 `role=status` 和 `aria-live=polite`。

## 文件边界

- 修改 `nuxt-public/app/components/GalleryLoadingAnimation.vue`：预览图 URL 派生、胶片标记及组件模板。
- 创建 `nuxt-public/app/assets/css/components/GalleryLoadingAnimation.desktop.css`：桌面基础样式与关键帧。
- 创建 `nuxt-public/app/assets/css/components/GalleryLoadingAnimation.mobile.css`：仅限 768px 断点的移动覆盖。

样式从 SFC 中移出，遵循项目的桌面/移动物理分离约定；不改变画廊的预加载、计时、淡出和滑块初始化逻辑。

## 验证

检查三种预览图数量状态的渲染路径，确认降低动态偏好规则存在，并运行 Nuxt 静态生成确保模板、样式导入和构建均可通过。
