<template>
  <div class="markdown-converter">
    <n-tabs v-model:value="activeTab" type="line" animated>
      <n-tab-pane name="editor" tab="编辑器">
        <div class="converter-layout">
          <div class="editor-section">
            <div class="section-header">
              <h3>Markdown 输入</h3>
              <n-button-group size="small">
                <n-button @click="loadExample">
                  <template #icon>
                    <Icon name="lightbulb" size="sm" />
                  </template>
                  示例
                </n-button>
                <n-button @click="clearContent">
                  <template #icon>
                    <Icon name="trash" size="sm" />
                  </template>
                  清空
                </n-button>
              </n-button-group>
            </div>
            <n-input
              v-model:value="markdownContent"
              type="textarea"
              placeholder="在此输入 Markdown 内容..."
              :rows="20"
              :autosize="{ minRows: 20, maxRows: 30 }"
              class="markdown-input"
            />
          </div>

          <div class="preview-section">
            <div class="section-header">
              <h3>实时预览（PDF）</h3>
              <n-tag :type="previewStyle.theme === 'elegant' ? 'success' : previewStyle.theme === 'modern' ? 'info' : 'warning'" size="small">
                {{ themeLabels[previewStyle.theme] }}
              </n-tag>
            </div>
            <div
              class="preview-container"
              ref="previewRef"
              :class="[`theme-${previewStyle.theme}`, `font-${previewStyle.fontFamily}`]"
              :style="previewStyles"
            >
              <MarkdownRenderer
                v-if="markdownContent"
                :markdown="markdownContent"
              />
              <div v-else class="empty-preview">
                <Icon name="eye" size="xl" />
                <p>预览区域将显示渲染后的内容(PDF)</p>
              </div>
            </div>
          </div>
        </div>
      </n-tab-pane>

      <n-tab-pane name="style" tab="样式设置">
        <div class="settings-panel">
          <n-card title="渲染风格 (PDF & DOCX)" size="small" class="settings-card">
            <n-form label-placement="left" label-width="100">
              <n-form-item label="主题风格">
                <n-radio-group v-model:value="previewStyle.theme">
                  <n-radio-button value="default">默认</n-radio-button>
                  <n-radio-button value="elegant">优雅</n-radio-button>
                  <n-radio-button value="modern">现代</n-radio-button>
                  <n-radio-button value="academic">学术</n-radio-button>
                </n-radio-group>
              </n-form-item>

              <n-form-item label="正文字体">
                <n-select
                  v-model:value="previewStyle.fontFamily"
                  :options="fontFamilyOptions"
                  style="width: 200px"
                />
              </n-form-item>

              <n-form-item label="字体大小">
                <n-slider
                  v-model:value="previewStyle.fontSize"
                  :min="12"
                  :max="20"
                  :step="1"
                  :marks="{ 12: '12', 14: '14', 16: '16', 18: '18', 20: '20' }"
                  style="width: 200px"
                />
                <span class="slider-value">{{ previewStyle.fontSize }}px</span>
              </n-form-item>

              <n-form-item label="行间距">
                <n-slider
                  v-model:value="previewStyle.lineHeight"
                  :min="1.4"
                  :max="2.2"
                  :step="0.1"
                  style="width: 200px"
                />
                <span class="slider-value">{{ previewStyle.lineHeight.toFixed(1) }}</span>
              </n-form-item>

              <n-form-item label="段落间距">
                <n-select
                  v-model:value="previewStyle.paragraphSpacing"
                  :options="spacingOptions"
                  style="width: 200px"
                />
              </n-form-item>
            </n-form>
          </n-card>

          <n-card title="代码块样式" size="small" class="settings-card">
            <n-form label-placement="left" label-width="100">
              <n-form-item label="代码字体">
                <n-select
                  v-model:value="previewStyle.codeFontFamily"
                  :options="codeFontOptions"
                  style="width: 200px"
                />
              </n-form-item>

              <n-form-item label="代码字号">
                <n-slider
                  v-model:value="previewStyle.codeFontSize"
                  :min="12"
                  :max="16"
                  :step="1"
                  style="width: 200px"
                />
                <span class="slider-value">{{ previewStyle.codeFontSize }}px</span>
              </n-form-item>
            </n-form>
          </n-card>
        </div>
      </n-tab-pane>

      <n-tab-pane name="export" tab="导出设置">
        <div class="settings-panel">
          <n-card title="文档信息" size="small" class="settings-card">
            <n-form label-placement="left" label-width="100">
              <n-form-item label="文档标题">
                <n-input
                  v-model:value="exportSettings.title"
                  placeholder="我的文档"
                />
              </n-form-item>

              <n-form-item label="作者">
                <n-input
                  v-model:value="exportSettings.author"
                  placeholder="作者名称"
                />
              </n-form-item>
            </n-form>
          </n-card>

          <n-card title="页面设置" size="small" class="settings-card">
            <n-form label-placement="left" label-width="100">
              <n-form-item label="页面大小">
                <n-select
                  v-model:value="exportSettings.pageSize"
                  :options="pageSizeOptions"
                  style="width: 200px"
                />
              </n-form-item>

              <n-form-item label="页边距">
                <n-select
                  v-model:value="exportSettings.margin"
                  :options="marginOptions"
                  style="width: 200px"
                />
              </n-form-item>

              <n-form-item label="包含目录">
                <n-switch v-model:value="exportSettings.includeToc" />
              </n-form-item>
            </n-form>
          </n-card>
        </div>
      </n-tab-pane>
    </n-tabs>

    <div class="export-actions">
      <n-space justify="center" size="large">
        <n-button
          type="primary"
          size="large"
          :loading="isExporting === 'pdf'"
          :disabled="!markdownContent || isExporting"
          @click="exportToPDF"
        >
          <template #icon>
            <Icon name="file-pdf" size="md" />
          </template>
          导出为 PDF
        </n-button>

        <n-button
          type="success"
          size="large"
          :loading="isExporting === 'docx'"
          :disabled="!markdownContent || isExporting"
          @click="exportToDOCX"
        >
          <template #icon>
            <Icon name="file-word" size="md" />
          </template>
          导出为 DOCX
        </n-button>
      </n-space>
    </div>
  </div>
