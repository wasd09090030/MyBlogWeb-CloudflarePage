#!/usr/bin/env node
/**
 * check-design.mjs — 阻止公开站样式回潮
 *
 * 规则来源：DESIGN.md（蜜桃阅览室）与「全站风格统一」方案。
 *
 * 三类检查：
 *  1. Tailwind 调色板工具类（gray-*、indigo-*、pink-* ……）——应改用语义类
 *     bg-card / text-ink / text-ink-soft / border-warm / bg-rouge …
 *  2. 冷色字面量（slate / cool gray / indigo / blue / Tailwind red 的 rgba）
 *  3. 裸 hex：只允许 theme-variables.css 中已定义的 token 值、纯白纯黑
 *
 * 例外：
 *  - 行内或上一行写 `design-allow: 原因`
 *  - 用 `design-allow-block` 与 `end-design-allow-block` 注释标记包住一段
 *    （品牌色表、代码岛、画廊专属世界等）
 *
 * 用法：npm run check:design
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'

const root = resolve(process.cwd())
const appDir = join(root, 'app')
const tokenFile = join(appDir, 'assets/css/theme-variables.css')

const PALETTE = '(gray|slate|zinc|neutral|stone|indigo|violet|purple|blue|cyan|sky|emerald|green|lime|red|rose|pink|fuchsia|amber|orange)'
const PALETTE_CLASS_RE = new RegExp(
  `\\b(?:bg|text|border|from|to|via|ring|shadow|divide|placeholder|outline|decoration|fill|stroke|accent|caret)-${PALETTE}-\\d{2,3}\\b`,
  'g'
)

const COLD_RGBA_RE = new RegExp(
  'rgba\\(\\s*(?:' +
    [
      '15\\s*,\\s*23\\s*,\\s*42', // slate-900
      '30\\s*,\\s*41\\s*,\\s*59', // slate-800
      '36\\s*,\\s*41\\s*,\\s*46', // github gray
      '55\\s*,\\s*65\\s*,\\s*81', // gray-700
      '148\\s*,\\s*163\\s*,\\s*184', // slate-400
      '226\\s*,\\s*232\\s*,\\s*240', // slate-200
      '239\\s*,\\s*68\\s*,\\s*68', // red-500
      '99\\s*,\\s*102\\s*,\\s*241', // indigo-500
      '59\\s*,\\s*130\\s*,\\s*246' // blue-500
    ].join('|') +
    ')\\s*,',
  'g'
)

const HEX_RE = /#([0-9a-fA-F]{3,8})\b/g
const ALLOWED_HEX = new Set(['fff', 'ffffff', '000', '000000'])

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) out.push(...walk(full))
    else if (/\.(vue|css)$/.test(entry)) out.push(full)
  }
  return out
}

/** 从主题变量文件里收集所有 hex 值，作为“合法 token”白名单。 */
function collectTokenHexes(file) {
  const set = new Set(ALLOWED_HEX)
  const source = readFileSync(file, 'utf8')
  for (const match of source.matchAll(HEX_RE)) set.add(match[1].toLowerCase())
  return set
}

function isAllowed(line, prevLine) {
  return /design-allow/.test(line) || /design-allow/.test(prevLine || '')
}

function checkFile(file, allowedHexes) {
  if (file === tokenFile) return []
  const rel = relative(root, file).split(sep).join('/')
  if (rel.includes('node_modules/')) return []

  const lines = readFileSync(file, 'utf8').split(/\r?\n/)
  const findings = []
  let blockAllow = false

  lines.forEach((line, index) => {
    const prev = lines[index - 1]
    if (/end-design-allow-block/.test(line)) {
      blockAllow = false
      return
    }
    if (/design-allow-block/.test(line)) {
      blockAllow = true
      return
    }
    if (blockAllow || isAllowed(line, prev)) return
    const lineNo = index + 1
    const push = (rule, detail) => findings.push({ rel, lineNo, rule, detail })

    for (const match of line.matchAll(PALETTE_CLASS_RE)) {
      push('palette-class', `${match[0]} → 改用语义类（bg-card / text-ink / border-warm / bg-rouge …）`)
    }

    for (const match of line.matchAll(COLD_RGBA_RE)) {
      push('cold-color', `${match[0]} … → 改用 token（--text-* / --border-* / --bg-*）`)
    }

    for (const match of line.matchAll(HEX_RE)) {
      const value = match[1].toLowerCase()
      if (!allowedHexes.has(value)) {
        push('raw-hex', `${match[0]} 不在 token 中 → 改用 var(--…)，或加 design-allow 注明原因`)
      }
    }
  })

  return findings
}

if (!statSync(appDir, { throwIfNoEntry: false })?.isDirectory()) {
  console.error('check-design: 找不到 app/ 目录，请在 nuxt-public 目录下运行。')
  process.exit(1)
}

const allowedHexes = collectTokenHexes(tokenFile)
const findings = walk(appDir).flatMap(file => checkFile(file, allowedHexes))

if (findings.length === 0) {
  console.log('check-design: 通过。')
  process.exit(0)
}

console.error(`check-design: 发现 ${findings.length} 处风格漂移。\n`)
const byFile = new Map()
for (const item of findings) {
  if (!byFile.has(item.rel)) byFile.set(item.rel, [])
  byFile.get(item.rel).push(item)
}

for (const [rel, items] of byFile) {
  console.error(rel)
  for (const item of items) {
    console.error(`  ${item.lineNo}:${' '}${item.rule} — ${item.detail}`)
  }
  console.error('')
}

process.exit(1)
