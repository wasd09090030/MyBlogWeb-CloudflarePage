<template>
  <div class="md-editor-wrapper">
    <!-- MDC 组件快捷工具栏 -->
    <div class="mdc-toolbar bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-t-lg p-2">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-xs font-semibold text-gray-600 dark:text-gray-400 mr-2">MDC 组件:</span>
        <div class="flex items-center gap-1">
          <UButton size="sm" variant="ghost" color="neutral" title="插入 Alert 提示框" @click="insertTemplate('alert')">💡 Alert</UButton>
          <UButton size="sm" variant="ghost" color="neutral" title="插入 Tabs 标签页" @click="insertTemplate('tabs')">📑 Tabs</UButton>
          <UButton size="sm" variant="ghost" color="neutral" title="插入 Collapse 折叠" @click="insertTemplate('collapse')">📦 Collapse</UButton>
          <UButton size="sm" variant="ghost" color="neutral" title="插入代码演示" @click="insertTemplate('codePlayground')">💻 Code</UButton>
          <UButton size="sm" variant="ghost" color="neutral" title="插入链接卡片" @click="insertTemplate('linkCard')">🔗 Link</UButton>
          <UButton size="sm" variant="ghost" color="neutral" title="插入图片对比" @click="insertTemplate('imageComparison')">🖼️ Compare</UButton>
          <UButton size="sm" variant="ghost" color="neutral" title="插入视频嵌入" @click="insertTemplate('webEmbed')">🎬 Video</UButton>
          <UButton size="sm" variant="ghost" color="neutral" title="插入星级评分" @click="insertTemplate('starRating')">⭐ Rating</UButton>
        </div>
        <div class="flex items-center gap-1">
          <UButton size="sm" variant="ghost" color="neutral" title="插入步骤条" @click="insertTemplate('steps')">🔢 Steps</UButton>
          <UButton size="sm" variant="ghost" color="neutral" title="插入 GitHub 卡片" @click="insertTemplate('githubCard')">🐙 GitHub</UButton>
          <UButton size="sm" variant="ghost" color="neutral" title="插入增强图片" @click="insertTemplate('imageEnhanced')">🎨 Image+</UButton>
        </div>
        <div class="flex items-center gap-1">
          <UButton size="sm" variant="ghost" color="neutral" title="插入打字机动画" @click="insertTemplate('typeWriter')">⌨️ 打字机</UButton>
          <UButton size="sm" variant="ghost" color="neutral" title="插入剧透遮罩" @click="insertTemplate('spoiler')">🙈 剧透</UButton>
        </div>
        <UButton
          variant="ghost"
          color="neutral"
          icon
          square
          title="查看 MDC 组件参数说明"
          class="mdc-help-trigger"
          @click="showMdcHelp = true"
        >
          ?
        </UButton>
      </div>
    </div>
    
    <!-- Markdown 编辑器 -->
    <MdEditor
      ref="editorRef"
      v-model="localValue"
      :height="height"
      :toolbars="toolbars"
      preview-theme="github"
      code-theme="github"
      language="zh-CN"
      @on-change="handleChange"
      @on-save="handleSave"
      @on-html-changed="handleHtmlChanged"
      @on-upload-img="handleUploadImg"
      :scroll-auto="true"
      :auto-focus="true"
      :auto-detect-code="true"
      :tab-size="2"
      :table-shape="[6, 4]"
      :show-code-row-number="true"
      :no-mermaid="false"
      :no-katex="false"
      :max-length="100000"
      :auto-save="true"
      placeholder="请输入文章内容...支持 Markdown 语法、HTML 标签和 MDC 组件"
    />

    <UModal
      v-model:open="showMdcHelp"
      :title="'MDC 组件说明'"
      :description="'查看各 MDC 组件的参数与示例'"
      :ui="{ width: 'sm:max-w-[min(1024px,95vw)]' }"
    >
      <template #body>
        <div class="mdc-help-layout">
          <aside class="mdc-help-sidebar">
            <UVerticalNavigation
              :links="mdcHelpMenuOptions"
              :model-value="activeDocKey"
              @update:model-value="handleDocChange"
            />
          </aside>

          <section v-if="activeDoc" class="mdc-help-content">
            <h3 class="mdc-help-title">{{ activeDoc.label }}</h3>
            <p class="mdc-help-description">{{ activeDoc.description }}</p>

            <div class="mdc-help-block">
              <div class="mdc-help-subtitle">使用语法</div>
              <pre class="mdc-help-code">{{ activeDoc.syntax }}</pre>
            </div>

            <div class="mdc-help-block">
              <div class="mdc-help-subtitle">参数说明</div>
              <div class="mdc-help-table-wrapper">
                <table class="mdc-help-table">
                  <thead>
                    <tr>
                      <th>参数</th>
                      <th>类型</th>
                      <th>默认值</th>
                      <th>说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="param in activeDoc.params" :key="`${activeDoc.key}-${param.name}`">
                      <td>{{ param.name }}</td>
                      <td>{{ param.type }}</td>
                      <td>{{ param.defaultValue }}</td>
                      <td>{{ param.description }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="mdc-help-block">
              <div class="mdc-help-subtitle">示例</div>
              <pre class="mdc-help-code">{{ activeDoc.example }}</pre>
            </div>
          </section>
        </div>
      </template>

      <template #footer>
        <div class="mdc-help-footer">
          <UButton color="primary" @click="showMdcHelp = false">我知道了</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup>
import { MdEditor, config } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

// 设置中文界面
config({
  editorConfig: {
    languageUserDefined: {
      'zh-CN': {
        toolbarTips: {
          bold: '加粗',
          underline: '下划线',
          italic: '斜体',
          strikeThrough: '删除线',
          title: '标题',
          sub: '下标',
          sup: '上标',
          quote: '引用',
          unorderedList: '无序列表',
          orderedList: '有序列表',
          task: '任务列表',
          codeRow: '行内代码',
          code: '块级代码',
          link: '链接',
          image: '图片',
          table: '表格',
          mermaid: 'Mermaid图表',
          katex: 'KaTeX数学公式',
          revoke: '撤销',
          next: '重做',
          save: '保存',
          prettier: '美化代码',
          pageFullscreen: '页面全屏',
          fullscreen: '编辑器全屏',
          catalog: '目录导航',
          preview: '预览模式',
          htmlPreview: 'HTML源码预览'
        },
        titleItem: {
          h1: '一级标题',
          h2: '二级标题',
          h3: '三级标题',
          h4: '四级标题',
          h5: '五级标题',
          h6: '六级标题'
        },
        imgTitleItem: {
          link: '添加链接',
          upload: '上传图片',
          clip2upload: '剪贴板上传'
        },
        linkModalTips: {
          linkTitle: '添加链接',
          imageTitle: '添加图片',
          descLabel: '链接描述：',
          descLabelPlaceHolder: '请输入描述...',
          urlLabel: '链接地址：',
          urlLabelPlaceHolder: '请输入链接地址...',
          buttonOK: '确定',
          buttonCancel: '取消'
        },
        clipModalTips: {
          title: '剪贴板图片上传',
          buttonUpload: '上传'
        },
        copyCode: {
          text: '复制代码',
          successTips: '已复制！',
          failTips: '复制失败！'
        },
        mermaid: {
          flow: '流程图',
          sequence: '时序图',
          gantt: '甘特图',
          class: '类图',
          state: '状态图',
          pie: '饼图',
          relationship: '关系图',
          journey: '旅程图'
        },
        katex: {
          inline: '行内公式',
          block: '块级公式'
        },
        footer: {
          markdownTotal: '字数',
          scrollAuto: '同步滚动'
        }
      }
    }
  }
})

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  height: {
    type: String,
    default: '500px'
  }
})

