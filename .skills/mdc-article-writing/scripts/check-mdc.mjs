#!/usr/bin/env node
/**
 * check-mdc.mjs — 校验博客 MDC 文章语法与类别用组件规范
 *
 * 用法：
 *   node .skills/mdc-article-writing/scripts/check-mdc.mjs article.md
 *   node .skills/mdc-article-writing/scripts/check-mdc.mjs a.md b.md
 *   node .skills/mdc-article-writing/scripts/check-mdc.mjs article.md --category game
 *   node .skills/mdc-article-writing/scripts/check-mdc.mjs article.md --category=resource
 *
 * 不带 --category 时只查语法（通用检查）。带上类别后，额外按 references/patterns.md
 * 的矩阵检查组件取舍：不该出现的组件报 error，有条件使用的组件在不满足条件时报 warning。
 *
 * 退出码：0 = 无错误，1 = 有错误（warning 不影响退出码），2 = 用法错误。
 *
 * 通用检查项：
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
 *   - star-rating 嵌在 tabs 内
 *
 * 类别检查项（--category 指定后）：
 *   - 该类别禁用组件是否出现
 *   - 有条件组件是否越界（github-card / alert / type-writer / tabs 数量上限）
 *   - 结构性缺失（resource 类无 link-card、work 类无成品图或外部入口、game 类只有一个评分）
 *   - 全文一个组件都没用
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

/**
 * 类别 → 组件规范。数据来源：references/patterns.md 的矩阵。
 * 'forbid'  = 该类文章不该出现，报 error
 * 'allowed' = 正常使用
 * 有条件使用的组件用 limits 表达（数量上限）。
 */
const CATEGORY_RULES = {
  study: {
    label: '学习笔记 / 技术教程 / 踩坑复盘',
    forbid: ['spoiler', 'star-rating', 'type-writer'],
    limits: { 'github-card': 2 },
  },
  game: {
    label: '游戏评测',
    forbid: ['code-playground', 'steps', 'github-card', 'link-card', 'tabs'],
    limits: {},
  },
  work: {
    label: '个人作品 / 项目展示',
    forbid: ['spoiler'],
    limits: { 'github-card': 2, 'type-writer': 1, tabs: 1 },
  },
  resource: {
    label: '资源分享',
    forbid: ['star-rating', 'spoiler', 'code-playground', 'steps', 'image-comparison', 'type-writer', 'web-embed'],
    limits: {},
  },
  other: {
    label: '随笔 / 日记 / 更新日志',
    forbid: ['tabs', 'steps', 'code-playground', 'star-rating', 'spoiler', 'image-comparison', 'web-embed', 'github-card', 'link-card'],
    limits: { alert: 1, 'type-writer': 1 },
  },
}

/**
 * 禁用理由。按类别分组，因为同一个组件在不同类别里被禁的原因不同
 * （例如 star-rating 在 study 里像软文，在 resource 里是让读者多花一次注意力）。
 * 查不到时回退到 GENERIC_REASON。
 */
const CATEGORY_FORBID_REASON = {
  study: {
    'spoiler': '技术内容没有「剧透」概念，遮起来只会让人多点击一次；要收起长内容用 collapse。',
    'star-rating': '技术笔记用星级评分会让文章显得像产品软文。',
    'type-writer': '读者要的是信息，不是动效。',
  },
  game: {
    'code-playground': '评测里出现代码沙箱会立刻破坏阅读氛围。',
    'steps': '评测读者不是来跟着做的。',
    'github-card': '评测里放仓库卡片会打断阅读。',
    'link-card': '评测读者不需要逐个点开外链，入口放文末一段链接就够。',
    'tabs': '标签页是重交互；分项评分要平铺，别让读者点四次才看全。',
  },
  work: {
    'spoiler': '作品展示没有需要遮的内容，遮起来只会让人多点击一次。',
  },
  resource: {
    'star-rating': '资源页读者是来拿东西的，评分会让他们多花一次判断。',
    'spoiler': '资源页没有需要遮的内容，遮起来是在阻止读者拿到链接。',
    'code-playground': '资源页读者要的是链接，不是可运行示例。',
    'steps': '资源页读者不是来跟着做的。',
    'image-comparison': '拖动对比滑块是在阻止读者拿链接。',
    'type-writer': '资源页需要一眼扫完，动效只会延迟信息出现。',
    'web-embed': '资源页以链接为主，嵌入播放器会稀释重点。',
  },
  other: {
    'tabs': '随笔用标签页显得很刻意。',
    'steps': '随笔读者不是来跟着做的。',
    'code-playground': '随笔里出现代码沙箱会破坏文字节奏。',
    'star-rating': '随笔打分像在给生活做 KPI。',
    'spoiler': '随笔没有剧透概念，遮起来只会让人多点击一次。',
    'image-comparison': '随笔不需要拖动对比。',
    'web-embed': '随笔里嵌播放器会打断阅读。',
    'github-card': '随笔里放仓库卡片会打断阅读。',
    'link-card': '随笔里堆链接按钮显得像广告位。',
  },
}

const GENERIC_REASON = '该组件对这一类文章是噪音。'

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

