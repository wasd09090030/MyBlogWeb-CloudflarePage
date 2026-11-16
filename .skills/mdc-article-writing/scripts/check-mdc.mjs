#!/usr/bin/env node
/**
 * check-mdc.mjs — 校验博客 MDC 文章语法
 *
 * 用法：
 *   node .skills/mdc-article-writing/scripts/check-mdc.mjs article.md
 *   node .skills/mdc-article-writing/scripts/check-mdc.mjs a.md b.md
 *
 * 只查语法与契约，不评价内容质量。退出码：0 = 无错误，1 = 有错误（warning 不影响退出码）。
 *
 * 检查项：
 *   - 未知组件名 / 已废弃组件
 *   - 块标记缩进（必须顶格）
 *   - 冒号数量不配对、块未闭合、多余闭合
 *   - 开始标记同行夹带内容
 *   - 必填 props 缺失
 *   - tabs 的 labels 数量与 #tab-N 槽数量不一致
 *   - steps 缺少 YAML steps
 *   - 枚举 prop 取值越界
 *   - star-rating 取值步进与上限
 *   - web-embed 域名白名单
 *   - code-playground 的 runnable 与非 JS 语言冲突
 *   - 标题层级超过 h4
 *   - code-playground 内使用 mermaid 围栏
 */

import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

const REGISTRY = {
  alert: {},
  tabs: {},
  collapse: {},
  spoiler: {},
  steps: {},
  'code-playground': {},
  'image-enhanced': {},
  'image-comparison': {},
  'star-rating': {},
  'github-card': {},
  'link-card': {},
  'type-writer': {},
  'web-embed': {},
}

const DISABLED = {
  'related-articles': '组件已移出 app/components/content/，MDC 标签渲染不出来；相关推荐由正文下方自动挂载。',
}

const ENUMS = {
  alert: { type: ['info', 'success', 'warning', 'error'] },
  'star-rating': { size: ['small', 'medium', 'large'] },
  steps: { size: ['small', 'medium'], status: ['process', 'finish', 'error', 'wait'] },
  'image-enhanced': { align: ['left', 'center', 'right'] },
}

const REQUIRED = {
  'image-enhanced': ['src'],
  'github-card': ['repo'],
  'link-card': ['url', 'text'],
}

const ALLOWED_EMBED_HOSTS = [
  'bilibili.com', 'youtube.com', 'youtu.be', 'codepen.io', 'codesandbox.io', 'stackblitz.com',
]

const JS_LANGS = new Set(['javascript', 'js', 'node'])

