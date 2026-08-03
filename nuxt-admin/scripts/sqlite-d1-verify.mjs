import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const getArg = (name, fallback) => {
  const index = args.indexOf(name)
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback
}

const manifestPath = getArg('--manifest', './.data/d1-import-manifest.json')
const actualPath = getArg('--actual', '')
const sqlitePath = getArg('--sqlite', '')
if (!actualPath && !sqlitePath) {
  throw new Error('Usage: node scripts/sqlite-d1-verify.mjs --manifest <manifest.json> --actual <d1-export.json> | --sqlite <database.sqlite>')
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const tablePrimaryKeys = { image_assets: 'id', articles: 'id', comments: 'id', likes: 'id', galleries: 'id', imagebed_configs: 'id' }
const actual = actualPath
  ? JSON.parse(readFileSync(actualPath, 'utf8'))
  : { tables: Object.fromEntries(Object.entries(tablePrimaryKeys).map(([table, key]) => {
    const output = execFileSync(process.env.SQLITE3_BIN || 'sqlite3', ['-json', sqlitePath, `SELECT * FROM "${table}" ORDER BY "${key}"`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    return [table, output.trim() ? JSON.parse(output) : []]
  })) }
const actualTables = actual.tables || actual
const failures = []

if (sqlitePath) {
  const retired = execFileSync(process.env.SQLITE3_BIN || 'sqlite3', ['-json', sqlitePath, "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('cf_image_configs', 'beatmap_sets', 'beatmap_difficulties')"], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (retired.trim()) {
    const rows = JSON.parse(retired)
    if (rows.length) failures.push(`retired tables still exist: ${rows.map(row => row.name).join(', ')}`)
  }
  const foreignKeys = execFileSync(process.env.SQLITE3_BIN || 'sqlite3', ['-json', sqlitePath, 'PRAGMA foreign_keys = ON; PRAGMA foreign_key_check;'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (foreignKeys.trim()) failures.push('foreign_key_check returned rows')
}

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
  const projected = Array.isArray(expected.columns)
    ? rows.map(row => Object.fromEntries(expected.columns.map(column => [column, row[column] ?? null])))
    : rows
  const normalized = canonicalRows(projected)
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
