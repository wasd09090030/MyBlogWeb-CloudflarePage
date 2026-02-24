# 新增 MDC 组件使用指南

本文档介绍三个新增的 Nuxt MDC 组件的使用方法。

## 1. LinkCard - 链接分享组件

用于在文章中展示可点击的链接卡片，具有美观的样式和悬停效果。

### 特性
- 小卡片形式展示
- 支持自定义图标
- 点击在新标签页打开链接
- 不显示 URL 本身，只显示描述文字

### 使用方法

```markdown
::link-card{url="https://example.com" text="查看示例网站" icon="download"}
::
```

### Props

| 属性 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `url` | String | 是 | - | 链接地址 |
| `text` | String | 是 | - | 显示的文本 |
| `icon` | String | 否 | `download` | 图标名称（使用 Nuxt Icon） |

### 示例

```markdown
::link-card{url="https://github.com/nuxt/nuxt" text="访问 Nuxt 官方仓库" icon="github"}
::

::link-card{url="/download/file.pdf" text="下载 PDF 文档" icon="document-download"}
::
```

---

## 2. CodeComparison - 写法差异对比组件

用于并排展示代码的前后对比，支持语法高亮。

### 特性
- 使用 Shiki 进行代码高亮
- 左右对比布局（响应式，移动端会变为上下布局）
- 统一的深色背景
- 支持多种编程语言

### 使用方法

```markdown
::code-comparison{lang="javascript" beforeTitle="旧写法" afterTitle="新写法"}
#before
var x = 10;
var y = 20;
console.log(x + y);

#after
const x = 10;
const y = 20;
console.log(x + y);
::
```

### Props

| 属性 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `lang` | String | 否 | `javascript` | 编程语言 |
| `beforeTitle` | String | 否 | `Before` | 左侧代码标题 |
| `afterTitle` | String | 否 | `After` | 右侧代码标题 |
| `leftTitle` | String | 否 | `Before` | 同 `beforeTitle`（别名） |
| `rightTitle` | String | 否 | `After` | 同 `afterTitle`（别名） |
| `layout` | String | 否 | `horizontal` | 布局方式：`horizontal` 或 `vertical` |

### 支持的语言

支持所有 `nuxt.config.ts` 中配置的语言，包括：
- JavaScript / TypeScript
- Vue / HTML / CSS
- Python / Java / C# / C++
- JSON / YAML / Markdown
- Bash / Shell
- SQL / Dockerfile / Nginx
- 等等

### 示例

**TypeScript 对比：**

```markdown
::code-comparison{lang="typescript" beforeTitle="类型不明确" afterTitle="类型明确"}
#before
function add(a, b) {
  return a + b;
}

#after
function add(a: number, b: number): number {
  return a + b;
}
::
```

**Vue 组件对比：**

```markdown
::code-comparison{lang="vue" beforeTitle="Options API" afterTitle="Composition API"}
#before
export default {
  data() {
    return {
      count: 0
    }
  },
  methods: {
    increment() {
      this.count++
    }
  }
}

#after
const count = ref(0)
const increment = () => {
  count.value++
}
::
```

---

## 3. RelatedArticles - 相关推荐组件

在文章末尾自动显示相关推荐文章，无需手动添加。

### 特性
- 自动从后端获取推荐文章
- 三列网格布局（响应式）
- 显示封面图、标题、发布日期
- 自动排除当前文章
- 如果没有推荐文章则不显示

### 自动集成

该组件已自动集成到文章详情页的评论区之后，**无需手动添加**到 Markdown 文件中。

### 手动使用（可选）

如果需要在其他地方使用，可以手动添加：

```markdown
::related-articles{count="3"}
::
```

### Props

| 属性 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `count` | Number | 否 | `3` | 显示的文章数量 |
| `excludeId` | Number/String | 否 | `null` | 排除的文章 ID |

### 显示逻辑

- 从后端 `/articles/featured` 接口获取推荐文章
- 自动排除当前正在阅读的文章
- 如果文章少于指定数量，则显示所有可用文章
- 如果没有推荐文章，组件不会显示

---

## 组件位置

所有三个组件都位于：
```
nuxt/app/components/content/
├── LinkCard.vue
├── CodeComparison.vue
└── RelatedArticles.vue
```

由于它们在 `components/content/` 目录下，已自动注册为全局组件，可以直接在 Markdown 文件中使用。

---

## 样式统一说明

### CodePlayground 和 CodeComparison 的背景处理

两个代码组件都采用相同的背景处理方案：

1. **外层容器背景**：`rgb(23 23 23)` (gray-950)
2. **Shiki 生成的 pre 标签背景**：设为 `transparent`
3. **结果**：代码区域和包装区域背景色完全一致

这样可以避免 Shiki 内置主题的背景色与组件背景色不一致的问题。

---

## 技术细节

### Shiki 集成

CodePlayground 和 CodeComparison 都使用 Shiki 进行语法高亮：

```javascript
import { codeToHtml } from 'shiki'

const html = await codeToHtml(code, {
  lang: 'javascript',
  theme: 'material-theme-darker'
})
```

### MDC Slots

组件使用 MDC 的 slot 功能来接收内容：

```markdown
::component-name
#slot-name
内容
::
```

### API 调用

RelatedArticles 使用 `useAsyncData` 和 `$fetch` 获取数据：

```javascript
const { data } = await useAsyncData(
  'related-articles',
  () => $fetch('/api/articles/featured')
)
```

---

## 故障排除

### CodeComparison 不显示高亮

1. 检查 `lang` 参数是否正确
2. 确认语言在 `nuxt.config.ts` 中已配置
3. 查看浏览器控制台是否有错误

### RelatedArticles 不显示

1. 检查后端 API 是否正常
2. 确认有可用的推荐文章
3. 查看网络请求是否成功

### LinkCard 链接无法打开

1. 确认 `url` 参数格式正确
2. 检查是否包含协议（`https://` 或 `http://`）
3. 查看浏览器是否阻止了弹出窗口

---

## 总结

三个新增组件为 Markdown 文章提供了丰富的交互能力：

- **LinkCard**：美观的链接分享
- **CodeComparison**：清晰的代码对比
- **RelatedArticles**：智能的文章推荐

所有组件都遵循统一的设计语言，支持深色模式，并提供良好的响应式体验。
