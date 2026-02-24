# MDC 组件使用指南

本博客支持在 Markdown 中使用 Vue 组件，使用 MDC (Markdown Components) 语法。所有组件都在 `components/content/` 目录中。

## 📝 在编辑器中使用

在后台文章编辑器中，点击工具栏的 **"MDC 组件"** 按钮（🛡️图标），可以快速插入各种组件模板。

---

## 1. Alert 提示框

用于突出显示重要信息、警告或提示。

### 语法

```markdown
::alert{type="info"}
#title
提示标题
#default
这是提示内容，支持 **Markdown** 格式
::
```

### 参数

- `type`: 类型，可选 `info`（默认）、`success`、`warning`、`error`

### 示例

::alert{type="success"}
#title
成功提示
#default
文章已成功发布！
::

::alert{type="warning"}
#title
注意事项
#default
该操作不可逆，请谨慎操作。
::

::alert{type="error"}
#title
错误提示
#default
网络连接失败，请稍后重试。
::

---

## 2. Tabs 标签页

用于组织多个相关但独立的内容区域。

### 语法

```markdown
::tabs
---
labels: ["选项卡 1", "选项卡 2", "选项卡 3"]
---
#tab-0
第一个标签页的内容

#tab-1
第二个标签页的内容

#tab-2
第三个标签页的内容
::
```

### 参数

- `labels`: 字符串数组，定义标签页的标题

### 示例

::tabs
---
labels: ["Vue 3", "React", "Svelte"]
---
#tab-0
Vue 3 使用 Composition API：
```javascript
const count = ref(0)
```

#tab-1
React 使用 Hooks：
```javascript
const [count, setCount] = useState(0)
```

#tab-2
Svelte 最简洁：
```javascript
let count = 0
```
::

---

## 3. Collapse 折叠面板

用于隐藏/显示大段内容，节省页面空间。

### 语法

```markdown
::collapse{title="点击展开更多内容" defaultOpen}
这里是折叠的内容
::
```

### 参数

- `title`: 折叠面板的标题
- `defaultOpen`: 布尔值，是否默认展开

### 示例

::collapse{title="查看详细说明"}
这是一段可折叠的内容。可以包含：

- 列表
- **加粗文字**
- `代码`
- 甚至其他组件！
::

---

## 4. CodePlayground 代码演示

可交互的代码编辑器，支持实时编辑和运行。

### 语法

```markdown
::code-playground{lang="javascript" title="JavaScript 示例" editable runnable}
console.log('Hello World!')
const sum = (a, b) => a + b
console.log(sum(2, 3))
::
```

### 参数

- `lang`: 代码语言（javascript、python、html 等）
- `title`: 标题
- `editable`: 是否可编辑
- `runnable`: 是否可运行（目前仅支持 JavaScript）

### 示例

::code-playground{lang="javascript" title="试试修改代码" editable runnable}
const fibonacci = (n) => {
  if (n <= 1) return n
  return fibonacci(n - 1) + fibonacci(n - 2)
}

console.log('斐波那契数列：')
for (let i = 0; i < 10; i++) {
  console.log(`F(${i}) = ${fibonacci(i)}`)
}
::

---

## 5. ImageComparison 图片对比

拖动滑块对比两张图片，常用于展示优化效果。

### 语法

```markdown
::image-comparison{before="/img/before.jpg" after="/img/after.jpg" aspectRatio="16/9"}
::
```

### 参数

- `before`: 对比前的图片 URL
- `after`: 对比后的图片 URL
- `aspectRatio`: 宽高比（如 "16/9"、"4/3"）
- `showLabels`: 是否显示 Before/After 标签（默认 true）
- `beforeLabel`: 前图标签文字（默认 "Before"）
- `afterLabel`: 后图标签文字（默认 "After"）

### 使用场景

- 网站改版前后对比
- 图片压缩效果展示
- UI 优化对比
- 性能优化前后对比

---

## 6. WebEmbed 视频/网页嵌入

嵌入 Bilibili、YouTube、CodePen 等外部内容。

### 语法

**方式一：直接使用 URL**

```markdown
::web-embed{url="https://www.bilibili.com/video/BV1xx411c7mD" aspectRatio="16/9"}
::
```

**方式二：指定平台和视频 ID**

```markdown
::web-embed{platform="bilibili" vid="BV1xx411c7mD" aspectRatio="16/9"}
::

::web-embed{platform="youtube" vid="dQw4w9WgXcQ"}
::
```

### 支持的平台

- **Bilibili**: 支持 BV 号和 av 号
- **YouTube**: 自动转换为 embed 链接
- **CodePen**: 嵌入代码演示
- **CodeSandbox**: 嵌入沙盒项目
- **StackBlitz**: 嵌入在线 IDE

### 参数

- `url`: 完整 URL（自动识别平台）
- `platform`: 平台名称（bilibili、youtube、codepen 等）
- `vid`: 视频/项目 ID
- `aspectRatio`: 宽高比（默认 "16/9"）
- `caption`: 说明文字

---

## 7. StarRating 星级评分

展示评分或推荐指数。

### 语法

```markdown
::star-rating{rating="4.5" maxStars="5" label="推荐指数" showScore}
::
```

### 参数

- `rating`: 评分值（支持小数）
- `maxStars`: 最大星数（默认 5）
- `size`: 星星大小（sm、md、lg、xl、2xl，默认 xl）
- `readonly`: 是否只读（默认 true）
- `showScore`: 是否显示分数（默认 true）
- `label`: 标签文字

### 示例

::star-rating{rating="5" maxStars="5" label="强烈推荐"}
::

::star-rating{rating="4.5" maxStars="5" label="值得一试"}
::

::star-rating{rating="3" maxStars="5" label="一般般"}
::

---

## 🎨 组合使用示例

MDC 组件可以相互嵌套使用：

::tabs
---
labels: ["Alert 示例", "评分示例", "代码示例"]
---
#tab-0
::alert{type="info"}
#title
提示
#default
这是一个嵌套在 Tabs 中的 Alert 组件！
::

#tab-1
::star-rating{rating="4.8" label="用户评分"}
::

#tab-2
::code-playground{lang="javascript" editable runnable}
console.log('Hello from tab!')
::
::

---

## 📚 最佳实践

1. **适度使用**: 不要在一篇文章中使用过多组件，保持阅读流畅性
2. **语义化**: 选择最合适的组件类型表达内容
3. **性能考虑**: 大型组件（如视频）会影响加载速度
4. **移动端**: 所有组件都支持响应式，但复杂交互在移动端体验可能不佳
5. **无障碍**: 组件已考虑无障碍访问，但建议添加适当的说明文字

---

## 🔧 技术说明

这些组件基于 **Nuxt Content MDC** 实现：

- ✅ **SSR 友好**: 服务端渲染，SEO 优化
- ✅ **类型安全**: TypeScript 支持
- ✅ **按需加载**: 自动代码分割
- ✅ **样式隔离**: Scoped CSS
- ✅ **Vue 3**: Composition API

组件源码位置：`nuxt/app/components/content/`

---

**愉快地创作吧！** 🎉