const emit = defineEmits(['update:modelValue', 'save', 'html-change'])

const editorRef = ref(null)
const showMdcHelp = ref(false)
const activeDocKey = ref('alert')

// 本地状态，解决 v-model 不能直接用在 prop 上的问题
const localValue = ref(props.modelValue)

// 监听父组件传入的值变化
watch(() => props.modelValue, (newVal) => {
  if (newVal !== localValue.value) {
    localValue.value = newVal
  }
})

// 插入 MDC 模板 — 使用 md-editor-v3 的 insert() 暴露方法在光标处插入
const insertTemplate = (templateName) => {
  const template = mdcTemplates[templateName]
  if (!template) return

  // md-editor-v3 的 ExposeParam.insert 接受一个 generator 函数
  // generator 参数为当前选中文本，返回 { targetValue, select, deviationStart, deviationEnd }
  if (editorRef.value?.insert) {
    editorRef.value.insert((_selectedText) => {
      return {
        targetValue: '\n\n' + template + '\n\n',
        select: false,
        deviationStart: 0,
        deviationEnd: 0
      }
    })
  } else {
    // 降级：直接追加到末尾
    localValue.value += '\n\n' + template
    emit('update:modelValue', localValue.value)
  }
}

// MDC 组件模板
const mdcTemplates = {
  alert: `::alert{type="info"}
#title
提示标题
#default
这是提示内容，支持 **Markdown** 格式
::`,
  
  tabs: `::tabs
---
labels: ["选项卡 1", "选项卡 2", "选项卡 3"]
---
#tab-0
第一个标签页的内容

#tab-1
第二个标签页的内容

#tab-2
第三个标签页的内容
::`,
  
  collapse: `::collapse{title="点击展开更多内容"}
这里是折叠的内容，可以包含任何 Markdown 元素
::`,
  
  codePlayground: `::code-playground{lang="javascript" title="JavaScript 示例" runnable}
console.log('Hello World!')
const sum = (a, b) => a + b
console.log(sum(2, 3))
::`,
  
  linkCard: `::link-card{url="https://example.com" text="示例链接" icon="download"}
::`,
  
  imageComparison: `::image-comparison{before="/img/before.jpg" after="/img/after.jpg" aspectRatio="16/9"}
::`,
  
  relatedArticles: `::related-articles{count="3"}
::`,
  
  webEmbed: `::web-embed{url="https://www.bilibili.com/video/BV1xx411c7mD" aspectRatio="16/9"}
::`,
  
  starRating: `::star-rating{rating="4.5" maxStars="5" label="推荐指数" showScore}
::`,
  
  steps: `::steps{current="2" status="process" showControls clickable}
---
steps:
  - title: "第一步"
    description: "注册账号"
  - title: "第二步"
    description: "完善信息"
  - title: "第三步"
    description: "开始使用"
---
::`,
  
  githubCard: `::github-card{repo="vuejs/core"}
::`,
  
  imageEnhanced: `::image-enhanced{src="/img/photo.jpg" caption="图片说明文字" zoomable shadow rounded}
::`,

  typeWriter: `::type-writer{text="欢迎来到我的博客！这段文字会像打字机一样逐字显示～" speed="60" cursor}
::`,

  spoiler: `::spoiler{label="⚠ 剧透警告" clickText="点击查看剧透内容"}
主角最终**活了下来**，他找到了心中的答案，与故友重逢，迎来了久违的安宁。
::`
}

