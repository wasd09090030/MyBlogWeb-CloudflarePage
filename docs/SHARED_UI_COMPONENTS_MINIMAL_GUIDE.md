# shared/ui 最小使用文档

本文档描述首批通用状态组件的最小用法，目标是统一页面状态展示并减少重复模板。

## 组件列表
- `StateLoading`
- `StateError`
- `StateEmpty`

---

## StateLoading
文件：`nuxt/app/shared/ui/StateLoading.vue`

### Props
- 无

### Slots
- 默认插槽（可覆盖内部默认 spinner）

### 示例
```vue
<StateLoading />

<StateLoading>
  <div class="text-white">自定义加载中...</div>
</StateLoading>
```

---

## StateError
文件：`nuxt/app/shared/ui/StateError.vue`

### Props
- `message: string`（默认：`加载失败，请稍后重试`）

### Slots
- 默认插槽（可覆盖整个错误内容区域）

### 示例
```vue
<StateError message="获取数据失败，请稍后再试" />

<StateError>
  <div class="alert alert-danger text-center">自定义错误内容</div>
</StateError>
```

---

## StateEmpty
文件：`nuxt/app/shared/ui/StateEmpty.vue`

### Props
- `icon: string`（默认：`images`）
- `title: string`（默认：`暂无数据`）
- `description: string`（默认：`当前没有可展示的内容`）

### Slots
- 默认插槽（可覆盖空状态内容）

### 示例
```vue
<StateEmpty
  icon="images"
  title="暂无图片"
  description="画廊中还没有任何图片"
/>

<StateEmpty>
  <div class="text-center text-muted">自定义空状态内容</div>
</StateEmpty>
```

---

## 使用建议
- 优先在页面容器组件中组合使用，展示组件仅接收状态 props。
- 若样式需复用，优先复用现有样式类，避免新增主题色。
- 如需新增状态组件，保持 `Props 简单 + 默认插槽可覆写` 的一致模式。
