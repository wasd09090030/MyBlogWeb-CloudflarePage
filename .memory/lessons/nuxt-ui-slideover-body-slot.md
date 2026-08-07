---
name: nuxt-ui-slideover-body-slot
description: Nuxt UI v4 USlideover 内容必须放 #body 具名插槽，默认插槽只渲染为 DialogTrigger 触发元素
metadata:
  type: lessons
  verified: 2026-08-06
  status: 已验证
---

# Nuxt UI v4 USlideover 内容必须放 `#body` 具名插槽

## 问题现象

实现 admin 文章编辑区侧边弹窗（`ArticleEditor.vue`，commit `7326696`）时，把元数据字段（Slug/分类/封面/标签/AI摘要/统计）直接写在 `<USlideover v-model:open="settingsOpen" title="文章设置">` 的**默认插槽**里。结果：字段**常驻内联渲染在编辑区下方**，而点击齿轮打开的弹窗正文为空；点击内联字段块还会误触发开关空弹窗。核心交付（元数据入弹窗）未达成。

## 已验证根因

读取安装的 `@nuxt/ui` 4.10.0 `node_modules/@nuxt/ui/dist/runtime/components/Slideover.vue`：

- L69-71：`<DialogTrigger v-if="!!slots.default" as-child>…` —— **默认插槽只用作弹窗触发元素**（`as-child` 内联渲染，类似按钮）。
- L140-142：面板正文只渲染 `<slot name="body" />`。
- 结论：元数据内容必须包进 `<template #body>`（或整体替换的 `#content`）才会进面板。

## 无效做法 / 失败条件

- 把内容直接放默认插槽 → 内容被当触发元素内联渲染在页面中，弹窗正文空。
- 仓库既有先例 `nuxt-admin/app/layouts/admin.vue:70-72` 正是用 `<template #body>`——踩坑前应先看同仓先例。

## 正确处理方式

```html
<USlideover v-model:open="settingsOpen" title="文章设置" side="right">
  <template #body>
    <div class="space-y-4">…内容…</div>
  </template>
</USlideover>
```

修复 commit：`0b7ebfc`（fix(admin): 文章设置弹窗内容移入 #body 插槽）。

## 防复发措施

用 Nuxt UI 组件时，先读同仓既有用法或 `node_modules/@nuxt/ui/dist/runtime/components/<Component>.vue` 源码确认插槽契约，不要凭直觉把内容塞默认插槽。审查时应核对弹窗类组件的插槽使用是否符合库契约。

## 关键证据

- `Slideover.vue` L69-71（默认插槽→DialogTrigger）、L140-142（正文只渲染 `#body`）。
- 最终审查 Important finding + 聚焦重审 ADDRESSED。
