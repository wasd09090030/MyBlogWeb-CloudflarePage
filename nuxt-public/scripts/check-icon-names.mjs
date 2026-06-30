#!/usr/bin/env node
// check-icon-names.mjs
// 扫描 nuxt-public/app/**/*.vue，校验所有 <Icon name="..." /> 包含 collection 前缀。
// 用法：node scripts/check-icon-names.mjs （在 nuxt-public/ 目录下执行）

import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT = join(__dirname, '..', 'app')

// 匹配 <Icon ... name="literal" /> (字面量；不匹配 :name="..." 动态绑定)
// (?<!:) 排除绑定形式——绑定的值由 data source 决定，不在 lint 范围
const ICON_RE = /<Icon\b[^>]*?(?<!:)\bname="([^"]+)"/g

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) {
      yield* walk(p)
    } else if (e.isFile() && e.name.endsWith('.vue')) {
      yield p
    }
  }
}

let totalChecked = 0
const violations = []

for await (const file of walk(ROOT)) {
  const text = await readFile(file, 'utf8')
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    ICON_RE.lastIndex = 0
    let m
    while ((m = ICON_RE.exec(line)) !== null) {
      totalChecked += 1
      const value = m[1]
      if (!value.includes(':')) {
        violations.push({
          file: relative(process.cwd(), file).split(sep).join('/'),
          line: i + 1,
          value
        })
      }
    }
  }
}

if (violations.length > 0) {
  console.error(`\u2716 Found ${violations.length} short-name icon(s) in ${totalChecked} total:\n`)
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  name="${v.value}"`)
  }
  console.error(`\nExpected format: <Icon name="collection:icon" /> (e.g. "heroicons:home", "mdi:github")`)
  process.exit(1)
}

console.log(`\u2713 no short-name icons found (${totalChecked} icon reference(s) checked)`)
process.exit(0)