function parseAttrs(raw) {
  const inner = raw.trim().replace(/^\{/, '').replace(/\}$/, '')
  const out = {}
  const re = /([A-Za-z0-9_:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'}]+)))?/g
  let m
  while ((m = re.exec(inner))) {
    out[m[1]] = m[2] ?? m[3] ?? m[4] ?? 'true'
  }
  return out
}

function parseLabels(yaml) {
  const line = yaml.split('\n').find(l => /^\s*labels\s*:/.test(l))
  if (!line) return null
  const raw = line.replace(/^\s*labels\s*:/, '').trim()
  const open = raw.indexOf('[')
  const close = raw.lastIndexOf(']')
  if (open === -1 || close === -1) {
    // flow-less 形式: labels:\n  - "a"\n  - "b"
    const rest = yaml.slice(yaml.indexOf(line) + line.length)
    const items = []
    for (const l of rest.split('\n')) {
      const m = l.match(/^\s*-\s*(.+?)\s*$/)
      if (m) items.push(m[1].replace(/^["']|["']$/g, ''))
      else if (l.trim() === '') continue
      else break
    }
    return items.length ? items : null
  }
  const body = raw.slice(open + 1, close)
  const items = []
  const re = /"([^"]*)"|'([^']*)'|([^,]+)/g
  let m
  while ((m = re.exec(body))) {
    const v = (m[1] ?? m[2] ?? m[3] ?? '').trim()
    if (v) items.push(v)
  }
  return items
}

function hostAllowed(value) {
  try {
    const u = new URL(value)
    if (!['http:', 'https:'].includes(u.protocol)) return false
    const h = u.hostname.toLowerCase()
    return ALLOWED_EMBED_HOSTS.some(x => h === x || h.endsWith('.' + x))
  } catch {
    return false
  }
}

function checkFile(path) {
  let source
  try {
    source = readFileSync(path, 'utf8')
  } catch (e) {
    return { path, errors: [{ line: 0, msg: '无法读取文件：' + e.message }], warnings: [] }
  }

  const lines = source.split(/\r?\n/)
  const errors = []
  const warnings = []
  const err = (line, msg) => errors.push({ line, msg })
  const warn = (line, msg) => warnings.push({ line, msg })

  const stack = []
  let fence = null
  let inYaml = false
  let yamlLines = []
  let yamlOwner = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNo = i + 1

    // 代码围栏：内部一切内容都不是 MDC 语法
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/)
    if (fenceMatch) {
      if (!fence) {
        fence = fenceMatch[1]
        const info = fenceMatch[2].trim().toLowerCase()
        if (info.startsWith('mermaid')) {
          const owner = stack[stack.length - 1]
          if (owner && owner.name === 'code-playground') {
            warn(lineNo, 'code-playground 内用 mermaid 围栏不会渲染成图表；想画图请把 mermaid 围栏放到组件外面。')
          }
        }
      } else if (line.trim().startsWith(fence[0].repeat(fence.length))) {
        fence = null
      }
      continue
    }
    if (fence) continue

    // MDC 块内的 YAML 区块
    if (stack.length && line.trim() === '---') {
      if (!inYaml) {
        inYaml = true
        yamlLines = []
        yamlOwner = stack[stack.length - 1]
      } else {
        inYaml = false
        yamlOwner.yaml = yamlLines.join('\n')
        yamlOwner = null
      }
      continue
    }
    if (inYaml) {
      yamlLines.push(line)
      continue
    }

    // 闭合标记
    const closeMatch = line.match(/^(\s*)(::+)\s*$/)
    if (closeMatch) {
      const indentLen = closeMatch[1].length
      if (indentLen) {
        const msg = '闭合标记 `::` 前面有 ' + indentLen + ' 个空格；建议顶格书写，缩进的标记可能被当成普通段落。'
        indentLen >= 4 ? err(lineNo, msg) : warn(lineNo, msg)
      }
      const n = closeMatch[2].length
      const top = stack[stack.length - 1]
      if (!top) {
        err(lineNo, '多余的闭合标记 `' + closeMatch[2] + '`，没有对应的开始标记。')
        continue
      }
      if (top.colon !== n) {
        err(lineNo, '闭合标记冒号数不匹配：`::' + top.name + '` 用 ' + top.colon + ' 个冒号开始，这里用了 ' + n + ' 个。')
      }
      const done = stack.pop()
      if (done.name === 'tabs') {
        const labels = done.yaml ? parseLabels(done.yaml) : null
        if (labels) {
          const slots = done.slots.filter(s => /^tab-\d+$/.test(s)).length
          if (slots !== labels.length) {
            err(done.line, 'tabs 有 ' + labels.length + ' 个 labels，但只找到 ' + slots + ' 个 #tab-N 槽；缺的标签点开会是空白。')
          }
          labels.forEach((_, idx) => {
            if (!done.slots.includes('tab-' + idx)) {
              err(done.line, 'tabs 缺少槽 #tab-' + idx + '（labels 第 ' + (idx + 1) + ' 项）。')
            }
          })
        } else {
          err(done.line, 'tabs 缺少 YAML `labels`，无法确定标签数量。')
        }
      }
      if (done.name === 'steps') {
        if (!done.yaml || !/^\s*steps\s*:/m.test(done.yaml)) {
          err(done.line, 'steps 缺少 YAML `steps` 数组，进度条会渲染为空。')
        }
      }
      continue
    }

    // 开始标记
    const openMatch = line.match(/^(\s*)(::+)\s*([a-z][a-z0-9-]*)\s*(\{[^}]*\})?\s*(.*)$/)
    if (openMatch) {
      const [, indent, colons, name, attrRaw, trailing] = openMatch
      const attrs = attrRaw ? parseAttrs(attrRaw) : {}

      if (indent.length) {
        const msg = '开始标记 `::' + name + '` 前面有 ' + indent.length + ' 个空格；建议顶格书写，缩进的块标记容易被当成普通段落。'
        indent.length >= 4 ? err(lineNo, msg) : warn(lineNo, msg)
      }
      if (trailing.trim()) {
        err(lineNo, '开始标记 `::' + name + '` 后不允许同行内容；内容要从下一行开始。')
      }
      if (DISABLED[name]) {
        err(lineNo, '`::' + name + '` 当前不可用：' + DISABLED[name])
      } else if (!REGISTRY[name]) {
        err(lineNo, '未知组件 `::' + name + '`。已注册：' + Object.keys(REGISTRY).join('、') + '。')
      } else {
        // 枚举
        const enums = ENUMS[name] || {}
        for (const [key, allowed] of Object.entries(enums)) {
          if (attrs[key] !== undefined && !allowed.includes(attrs[key])) {
            err(lineNo, '`::' + name + '` 的 ' + key + '="' + attrs[key] + '" 不在允许值内（' + allowed.join(' | ') + '）。')
          }
        }
        // 必填
        for (const key of REQUIRED[name] || []) {
          if (!attrs[key]) {
            err(lineNo, '`::' + name + '` 缺少必填属性 ' + key + '。')
          }
        }
        // web-embed 的两种传参形式
        if (name === 'web-embed') {
          if (!attrs.url && !(attrs.platform && attrs.vid)) {
            err(lineNo, '`::web-embed` 需要 `url`，或者 `platform` + `vid`。')
          }
          if (attrs.url && !hostAllowed(attrs.url)) {
            err(lineNo, '`::web-embed` 的域名不在白名单内（' + ALLOWED_EMBED_HOSTS.join(' / ') + '），只会显示「无效的 URL」。')
          }
          for (const key of ['platform', 'vid']) {
            if (attrs[key] && !attrs.url) {
              const v = attrs[key]
              if (key === 'vid' && /[:/]/.test(v) && v.includes('://')) {
                warn(lineNo, '`vid` 应只填 id，不要填完整 URL。')
              }
            }
          }
          if (attrs.aspectRatio === undefined && (attrs.width || attrs.height)) {
            warn(lineNo, '`::web-embed` 的 aspectRatio 有默认值 16/9，width/height 不会生效；要改尺寸请写 aspectRatio。')
          }
        }
        // star-rating 取值
        if (name === 'star-rating') {
          const rating = Number(attrs.rating ?? 0)
          const max = Number(attrs.maxStars ?? 5)
          if (Number.isNaN(rating)) {
            err(lineNo, '`::star-rating` 的 rating="' + attrs.rating + '" 不是数字。')
          } else {
            if (rating > max) err(lineNo, '`::star-rating` 的 rating(' + rating + ') 大于 maxStars(' + max + ')，会被夹到上限。')
            if (rating < 0) err(lineNo, '`::star-rating` 的 rating 不能为负。')
            if (Math.abs(rating * 2 - Math.round(rating * 2)) > 1e-9) {
              warn(lineNo, '`::star-rating` 的 rating=' + rating + ' 会按 0.5 步进取整显示。')
            }
            if (max > 10) err(lineNo, '`::star-rating` 的 maxStars 上限为 10。')
          }
        }
        // code-playground 可运行语言
        if (name === 'code-playground' && attrs.runnable && attrs.runnable !== 'false') {
          const lang = (attrs.lang || 'javascript').toLowerCase()
          if (!JS_LANGS.has(lang)) {
            err(lineNo, '`::code-playground` 的 runnable 只对 ' + [...JS_LANGS].join(' / ') + ' 生效，lang="' + lang + '" 不会出现运行按钮。')
          }
        }
      }

      if (stack.length) {
        const parent = stack[stack.length - 1]
        const expected = parent.colon + 1
        if (colons.length !== expected) {
          warn(lineNo, '嵌套层级冒号数可疑：外层 `::' + parent.name + '` 用了 ' + parent.colon + ' 个冒号，内层建议用 ' + expected + ' 个（当前 ' + colons.length + ' 个）。')
        }
      } else if (colons.length !== 2) {
        warn(lineNo, '顶层组件通常用 2 个冒号，当前用了 ' + colons.length + ' 个。')
      }

      stack.push({ name, colon: colons.length, line: lineNo, attrs, slots: [], yaml: null })
      continue
    }

    // 槽位声明
    const slotMatch = line.match(/^(#default|#[A-Za-z0-9_-]+)\s*$/)
    if (slotMatch && stack.length) {
      const top = stack[stack.length - 1]
      top.slots.push(slotMatch[1].slice(1))
      continue
    }

    // 行内夹带的块组件：::name 出现在行中间，MDC 的块解析器要求行首
    const inlineMdc = line.match(/[^\s`]\s*(::+[a-z][a-z0-9-]*)/)
    if (inlineMdc && !line.trimStart().startsWith('::')) {
      const name = inlineMdc[1].replace(/^:+/, '')
      if (REGISTRY[name] || DISABLED[name]) {
        warn(lineNo, '`' + inlineMdc[1] + '` 出现在行中间；块组件只在行首被解析，这样写通常不会生效。')
      }
    }

    // 标题层级
    const hMatch = line.match(/^(#{1,6})\s+\S/)
    if (hMatch && hMatch[1].length >= 5) {
      warn(lineNo, '用了 h' + hMatch[1].length + '，本站 h5/h6 不生成锚点也不进 TOC；建议改用列表或 ::collapse 收起来。')
    }
  }

  if (fence) {
    errors.push({ line: lines.length, msg: '代码围栏未闭合（' + fence + '）。' })
  }
  for (const frame of stack) {
    errors.push({ line: frame.line, msg: '`::' + frame.name + '` 未闭合，文件结束时仍缺少 ' + '`'.concat(':'.repeat(frame.colon)) + ' 收尾。' })
  }

  return { path, errors, warnings }
}

function report(result) {
  const label = basename(result.path)
  const total = result.errors.length + result.warnings.length
  if (!total) {
    console.log('✔ ' + label + ' — 语法检查通过')
    return true
  }
  console.log('\n' + label + '  (' + result.errors.length + ' 错误, ' + result.warnings.length + ' 警告)')
  for (const e of result.errors.sort((a, b) => a.line - b.line)) {
    console.log('  ✖ 第 ' + e.line + ' 行  ' + e.msg)
  }
  for (const w of result.warnings.sort((a, b) => a.line - b.line)) {
    console.log('  ⚠ 第 ' + w.line + ' 行  ' + w.msg)
  }
  return result.errors.length === 0
}

const targets = process.argv.slice(2).filter(a => !a.startsWith('-'))
if (!targets.length) {
  console.error('用法: node check-mdc.mjs <article.md> [more.md ...]')
  process.exit(2)
}

let ok = true
let totalErrors = 0
for (const t of targets) {
  const r = checkFile(t)
  totalErrors += r.errors.length
  if (!report(r)) ok = false
}

if (!ok) {
  console.log('\n共 ' + totalErrors + ' 处语法错误。修完再发布 —— 这些错误不会在运行时抛异常，只会静默变成纯文本。')
}
process.exit(ok ? 0 : 1)
