# Legacy Nuxt SSR Admin

`nuxt/` 是迁移前的 SSR 管理后台，已由 `nuxt-admin/` 替代并冻结。

它仅保留为短期生产回滚和历史实现参考。不要在此目录添加页面、功能或新的依赖；所有 `/admin/*` 的新开发必须进入 `../nuxt-admin/`，并使用 Nuxt 4 SSR、Nuxt UI v4 和同源 Cookie BFF。

当前活动后台的开发与部署说明见 [../nuxt-admin/README.md](../nuxt-admin/README.md)。
