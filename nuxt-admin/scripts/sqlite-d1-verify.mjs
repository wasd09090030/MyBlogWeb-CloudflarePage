import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const getArg = (name, fallback) => {
  const index = args.indexOf(name)
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback
}

const manifestPath = getArg('--manifest', './.data/d1-import-manifest.json')
const actualPath = getArg('--actual', '')
if (!actualPath) {
  throw new Error('Usage: node scripts/sqlite-d1-verify.mjs --manifest <manifest.json> --actual <d1-export.json>')
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const actual = JSON.parse(readFileSync(actualPath, 'utf8'))
const actualTables = actual.tables || actual
const failures = []

function canonicalRows(rows) {
  return rows.map(row => {
    const ordered = {}
    for (const key of Object.keys(row).sort()) ordered[key] = row[key]
    return ordered
  })
}

for (const [tableName, expected] of Object.entries(manifest.tables || {})) {
  if (expected.skipped) continue
  const rows = Array.isArray(actualTables[tableName])
    ? actualTables[tableName]
    : actualTables[tableName]?.rows
  if (!Array.isArray(rows)) {
    failures.push(`${tableName}: actual rows are missing`)
    continue
  }
  const normalized = canonicalRows(rows)
  const digest = createHash('sha256').update(JSON.stringify(normalized)).digest('hex')
  if (rows.length !== expected.exportedRows) failures.push(`${tableName}: expected ${expected.exportedRows} rows, received ${rows.length}`)
  if (digest !== expected.checksum) failures.push(`${tableName}: checksum mismatch (expected ${expected.checksum}, received ${digest})`)
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2))
  process.exitCode = 1
} else {
  console.log(JSON.stringify({ ok: true, tables: Object.keys(manifest.tables || {}).length }, null, 2))
}