</template>

<script setup>
import { saveAs } from 'file-saver'

const message = useMessage()
const activeTab = ref('editor')
const markdownContent = ref('')
const isExporting = ref(false)
const previewRef = ref(null)

// 样式设置
const previewStyle = ref({
  theme: 'default',
  fontFamily: 'system',
  fontSize: 15,
  lineHeight: 1.7,
  paragraphSpacing: 'normal',
  codeFontFamily: 'consolas',
  codeFontSize: 14
})

// 导出设置
const exportSettings = ref({
  title: '我的文档',
  author: '',
  pageSize: 'a4',
  margin: 'normal',
  includeToc: false
})

// 选项配置
const themeLabels = {
  default: '默认',
  elegant: '优雅',
  modern: '现代',
  academic: '学术'
}

const fontFamilyOptions = [
  { label: '系统默认', value: 'system' },
  { label: '思源黑体', value: 'source-han-sans' },
  { label: '思源宋体', value: 'source-han-serif' },
  { label: '霞鹜文楷', value: 'lxgw' },
  { label: 'Inter', value: 'inter' }
]

const codeFontOptions = [
  { label: 'Consolas', value: 'consolas' },
  { label: 'Fira Code', value: 'fira-code' },
  { label: 'JetBrains Mono', value: 'jetbrains' },
  { label: 'Source Code Pro', value: 'source-code' }
]

const spacingOptions = [
  { label: '紧凑', value: 'compact' },
  { label: '正常', value: 'normal' },
  { label: '宽松', value: 'relaxed' }
]

const pageSizeOptions = [
  { label: 'A4', value: 'a4' },
  { label: 'A3', value: 'a3' },
  { label: 'Letter', value: 'letter' },
  { label: 'Legal', value: 'legal' }
]

const marginOptions = [
  { label: '正常 (2cm)', value: 'normal' },
  { label: '窄 (1cm)', value: 'narrow' },
  { label: '宽 (3cm)', value: 'wide' }
]

const marginMap = {
  normal: [20, 20, 20, 20],
  narrow: [10, 10, 10, 10],
  wide: [30, 30, 30, 30]
}

// 计算预览样式
const previewStyles = computed(() => {
  const spacingMap = {
    compact: '0.5em',
    normal: '1em',
    relaxed: '1.5em'
  }

  return {
    '--preview-font-size': `${previewStyle.value.fontSize}px`,
    '--preview-line-height': previewStyle.value.lineHeight,
    '--preview-paragraph-spacing': spacingMap[previewStyle.value.paragraphSpacing],
    '--preview-code-font-size': `${previewStyle.value.codeFontSize}px`
  }
})

