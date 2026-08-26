# 未引用内容清理记录

日期：2026-08-24

## 处理结果

本次清理将确认未被项目代码、配置、构建入口或运行时资源引用的内容移动到：

`tmp/archive/2026-08-24-design-preview/`

归档目录保留原始目录结构，当前共 34 个文件，包含：

- 设计预览页面及其未使用的配套图片
- 已废弃的 `PeachSunsetScene.vue`
- 旧公共图片、鼠标指针和走马灯图标资源
- 已停用的 `IconMarquee.vue` 及其布局测试
- 当前已不再保留的测试脚本

文件没有直接删除，移动前后的内容已通过 SHA-256 校验确认一致。

## 保留内容

- `nuxt-admin/migrations/0004_gallery_hero_items.sql`：数据库迁移入口，继续保留。
- MDC 内容组件：由 Nuxt 全局组件发现、Markdown 语法或后台模板使用。
- 画廊、动态特效和后台编辑器组件：仍存在运行时或模板引用。
- Open Sans、站点 Logo、加载图和樱花图片：仍有构建或页面引用。
- `nuxt-public/public/hero/girl-full-silhouette.png`：仍被首页 Hero 的 CSS mask 引用，未归档。

本次同时归档 `cloudflare-worker/router.test.mjs` 和 `nuxt-public/scripts/game-gallery-bento-layout.test.mjs`，并移除仅用于执行前者的失效 `npm test` 脚本。

## 注意事项

仓库根目录 `.gitignore` 当前忽略整个 `tmp/`，因此归档文件只存在于本机，不会被 Git 纳入提交。若需要让归档内容跨机器保留，应在提交前将归档目录迁移到受 Git 跟踪的目录，或增加对应的 `.gitignore` 例外规则。