const mdcDocs = [
  {
    key: 'alert',
    label: 'Alert 提示框',
    description: '用于展示信息、警告、错误、成功提示。支持标题和正文插槽。',
    syntax: '::alert{type="info" title="提示" icon="true" dismissible="false"}\n正文内容\n::',
    params: [
      { name: 'type', type: 'string', defaultValue: 'info', description: '提示类型：info/success/warning/error' },
      { name: 'title', type: 'string', defaultValue: '-', description: '可选标题文本' },
      { name: 'icon', type: 'boolean', defaultValue: 'true', description: '是否显示图标' },
      { name: 'dismissible', type: 'boolean', defaultValue: 'false', description: '是否可关闭' }
    ],
    example: '::alert{type="warning" title="注意"}\n请先备份数据再执行操作。\n::'
  },
  {
    key: 'tabs',
    label: 'Tabs 标签页',
    description: '将多段内容分组展示，通过标签切换不同面板。',
    syntax: '::tabs\n---\nlabels: ["标签1", "标签2"]\n---\n#tab-0\n第一个面板\n\n#tab-1\n第二个面板\n::',
    params: [
      { name: 'labels', type: 'string[]', defaultValue: '[]', description: '标签标题数组（YAML 头部）' },
      { name: 'defaultTab', type: 'number', defaultValue: '0', description: '默认激活标签索引' },
      { name: 'animated', type: 'boolean', defaultValue: 'false', description: '切换时是否启用动画' },
      { name: 'type', type: 'string', defaultValue: 'line', description: '样式类型：line/card/segment' }
    ],
    example: '::tabs\n---\nlabels: ["简介", "安装"]\ndefaultTab: 0\n---\n#tab-0\n这是简介\n\n#tab-1\nnpm install xxx\n::'
  },
  {
    key: 'collapse',
    label: 'Collapse 折叠面板',
    description: '适合放置可选阅读内容，默认收起，按需展开。',
    syntax: '::collapse{title="更多内容" open="false" icon="true"}\n折叠内容\n::',
    params: [
      { name: 'title', type: 'string', defaultValue: '点击展开', description: '折叠面板标题' },
      { name: 'open', type: 'boolean', defaultValue: 'false', description: '是否默认展开' },
      { name: 'icon', type: 'boolean', defaultValue: 'true', description: '是否显示箭头图标' },
      { name: 'size', type: 'string', defaultValue: 'medium', description: '尺寸：small/medium/large' }
    ],
    example: '::collapse{title="查看完整步骤"}\n1. 打开设置\n2. 选择账号\n3. 完成绑定\n::'
  },
  {
    key: 'codePlayground',
    label: 'Code Playground 代码演示',
    description: '展示可读代码片段，可配置语言和标题。',
    syntax: '::code-playground{lang="javascript" title="示例" runnable="true"}\nconsole.log("Hello")\n::',
    params: [
      { name: 'lang', type: 'string', defaultValue: 'javascript', description: '代码语言标识' },
      { name: 'title', type: 'string', defaultValue: '-', description: '代码块标题' },
      { name: 'runnable', type: 'boolean', defaultValue: 'false', description: '是否显示运行入口' },
      { name: 'lineNumbers', type: 'boolean', defaultValue: 'true', description: '是否显示行号' }
    ],
    example: '::code-playground{lang="ts" title="类型示例"}\nconst name: string = "Nuxt"\n::'
  },
  {
    key: 'linkCard',
    label: 'Link Card 链接卡片',
    description: '将普通链接展示为信息卡片，适合资料推荐。',
    syntax: '::link-card{url="https://example.com" text="示例网站" desc="链接说明" icon="link"}\n::',
    params: [
      { name: 'url', type: 'string', defaultValue: '-', description: '目标链接地址（必填）' },
      { name: 'text', type: 'string', defaultValue: '访问链接', description: '卡片标题文字' },
      { name: 'desc', type: 'string', defaultValue: '-', description: '补充描述文本' },
      { name: 'icon', type: 'string', defaultValue: 'link', description: '图标名称' }
    ],
    example: '::link-card{url="https://nuxt.com" text="Nuxt 官网" desc="框架文档入口"}\n::'
  },
  {
    key: 'imageComparison',
    label: 'Image Comparison 图片对比',
    description: '左右拖拽查看 before/after 图像差异。',
    syntax: '::image-comparison{before="/before.jpg" after="/after.jpg" aspectRatio="16/9"}\n::',
    params: [
      { name: 'before', type: 'string', defaultValue: '-', description: '对比前图片地址（必填）' },
      { name: 'after', type: 'string', defaultValue: '-', description: '对比后图片地址（必填）' },
      { name: 'aspectRatio', type: 'string', defaultValue: '16/9', description: '容器宽高比，如 4/3' },
      { name: 'startPosition', type: 'number', defaultValue: '50', description: '分隔线初始位置（百分比）' }
    ],
    example: '::image-comparison{before="/img/v1.png" after="/img/v2.png" aspectRatio="4/3"}\n::'
  },
  {
    key: 'webEmbed',
    label: 'Web Embed 视频/网页嵌入',
    description: '嵌入外部视频或网页内容。',
    syntax: '::web-embed{url="https://www.bilibili.com/video/xxxx" aspectRatio="16/9" title="视频"}\n::',
    params: [
      { name: 'url', type: 'string', defaultValue: '-', description: '嵌入地址（必填）' },
      { name: 'aspectRatio', type: 'string', defaultValue: '16/9', description: '播放器宽高比' },
      { name: 'title', type: 'string', defaultValue: 'Web Embed', description: 'iframe 标题' },
      { name: 'allowFullscreen', type: 'boolean', defaultValue: 'true', description: '是否允许全屏' }
    ],
    example: '::web-embed{url="https://www.youtube.com/embed/xxxx" aspectRatio="16/9"}\n::'
  },
  {
    key: 'starRating',
    label: 'Star Rating 星级评分',
    description: '展示评分信息，可显示分数与标签。',
    syntax: '::star-rating{rating="4.5" maxStars="5" label="推荐指数" showScore}\n::',
    params: [
      { name: 'rating', type: 'number|string', defaultValue: '0', description: '当前评分值' },
      { name: 'maxStars', type: 'number|string', defaultValue: '5', description: '最大星星数' },
      { name: 'size', type: 'string', defaultValue: 'medium', description: '尺寸：small/medium/large' },
      { name: 'showScore', type: 'boolean', defaultValue: 'true', description: '是否显示数字评分' }
    ],
    example: '::star-rating{rating="4.8" label="编辑推荐" showScore}\n::'
  },
  {
    key: 'steps',
    label: 'Steps 步骤条',
    description: '展示流程型内容，支持当前步骤和状态。',
    syntax: '::steps{current="1" status="process" showControls clickable}\n---\nsteps:\n  - title: "第一步"\n    description: "说明"\n---\n::',
    params: [
      { name: 'current', type: 'number|string', defaultValue: '0', description: '当前步骤索引' },
      { name: 'status', type: 'string', defaultValue: 'process', description: '状态：wait/process/finish/error' },
      { name: 'showControls', type: 'boolean', defaultValue: 'false', description: '是否显示前后切换控件' },
      { name: 'clickable', type: 'boolean', defaultValue: 'false', description: '步骤是否可点击切换' }
    ],
    example: '::steps{current="2" status="process"}\n---\nsteps:\n  - title: "注册"\n  - title: "配置"\n  - title: "完成"\n---\n::'
  },
  {
    key: 'githubCard',
    label: 'GitHub Card 仓库卡片',
    description: '展示 GitHub 仓库信息摘要。',
    syntax: '::github-card{repo="owner/repo" branch="main"}\n::',
    params: [
      { name: 'repo', type: 'string', defaultValue: '-', description: '仓库标识，格式 owner/repo（必填）' },
      { name: 'branch', type: 'string', defaultValue: 'main', description: '目标分支' },
      { name: 'theme', type: 'string', defaultValue: 'auto', description: '展示主题：light/dark/auto' },
      { name: 'showStats', type: 'boolean', defaultValue: 'true', description: '是否显示 star/fork 等统计' }
    ],
    example: '::github-card{repo="nuxt/nuxt" branch="main"}\n::'
  },
  {
    key: 'imageEnhanced',
    label: 'Image Enhanced 增强图片',
    description: '为图片提供说明、放大、圆角、阴影等增强展示。',
    syntax: '::image-enhanced{src="/img/photo.jpg" alt="说明" caption="标题" zoomable shadow rounded}\n::',
    params: [
      { name: 'src', type: 'string', defaultValue: '-', description: '图片地址（必填）' },
      { name: 'alt', type: 'string', defaultValue: '', description: '图片替代文本' },
      { name: 'caption', type: 'string', defaultValue: '-', description: '图片下方说明文字' },
      { name: 'zoomable', type: 'boolean', defaultValue: 'false', description: '点击是否支持放大' }
    ],
    example: '::image-enhanced{src="/img/demo.jpg" caption="架构示意图" zoomable rounded}\n::'
  },
  {
    key: 'typeWriter',
    label: '⌨ TypeWriter 打字机',
    description: '文字逐字打出的动画组件，可循环播放，适合标语、引用、氛围烘托。',
    syntax: '::type-writer{text="要打印的文字" speed="60" cursor loop delay="500"}\n::',
    params: [
      { name: 'text', type: 'string', defaultValue: '-', description: '要逐字打出的文本（必填）' },
      { name: 'speed', type: 'number', defaultValue: '60', description: '每个字符间隔（ms），越小越快' },
      { name: 'cursor', type: 'boolean', defaultValue: 'true', description: '是否显示闪烁光标' },
      { name: 'loop', type: 'boolean', defaultValue: 'false', description: '打完后是否循环重播' },
      { name: 'delay', type: 'number', defaultValue: '0', description: '开始前延迟（ms）' }
    ],
    example: '::type-writer{text="欢迎来到我的博客～" speed="80" cursor loop}\n::'
  },
  {
    key: 'spoiler',
    label: '😈 Spoiler 剧透遮罩',
    description: '将内容用遮罩隐藏，读者点击后才能查看，适合游戏攻略、影视剧情等。',
    syntax: '::spoiler{label="⚠ 剧透警告" clickText="点击查看" open="false"}\n被遮住的内容\n::',
    params: [
      { name: 'label', type: 'string', defaultValue: '⚠ 剧透警告', description: '警告条标签文字' },
      { name: 'clickText', type: 'string', defaultValue: '点击展示剧透内容', description: '遮罩中央的提示文字' },
      { name: 'open', type: 'boolean', defaultValue: 'false', description: '是否默认展开（不遮罩）' }
    ],
    example: '::spoiler{label="⚠ Boss 结局" clickText="点击查看结局"}\n# 最终 Boss 被击败\n玩家在第 47 关击败了最终 Boss，游戏结束。\n::'
  }
]