function checkFile(path, category) {
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
  // 记录每个组件的首次出现行号与出现次数，供类别规则使用
  const componentUses = /** @type {Record<string, { line: number, count: number }>} */ ({})
  const noteUse = (name, line) => {
    if (!componentUses[name]) componentUses[name] = { line, count: 0 }
    componentUses[name].count++
  }
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
        noteUse(name, lineNo)
        // star-rating 嵌进 tabs：评测类明确要平铺，其它类别也给提醒
        if (name === 'star-rating') {
          const parent = stack[stack.length - 1]
          if (parent && parent.name === 'tabs') {
            warn(lineNo, '`::star-rating` 嵌在 `::tabs` 内，读者要逐个点开才能看全分数；评分建议平铺。')
          }
        }
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
        if (colons.length < expected) {
          // 冒号数不足时，闭合标记会提前结束外层组件，内层内容被挤到外面 —— 结构直接错位
          err(lineNo, '嵌套冒号数不足：外层 `::' + parent.name + '` 用了 ' + parent.colon + ' 个冒号，内层至少要用 ' + expected + ' 个（当前 ' + colons.length + ' 个）。同数量的闭合标记会提前关闭外层组件，导致结构错位。')
        } else if (colons.length > expected) {
          warn(lineNo, '嵌套冒号数偏多：外层用了 ' + parent.colon + ' 个，内层建议 ' + expected + ' 个（当前 ' + colons.length + ' 个）。能闭合，但和闭合标记要逐个数对。')
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

  // ——— 类别规则 ———
  if (category && CATEGORY_RULES[category]) {
    const rule = CATEGORY_RULES[category]
    const usedNames = Object.keys(componentUses)
    if (!usedNames.length) {
      warn(1, '这篇文章没有使用任何 MDC 组件（' + rule.label + ' 类别通常至少会用一处 alert 或 collapse）。')
    }
    for (const forbidden of rule.forbid) {
      const use = componentUses[forbidden]
      if (use) {
        const reason = (CATEGORY_FORBID_REASON[category] || {})[forbidden] || GENERIC_REASON
        err(use.line, '`::' + forbidden + '` 不适合 ' + category + '（' + rule.label + '）类文章。' + reason)
      }
    }
    for (const [name, limit] of Object.entries(rule.limits || {})) {
      const use = componentUses[name]
      if (use && use.count > limit) {
        warn(use.line, '`::' + name + '` 在 ' + category + ' 类文章里出现了 ' + use.count + ' 次，建议不超过 ' + limit + ' 次。')
      }
    }
    if (category === 'game' && componentUses['star-rating']) {
      const n = componentUses['star-rating'].count
      if (n === 1) {
        warn(componentUses['star-rating'].line, 'game 类只有总评一个 star-rating；评测通常还要给出分项评分。')
      }
    }
    if (category === 'resource' && !componentUses['link-card']) {
      warn(1, 'resource 类没有使用 `::link-card` —— 资源分享的核心是让读者一眼拿到链接。')
    }
    if (category === 'work' && !componentUses['link-card'] && !componentUses['github-card'] && !componentUses['web-embed'] && !componentUses['image-enhanced']) {
      warn(1, '作品类文章既没有成品图也没有外部入口（link-card / github-card / web-embed）；读者没法判断这东西长什么样、去哪看。')
    }
  }

  return { path, errors, warnings }
}

function report(result) {
  const label = basename(result.path)
  const total = result.errors.length + result.warnings.length
  if (!total) {
    console.log('✔ ' + label + ' — 检查通过' + (result.category ? '（' + result.category + ' 类）' : ''))
    return true
  }
  console.log('\n' + label + '  (' + result.errors.length + ' 错误, ' + result.warnings.length + ' 警告' + (result.category ? '，' + result.category + ' 类' : '') + ')')
  for (const e of result.errors.sort((a, b) => a.line - b.line)) {
    console.log('  ✖ 第 ' + e.line + ' 行  ' + e.msg)
  }
  for (const w of result.warnings.sort((a, b) => a.line - b.line)) {
    console.log('  ⚠ 第 ' + w.line + ' 行  ' + w.msg)
  }
  return result.errors.length === 0
}

const argv = process.argv.slice(2)
let category = null
const targets = []
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--category' || a === '-c') {
    category = (argv[i + 1] || '').toLowerCase()
    i++
  } else if (a.startsWith('--category=')) {
    category = a.slice('--category='.length).toLowerCase()
  } else if (!a.startsWith('-')) {
    targets.push(a)
  }
}

if (category && !CATEGORY_RULES[category]) {
  console.error('未知类别: ' + category + '。可选: ' + Object.keys(CATEGORY_RULES).join(' / '))
  process.exit(2)
}
if (!targets.length) {
  console.error('用法: node check-mdc.mjs <article.md> [more.md ...] [--category study|game|work|resource|other]')
  process.exit(2)
}

let ok = true
let totalErrors = 0
for (const t of targets) {
  const r = checkFile(t, category)
  r.category = category
  totalErrors += r.errors.length
  if (!report(r)) ok = false
}

if (!ok) {
  console.log('\n共 ' + totalErrors + ' 处错误。修完再发布 —— 语法错误不会在运行时抛异常，只会静默变成纯文本。')
}
process.exit(ok ? 0 : 1)