// 加载示例内容
const loadExample = () => {
  markdownContent.value = `# Markdown 转换示例

## 这是一个二级标题

这是一段普通文本。支持 **粗体**、*斜体*、\`行内代码\`。

### 代码块示例

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`)
}

greet('World')
\`\`\`

### 列表示例

**无序列表：**
- 项目一
- 项目二
  - 子项目 2.1
  - 子项目 2.2
- 项目三

**有序列表：**
1. 第一步
2. 第二步
3. 第三步

### 表格示例

| 功能 | 支持 | 备注 |
|------|------|------|
| PDF导出 | ✅ | 高质量输出 |
| DOCX导出 | ✅ | 兼容Office |
| 代码高亮 | ✅ | 多语言支持 |

### 引用

> 这是一段引用文本
> 可以包含多行内容

### 数学公式（如果支持）

行内公式：$E = mc^2$

块级公式：
$$
\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$

### 链接和图片

[访问我的博客](https://example.com)

---

*生成时间：${new Date().toLocaleString()}*
`
}

// 清空内容
const clearContent = () => {
  markdownContent.value = ''
}

// 导出为 PDF
const exportToPDF = async () => {
  if (!markdownContent.value) {
    message.warning('请先输入 Markdown 内容')
    return
  }

  isExporting.value = 'pdf'

  try {
    // 动态导入 html2pdf
    const html2pdfModule = await import('html2pdf.js')
    const html2pdf = html2pdfModule.default

    // 等待 DOM 更新
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 300))

    const container = previewRef.value
    if (!container) {
      throw new Error('无法获取预览容器')
    }

    let previewElement = container.querySelector('.markdown-renderer')
    if (!previewElement || !previewElement.querySelector('article, .prose, p, h1, h2, h3')) {
      previewElement = container.querySelector('article') || container
    }

    if (!previewElement.innerHTML.trim()) {
      throw new Error('预览内容为空，请先输入 Markdown')
    }

    // 创建一个带有主题样式的包装容器
    const wrapper = document.createElement('div')
    const themeStyles = getPdfThemeStyles(previewStyle.value.theme)
    const fontFamily = getFontFamilyValue(previewStyle.value.fontFamily)

    // 设置包装容器的内联样式
    wrapper.style.cssText = `
      font-family: ${fontFamily};
      font-size: ${previewStyle.value.fontSize}px;
      line-height: ${previewStyle.value.lineHeight};
      color: ${themeStyles.textColor};
      background-color: ${themeStyles.bgColor};
      padding: 20px;
    `

    // 克隆内容
    const clonedElement = previewElement.cloneNode(true)
    clonedElement.querySelectorAll('.animate-pulse, .skeleton').forEach(el => el.remove())

    // 应用主题样式到各元素
    applyThemeToElement(clonedElement, themeStyles, previewStyle.value)

    wrapper.appendChild(clonedElement)

    const opt = {
      margin: marginMap[exportSettings.value.margin],
      filename: `${exportSettings.value.title || 'document'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        logging: false,
        backgroundColor: themeStyles.bgColor
      },
      jsPDF: {
        unit: 'mm',
        format: exportSettings.value.pageSize,
        orientation: 'portrait'
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    }

    await html2pdf().set(opt).from(wrapper).save()
    message.success('PDF 导出成功！')
  } catch (error) {
    console.error('PDF 导出失败:', error)
    message.error(`PDF 导出失败: ${error.message}`)
  } finally {
    isExporting.value = false
  }
}

// 获取字体族值
function getFontFamilyValue(fontKey) {
  const fontMap = {
    'system': "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    'source-han-sans': "'Source Han Sans SC', 'Noto Sans SC', 'Microsoft YaHei', sans-serif",
    'source-han-serif': "'Source Han Serif SC', 'Noto Serif SC', 'SimSun', serif",
    'lxgw': "'LXGW WenKai', 'Microsoft YaHei', sans-serif",
    'inter': "'Inter', 'Microsoft YaHei', sans-serif"
  }
  return fontMap[fontKey] || fontMap['system']
}

// 获取 PDF 主题样式
function getPdfThemeStyles(theme) {
  const themes = {
    default: {
      bgColor: '#ffffff',
      textColor: '#333333',
      headingColor: '#1a1a1a',
      linkColor: '#646cff',
      codeBlockBg: '#f5f5f5',
      codeBorder: '#e0e0e0',
      blockquoteBorder: '#ddd',
      blockquoteBg: '#f9f9f9',
      blockquoteColor: '#666',
      tableBorder: '#ddd',
      tableHeaderBg: '#f0f0f0'
    },
    elegant: {
      bgColor: '#FFFEF5',
      textColor: '#5D4E37',
      headingColor: '#3D3225',
      linkColor: '#8B7355',
      codeBlockBg: '#F5F0E8',
      codeBorder: '#D4C4B0',
      blockquoteBorder: '#C4B4A0',
      blockquoteBg: '#FAF5ED',
      blockquoteColor: '#6D5E47',
      tableBorder: '#D4C4B0',
      tableHeaderBg: '#F5F0E8'
    },
    modern: {
      bgColor: '#f8fafc',
      textColor: '#334155',
      headingColor: '#1E40AF',
      linkColor: '#3B82F6',
      codeBlockBg: '#EFF6FF',
      codeBorder: '#BFDBFE',
      blockquoteBorder: '#3B82F6',
      blockquoteBg: '#EFF6FF',
      blockquoteColor: '#1E40AF',
      tableBorder: '#BFDBFE',
      tableHeaderBg: '#DBEAFE'
    },
    academic: {
      bgColor: '#ffffff',
      textColor: '#000000',
      headingColor: '#000000',
      linkColor: '#000080',
      codeBlockBg: '#f8f8f8',
      codeBorder: '#cccccc',
      blockquoteBorder: '#666666',
      blockquoteBg: '#f5f5f5',
      blockquoteColor: '#333333',
      tableBorder: '#000000',
      tableHeaderBg: '#e8e8e8'
    }
  }
  return themes[theme] || themes.default
}

// 应用主题样式到元素
function applyThemeToElement(element, themeStyles, settings) {
  // 标题样式
  element.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => {
    el.style.color = themeStyles.headingColor
    el.style.fontWeight = '600'
    el.style.marginTop = '1.5em'
    el.style.marginBottom = '0.5em'
    if (settings.theme === 'academic') {
      el.style.fontFamily = "'Times New Roman', 'SimSun', serif"
    }
  })

  // 段落样式
  element.querySelectorAll('p').forEach(el => {
    el.style.color = themeStyles.textColor
    el.style.marginBottom = settings.paragraphSpacing === 'compact' ? '0.5em' :
                            settings.paragraphSpacing === 'relaxed' ? '1.5em' : '1em'
    el.style.lineHeight = String(settings.lineHeight)
  })

  // 链接样式
  element.querySelectorAll('a').forEach(el => {
    el.style.color = themeStyles.linkColor
    el.style.textDecoration = 'underline'
  })

  // 代码块样式
  element.querySelectorAll('pre').forEach(el => {
    el.style.backgroundColor = themeStyles.codeBlockBg
    el.style.border = `1px solid ${themeStyles.codeBorder}`
    el.style.borderRadius = '6px'
    el.style.padding = '1em'
    el.style.overflow = 'auto'
    el.style.fontSize = `${settings.codeFontSize}px`
  })

  // 行内代码样式
  element.querySelectorAll('code:not(pre code)').forEach(el => {
    el.style.backgroundColor = themeStyles.codeBlockBg
    el.style.padding = '0.2em 0.4em'
    el.style.borderRadius = '3px'
    el.style.fontSize = '0.9em'
  })

  // 引用样式
  element.querySelectorAll('blockquote').forEach(el => {
    el.style.borderLeft = `4px solid ${themeStyles.blockquoteBorder}`
    el.style.backgroundColor = themeStyles.blockquoteBg
    el.style.color = themeStyles.blockquoteColor
    el.style.margin = '1em 0'
    el.style.padding = '0.5em 1em'
    el.style.fontStyle = 'italic'
  })

  // 表格样式
  element.querySelectorAll('table').forEach(el => {
    el.style.borderCollapse = 'collapse'
    el.style.width = '100%'
    el.style.marginBottom = '1em'
  })

  element.querySelectorAll('th, td').forEach(el => {
    el.style.border = `1px solid ${themeStyles.tableBorder}`
    el.style.padding = '8px 12px'
    el.style.textAlign = 'left'
  })

  element.querySelectorAll('th').forEach(el => {
    el.style.backgroundColor = themeStyles.tableHeaderBg
    el.style.fontWeight = '600'
  })

  // 列表样式
  element.querySelectorAll('ul, ol').forEach(el => {
    el.style.paddingLeft = '2em'
    el.style.marginBottom = '1em'
  })

  element.querySelectorAll('li').forEach(el => {
    el.style.marginBottom = '0.25em'
    el.style.color = themeStyles.textColor
  })

  // 分隔线样式
  element.querySelectorAll('hr').forEach(el => {
    el.style.border = 'none'
    el.style.borderTop = `1px solid ${themeStyles.tableBorder}`
    el.style.margin = '2em 0'
  })
}

// 导出为 DOCX
const exportToDOCX = async () => {
  if (!markdownContent.value) {
    message.warning('请先输入 Markdown 内容')
    return
  }

  isExporting.value = 'docx'

  try {
    // 动态导入 docx 库
    const docxModule = await import('docx')
    const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer, Table, TableRow, TableCell, WidthType, BorderStyle } = docxModule

    // 解析 Markdown 内容
    const lines = markdownContent.value.split('\n')
    const docChildren = []
    let inCodeBlock = false
    let codeBlockLines = []
    let codeLanguage = ''
    let inTable = false
    let tableLines = []

    // 根据主题获取样式
    const themeStyles = getDocxThemeStyles(previewStyle.value.theme)

    const addCodeBlock = () => {
      if (codeBlockLines.length > 0) {
        docChildren.push(new Paragraph({
          children: [new TextRun({
            text: `代码块${codeLanguage ? ` (${codeLanguage})` : ''}`,
            bold: true,
            color: '666666'
          })],
          spacing: { before: 200, after: 100 }
        }))

        codeBlockLines.forEach(line => {
          docChildren.push(new Paragraph({
            children: [new TextRun({
              text: line || ' ',
              font: themeStyles.codeFont,
              size: previewStyle.value.codeFontSize * 2,
              color: '333333'
            })],
            shading: { fill: 'F5F5F5' },
            spacing: { before: 0, after: 0 },
            indent: { left: 360 }
          }))
        })

        docChildren.push(new Paragraph({ text: '' }))
        codeBlockLines = []
        codeLanguage = ''
      }
    }

    const addTable = () => {
      if (tableLines.length > 0) {
        const rows = tableLines.filter(line => !line.match(/^\|[\s:-]+\|$/))

        if (rows.length > 0) {
          const tableRows = rows.map((row, rowIndex) => {
            const cells = row.split('|').filter(cell => cell.trim()).map(cell => cell.trim())

            return new TableRow({
              children: cells.map(cellText => new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({
                    text: cellText,
                    bold: rowIndex === 0,
                    size: previewStyle.value.fontSize * 2,
                    font: themeStyles.font
                  })]
                })],
                shading: rowIndex === 0 ? { fill: themeStyles.tableHeaderBg } : undefined,
                margins: { top: 100, bottom: 100, left: 100, right: 100 }
              }))
            })
          })

          docChildren.push(new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: themeStyles.borderColor },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: themeStyles.borderColor },
              left: { style: BorderStyle.SINGLE, size: 1, color: themeStyles.borderColor },
              right: { style: BorderStyle.SINGLE, size: 1, color: themeStyles.borderColor },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: themeStyles.borderColor },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: themeStyles.borderColor }
            }
          }))

          docChildren.push(new Paragraph({ text: '', spacing: { after: 200 } }))
        }

        tableLines = []
        inTable = false
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true
          codeLanguage = line.substring(3).trim()
        } else {
          addCodeBlock()
          inCodeBlock = false
        }
        continue
      }

      if (inCodeBlock) {
        codeBlockLines.push(line)
        continue
      }

      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        if (!inTable) inTable = true
        tableLines.push(line)
        continue
      } else if (inTable) {
        addTable()
      }

      if (!line.trim()) {
        docChildren.push(new Paragraph({ text: '' }))
        continue
      }

      // 标题
      if (line.startsWith('# ')) {
        docChildren.push(new Paragraph({
          text: line.substring(2),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }))
      } else if (line.startsWith('## ')) {
        docChildren.push(new Paragraph({
          text: line.substring(3),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 }
        }))
      } else if (line.startsWith('### ')) {
        docChildren.push(new Paragraph({
          text: line.substring(4),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 }
        }))
      } else if (line.startsWith('#### ')) {
        docChildren.push(new Paragraph({
          text: line.substring(5),
          heading: HeadingLevel.HEADING_4,
          spacing: { before: 200, after: 100 }
        }))
      }
      // 列表项
      else if (line.match(/^[-*+]\s/)) {
        const text = line.replace(/^[-*+]\s/, '')
        docChildren.push(new Paragraph({
          text: '• ' + text,
          spacing: { before: 50, after: 50 },
          indent: { left: 360 }
        }))
      } else if (line.match(/^\d+\.\s/)) {
        docChildren.push(new Paragraph({
          text: line,
          spacing: { before: 50, after: 50 },
          indent: { left: 360 }
        }))
      }
      // 引用
      else if (line.startsWith('> ')) {
        docChildren.push(new Paragraph({
          children: [new TextRun({
            text: line.substring(2),
            italics: true,
            color: themeStyles.quoteColor
          })],
          indent: { left: 720 },
          spacing: { before: 100, after: 100 },
          border: {
            left: { color: themeStyles.quoteBorder, space: 8, value: BorderStyle.SINGLE, size: 24 }
          }
        }))
      }
      // 数学公式
      else if (line.includes('$$') || line.includes('$')) {
        const formulaText = line.replace(/\$\$/g, '').replace(/\$/g, '')
        docChildren.push(new Paragraph({
          children: [new TextRun({
            text: `[公式] ${formulaText}`,
            italics: true,
            color: '0066CC',
            font: 'Cambria Math'
          })],
          spacing: { before: 100, after: 100 },
          alignment: line.includes('$$') ? AlignmentType.CENTER : AlignmentType.LEFT
        }))
      }
      // 分隔线
      else if (line.match(/^[-*_]{3,}$/)) {
        docChildren.push(new Paragraph({
          border: {
            bottom: { color: themeStyles.borderColor, space: 1, value: BorderStyle.SINGLE, size: 6 }
          },
          spacing: { before: 200, after: 200 }
        }))
      }
      // 普通段落
      else {
        let currentText = line
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/`(.*?)`/g, '$1')
          .replace(/\[(.*?)\]\(.*?\)/g, '$1')

        docChildren.push(new Paragraph({
          children: [new TextRun({
            text: currentText,
            size: previewStyle.value.fontSize * 2,
            font: themeStyles.font
          })],
          spacing: { after: 120, line: Math.round(previewStyle.value.lineHeight * 240) }
        }))
      }
    }

    if (inCodeBlock) addCodeBlock()
    if (inTable) addTable()

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: docChildren
      }],
      creator: exportSettings.value.author || 'Markdown Converter',
      title: exportSettings.value.title || '我的文档',
      description: '由 Markdown 转换器生成',
      styles: {
        default: {
          document: {
            run: { font: themeStyles.font, size: previewStyle.value.fontSize * 2 },
            paragraph: { spacing: { line: Math.round(previewStyle.value.lineHeight * 240), before: 0, after: 0 } }
          }
        }
      }
    })

    const blob = await Packer.toBlob(doc)
    saveAs(blob, `${exportSettings.value.title || 'document'}.docx`)
    message.success('DOCX 导出成功！')
  } catch (error) {
    console.error('DOCX 导出失败:', error)
    message.error('DOCX 导出失败，请稍后重试')
  } finally {
    isExporting.value = false
  }
}

// 根据主题获取 DOCX 样式
function getDocxThemeStyles(theme) {
  const themes = {
    default: {
      font: 'Microsoft YaHei',
      codeFont: 'Consolas',
      borderColor: 'CCCCCC',
      tableHeaderBg: 'E8E8E8',
      quoteColor: '666666',
      quoteBorder: 'CCCCCC'
    },
    elegant: {
      font: 'Georgia',
      codeFont: 'Consolas',
      borderColor: 'D4C4B0',
      tableHeaderBg: 'F5F0E8',
      quoteColor: '8B7355',
      quoteBorder: 'D4C4B0'
    },
    modern: {
      font: 'Calibri',
      codeFont: 'Fira Code',
      borderColor: '3B82F6',
      tableHeaderBg: 'EFF6FF',
      quoteColor: '3B82F6',
      quoteBorder: '3B82F6'
    },
    academic: {
      font: 'Times New Roman',
      codeFont: 'Courier New',
      borderColor: '000000',
      tableHeaderBg: 'F0F0F0',
      quoteColor: '333333',
      quoteBorder: '666666'
    }
  }
  return themes[theme] || themes.default
}
</script>

<style scoped>
.markdown-converter {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.converter-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-top: 1rem;
}

.editor-section,
.preview-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.markdown-input {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9rem;
}

.preview-container {
  border: 1px solid var(--border-color, #e5e5e5);
  border-radius: 8px;
  padding: 1.5rem;
  background: var(--card-bg, #fff);
  max-height: 600px;
  overflow-y: auto;
  font-size: var(--preview-font-size, 15px);
  line-height: var(--preview-line-height, 1.7);
}

.preview-container :deep(p) {
  margin-bottom: var(--preview-paragraph-spacing, 1em);
}

.preview-container :deep(pre),
.preview-container :deep(code) {
  font-size: var(--preview-code-font-size, 14px);
}

/* 主题风格 - 默认 */
.preview-container.theme-default {
  background: #ffffff;
}

.preview-container.theme-default :deep(h1),
.preview-container.theme-default :deep(h2),
.preview-container.theme-default :deep(h3) {
  color: #1a1a1a;
}

.preview-container.theme-default :deep(p),
.preview-container.theme-default :deep(li) {
  color: #333333;
}

.preview-container.theme-default :deep(a) {
  color: #646cff;
}

.preview-container.theme-default :deep(blockquote) {
  border-left: 4px solid #ddd;
  background: #f9f9f9;
  color: #666;
}

.preview-container.theme-default :deep(pre) {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
}

/* 主题风格 - 优雅 */
.preview-container.theme-elegant {
  background: #FFFEF5;
  border-color: #D4C4B0;
}

.preview-container.theme-elegant :deep(h1),
.preview-container.theme-elegant :deep(h2),
.preview-container.theme-elegant :deep(h3) {
  color: #3D3225;
}

.preview-container.theme-elegant :deep(p),
.preview-container.theme-elegant :deep(li) {
  color: #5D4E37;
}

.preview-container.theme-elegant :deep(a) {
  color: #8B7355;
}

.preview-container.theme-elegant :deep(blockquote) {
  border-left: 4px solid #C4B4A0;
  background: #FAF5ED;
  color: #6D5E47;
}

.preview-container.theme-elegant :deep(pre) {
  background: #F5F0E8;
  border: 1px solid #D4C4B0;
}

.preview-container.theme-elegant :deep(table th) {
  background: #F5F0E8;
}

.preview-container.theme-elegant :deep(table td),
.preview-container.theme-elegant :deep(table th) {
  border-color: #D4C4B0;
}

/* 主题风格 - 现代 */
.preview-container.theme-modern {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-color: #3B82F6;
  border-width: 2px;
}

.preview-container.theme-modern :deep(h1),
.preview-container.theme-modern :deep(h2),
.preview-container.theme-modern :deep(h3) {
  color: #1E40AF;
}

.preview-container.theme-modern :deep(p),
.preview-container.theme-modern :deep(li) {
  color: #334155;
}

.preview-container.theme-modern :deep(a) {
  color: #3B82F6;
}

.preview-container.theme-modern :deep(blockquote) {
  border-left: 4px solid #3B82F6;
  background: #EFF6FF;
  color: #1E40AF;
}

.preview-container.theme-modern :deep(pre) {
  background: #EFF6FF;
  border: 1px solid #BFDBFE;
}

.preview-container.theme-modern :deep(table th) {
  background: #DBEAFE;
}

.preview-container.theme-modern :deep(table td),
.preview-container.theme-modern :deep(table th) {
  border-color: #BFDBFE;
}

/* 主题风格 - 学术 */
.preview-container.theme-academic {
  background: #FFFFFF;
  border-color: #000;
}

.preview-container.theme-academic :deep(h1),
.preview-container.theme-academic :deep(h2),
.preview-container.theme-academic :deep(h3) {
  font-family: 'Times New Roman', 'SimSun', serif;
  color: #000000;
}

.preview-container.theme-academic :deep(p),
.preview-container.theme-academic :deep(li) {
  color: #000000;
}

.preview-container.theme-academic :deep(a) {
  color: #000080;
}

.preview-container.theme-academic :deep(blockquote) {
  border-left: 4px solid #666666;
  background: #f5f5f5;
  color: #333333;
}

.preview-container.theme-academic :deep(pre) {
  background: #f8f8f8;
  border: 1px solid #cccccc;
}

.preview-container.theme-academic :deep(table th) {
  background: #e8e8e8;
}

.preview-container.theme-academic :deep(table td),
.preview-container.theme-academic :deep(table th) {
  border-color: #000000;
}

/* 字体选择 */
.preview-container.font-system { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.preview-container.font-source-han-sans { font-family: 'Source Han Sans SC', 'Noto Sans SC', sans-serif; }
.preview-container.font-source-han-serif { font-family: 'Source Han Serif SC', 'Noto Serif SC', serif; }
.preview-container.font-lxgw { font-family: 'LXGW WenKai', 'Noto Sans SC', sans-serif; }
.preview-container.font-inter { font-family: 'Inter', sans-serif; }

.dark-theme .preview-container {
  border-color: var(--border-color-dark, #333);
  background: var(--card-bg-dark, #1a1a1a);
}

.dark-theme .preview-container.theme-default {
  background: #1a1a1a;
}

.dark-theme .preview-container.theme-default :deep(h1),
.dark-theme .preview-container.theme-default :deep(h2),
.dark-theme .preview-container.theme-default :deep(h3) {
  color: #e5e5e5;
}

.dark-theme .preview-container.theme-default :deep(p),
.dark-theme .preview-container.theme-default :deep(li) {
  color: #d1d1d1;
}

.dark-theme .preview-container.theme-default :deep(pre) {
  background: #2d2d2d;
  border-color: #404040;
}

.dark-theme .preview-container.theme-default :deep(blockquote) {
  background: #252525;
  border-color: #404040;
  color: #aaa;
}

.dark-theme .preview-container.theme-elegant {
  background: #2D2A26;
  border-color: #5D4E37;
}

.dark-theme .preview-container.theme-elegant :deep(h1),
.dark-theme .preview-container.theme-elegant :deep(h2),
.dark-theme .preview-container.theme-elegant :deep(h3) {
  color: #E8DDD0;
}

.dark-theme .preview-container.theme-elegant :deep(p),
.dark-theme .preview-container.theme-elegant :deep(li) {
  color: #D4C4B0;
}

.dark-theme .preview-container.theme-elegant :deep(pre) {
  background: #3D3530;
  border-color: #5D4E37;
}

.dark-theme .preview-container.theme-modern {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border-color: #3B82F6;
}

.dark-theme .preview-container.theme-modern :deep(h1),
.dark-theme .preview-container.theme-modern :deep(h2),
.dark-theme .preview-container.theme-modern :deep(h3) {
  color: #60A5FA;
}

.dark-theme .preview-container.theme-modern :deep(p),
.dark-theme .preview-container.theme-modern :deep(li) {
  color: #CBD5E1;
}

.dark-theme .preview-container.theme-modern :deep(pre) {
  background: #1E3A5F;
  border-color: #3B82F6;
}

.dark-theme .preview-container.theme-academic {
  background: #1a1a1a;
  border-color: #666;
}

.dark-theme .preview-container.theme-academic :deep(h1),
.dark-theme .preview-container.theme-academic :deep(h2),
.dark-theme .preview-container.theme-academic :deep(h3) {
  color: #ffffff;
}

.dark-theme .preview-container.theme-academic :deep(p),
.dark-theme .preview-container.theme-academic :deep(li) {
  color: #e0e0e0;
}

.dark-theme .preview-container.theme-academic :deep(pre) {
  background: #2a2a2a;
  border-color: #555;
}

.empty-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--text-tertiary);
  gap: 1rem;
}

.settings-panel {
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 700px;
}

.settings-card {
  border-radius: 12px;
}

.slider-value {
  margin-left: 1rem;
  min-width: 50px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.export-actions {
  padding-top: 1rem;
  border-top: 1px solid var(--border-color, #e5e5e5);
}

.dark-theme .export-actions {
  border-top-color: var(--border-color-dark, #333);
}

@media (max-width: 992px) {
  .converter-layout {
    grid-template-columns: 1fr;
  }
}

:deep(.markdown-renderer) {
  font-size: inherit;
  line-height: inherit;
}

:deep(.markdown-renderer h1) { font-size: 2em; margin-top: 0; }
:deep(.markdown-renderer h2) { font-size: 1.5em; }
:deep(.markdown-renderer code) { font-size: 0.9em; }
</style>