const mdcHelpMenuOptions = computed(() => {
  return mdcDocs.map((item) => ({
    label: item.label,
    key: item.key
  }))
})

const activeDoc = computed(() => {
  return mdcDocs.find((item) => item.key === activeDocKey.value) || mdcDocs[0]
})

const handleDocChange = (key) => {
  activeDocKey.value = key
}

// 定义编辑器工具栏
const toolbars = [
  'bold', 'underline', 'italic', 'strikeThrough',
  '-',
  'title', 'sub', 'sup',
  '-',
  'quote', 'unorderedList', 'orderedList', 'task',
  '-',
  'codeRow', 'code',
  '-',
  'link', 'image', 'table',
  '-',
  'mermaid', 'katex',
  '-',
  'revoke', 'next',
  '-',
  'save', 'prettier',
  '-',
  'pageFullscreen', 'fullscreen', 'preview', 'htmlPreview', 'catalog'
]

const handleChange = (text) => {
  localValue.value = text
  emit('update:modelValue', text)
}

const handleSave = async (text, htmlPromise) => {
  const html = await htmlPromise
  emit('save', text, html)
}

const handleHtmlChanged = (html) => {
  emit('html-change', html)
}

const handleUploadImg = async (files, callback) => {
  try {
    console.log('上传图片:', files)
    // 创建本地预览URL
    const urls = files.map((file) => URL.createObjectURL(file))
    callback(urls)
  } catch (error) {
    console.error('图片上传失败:', error)
  }
}
</script>

<style>
/* md-editor-v3 样式覆盖 */
.md-editor {
  --md-bk-color: var(--n-color) !important;
  border-top-left-radius: 0 !important;
  border-top-right-radius: 0 !important;
}

.md-editor-dark {
  --md-bk-color: #1e1e1e !important;
}

.mdc-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.mdc-help-trigger {
  margin-left: auto;
  font-weight: 700;
}

.mdc-help-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 1rem;
  min-height: 460px;
}

.mdc-help-sidebar {
  border-right: 1px solid var(--n-border-color);
  padding-right: 0.75rem;
  overflow-y: auto;
}

.mdc-help-content {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.mdc-help-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.mdc-help-description {
  font-size: 0.9rem;
  margin-bottom: 1rem;
  color: var(--n-text-color-2);
}

.mdc-help-block {
  margin-bottom: 1rem;
}

.mdc-help-subtitle {
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.mdc-help-code {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.82rem;
  line-height: 1.5;
  border: 1px solid var(--n-border-color);
  background: var(--n-color-modal);
  border-radius: 8px;
  padding: 0.75rem;
}

.mdc-help-table-wrapper {
  overflow-x: auto;
}

.mdc-help-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}

.mdc-help-table th,
.mdc-help-table td {
  border: 1px solid var(--n-border-color);
  padding: 0.45rem 0.5rem;
  text-align: left;
  vertical-align: top;
}

.mdc-help-table th {
  background: var(--n-color-modal);
  font-weight: 600;
}

.mdc-help-footer {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .mdc-toolbar {
    font-size: 0.75rem;
  }

  .mdc-help-layout {
    grid-template-columns: 1fr;
    min-height: 0;
  }

  .mdc-help-sidebar {
    border-right: none;
    border-bottom: 1px solid var(--n-border-color);
    padding-right: 0;
    padding-bottom: 0.75rem;
    margin-bottom: 0.75rem;
  }
}
</style>
