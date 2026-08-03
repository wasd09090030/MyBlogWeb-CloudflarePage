import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const args = process.argv.slice(2)
const getArg = (name, fallback) => {
  const index = args.indexOf(name)
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback
}

const databasePath = resolve(getArg('--db', '../backend-dotnet/BlogApi/blog.sqlite'))
const outputPath = resolve(getArg('--output', './.data/d1-import.sql'))
const manifestPath = resolve(getArg('--manifest', './.data/d1-import-manifest.json'))
const sqliteCommand = process.env.SQLITE3_BIN || 'sqlite3'
const maxStatementBytes = Number(getArg('--max-statement-bytes', '90000'))

if (!Number.isFinite(maxStatementBytes) || maxStatementBytes < 1000 || maxStatementBytes > 100000) {
  throw new Error('--max-statement-bytes must be between 1000 and 100000')
}

const tableDefinitions = [
  {
    source: 'image_assets',
    target: 'image_assets',
    primaryKey: 'Id',
    columns: ['Id', 'publicId', 'storageKey', 'sourceUrl', 'contentType', 'version', 'kind', 'isActive', 'createdAt', 'updatedAt'],
    mapped: ['id', 'public_id', 'storage_key', 'source_url', 'content_type', 'version', 'kind', 'is_active', 'created_at', 'updated_at']
  },
  {
    source: 'articles',
    target: 'articles',
    primaryKey: 'id',
    columns: ['id', 'title', 'slug', 'content', 'contentMarkdown', 'coverImage', 'coverImageAssetId', 'category', 'tags', 'aiSummary', 'createdAt', 'updatedAt'],
    mapped: ['id', 'title', 'slug', 'content', 'content_markdown', 'cover_image', 'cover_image_asset_id', 'category', 'tags', 'ai_summary', 'created_at', 'updated_at']
  },
  {
    source: 'comment',
    target: 'comments',
    primaryKey: 'id',
    columns: ['id', 'content', 'author', 'email', 'website', 'articleId', 'parentId', 'likes', 'status', 'userIp', 'createdAt', 'updatedAt'],
    mapped: ['id', 'content', 'author', 'email', 'website', 'article_id', 'parent_id', 'likes', 'status', 'user_ip', 'created_at', 'updated_at']
  },
  {
    source: 'like',
    target: 'likes',
    primaryKey: 'id',
    columns: ['id', 'articleId', 'userIdentifier', 'type', 'targetId', 'createdAt'],
    mapped: ['id', 'article_id', 'user_identifier', 'type', 'target_id', 'created_at']
  },
  {
    source: 'galleries',
    target: 'galleries',
    primaryKey: 'id',
    columns: ['id', 'imageUrl', 'ImageWidth', 'ImageHeight', 'sortOrder', 'isActive', 'tag', 'createdAt', 'updatedAt'],
    mapped: ['id', 'image_url', 'image_width', 'image_height', 'sort_order', 'is_active', 'tag', 'created_at', 'updated_at']
  },
  {
    source: 'imagebed_configs',
    target: 'imagebed_configs',
    primaryKey: 'Id',
    columns: ['Id', 'Domain', 'UploadFolder', 'CreatedAt', 'UpdatedAt'],
    mapped: ['id', 'domain', 'upload_folder', 'created_at', 'updated_at']
  },
]

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`
}

function queryJson(sql) {
  const output = execFileSync(sqliteCommand, ['-json', databasePath, sql], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  })
  return output.trim() ? JSON.parse(output) : []
}

function tableExists(table) {
  return queryJson(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND lower(name) = lower(${sqlLiteral(table)})`
  ).length > 0
}

function requiredText(value, field, table, rowId) {
  if (value === null || value === undefined || String(value).trim() === '') {
    throw new Error(`Missing required value ${table}.${field} for row ${rowId}`)
  }
  return String(value)
}

function booleanValue(value) {
  return value === true || value === 1 || value === '1' ? 1 : 0
}

function normalizeRow(definition, sourceRow) {
  const rowId = sourceRow[definition.primaryKey]
  const result = {}
  for (let index = 0; index < definition.columns.length; index += 1) {
    const sourceColumn = definition.columns[index]
    const targetColumn = definition.mapped[index]
    let value = sourceRow[sourceColumn]

    if (['created_at', 'updated_at'].includes(targetColumn)) {
      value = requiredText(value, sourceColumn, definition.source, rowId)
    }
    if (targetColumn === 'title' || targetColumn === 'content' || targetColumn === 'slug' || targetColumn === 'author' || targetColumn === 'domain') {
      value = requiredText(value, sourceColumn, definition.source, rowId)
    }
    if (targetColumn === 'category') value = String(value || 'other').toLowerCase()
    if (targetColumn === 'tags') value = value === null || value === undefined || value === '' ? '[]' : String(value)
    if (['is_active', 'is_enabled', 'use_https', 'use_worker'].includes(targetColumn)) value = booleanValue(value)
    result[targetColumn] = value
  }
  return result
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'boolean') return value ? '1' : '0'
  return `'${String(value).replaceAll("'", "''")}'`
}

function byteLength(value) {
  return Buffer.byteLength(value, 'utf8')
}

function splitSqlText(value, maxBytes) {
  const chunks = []
  let current = ''
  let currentBytes = 0
  for (const character of String(value)) {
    const escaped = character === "'" ? "''" : character
    const characterBytes = byteLength(escaped)
    if (current && currentBytes + characterBytes > maxBytes) {
      chunks.push(current)
      current = ''
      currentBytes = 0
    }
    current += character
    currentBytes += characterBytes
  }
  if (current || !chunks.length) chunks.push(current)
  return chunks
}

function checksum(rows) {
  const canonical = rows.map(row => {
    const ordered = {}
    for (const key of Object.keys(row).sort()) ordered[key] = row[key]
    return ordered
  })
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex')
}

function buildUpsertSql(definition, row) {
  const columns = definition.mapped
  const values = columns.map(column => sqlLiteral(row[column]))
  const updates = columns
    .filter(column => column !== definition.mapped[0])
    .map(column => `${quoteIdentifier(column)} = excluded.${quoteIdentifier(column)}`)
  return `INSERT INTO ${quoteIdentifier(definition.target)} (${columns.map(quoteIdentifier).join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT(${quoteIdentifier(definition.mapped[0])}) DO UPDATE SET ${updates.join(', ')};`
}

function rowStatements(definition, row) {
  const primaryKey = definition.mapped[0]
  const baseRow = { ...row }
  const deferredColumns = []
  const candidates = definition.mapped
    .filter(column => column !== primaryKey && typeof row[column] === 'string' && row[column] !== '')
    .sort((left, right) => byteLength(sqlLiteral(row[right])) - byteLength(sqlLiteral(row[left])))

  while (byteLength(buildUpsertSql(definition, baseRow)) > maxStatementBytes) {
    const column = candidates.find(candidate => !deferredColumns.includes(candidate))
    if (!column) {
      throw new Error(`Unable to fit ${definition.target}.${primaryKey} into a ${maxStatementBytes}-byte SQL statement`)
    }
    deferredColumns.push(column)
    baseRow[column] = ''
  }

  const statements = [buildUpsertSql(definition, baseRow)]
  const chunkBytes = Math.max(1000, maxStatementBytes - 2048)
  for (const column of deferredColumns) {
    for (const chunk of splitSqlText(row[column], chunkBytes)) {
      const statement = `UPDATE ${quoteIdentifier(definition.target)} SET ${quoteIdentifier(column)} = COALESCE(${quoteIdentifier(column)}, '') || ${sqlLiteral(chunk)} WHERE ${quoteIdentifier(primaryKey)} = ${sqlLiteral(row[primaryKey])};`
      if (byteLength(statement) > maxStatementBytes) {
        throw new Error(`Generated SQL statement exceeds ${maxStatementBytes} bytes for ${definition.target}.${primaryKey}`)
      }
      statements.push(statement)
    }
  }
  return statements
}

const lines = [
  'BEGIN TRANSACTION;'
]
const manifest = {
  source: databasePath,
  generatedAt: new Date().toISOString(),
  tables: {},
  totals: { sourceRows: 0, exportedRows: 0, skippedRows: 0 }
}
const articleIds = new Set(queryJson('SELECT id FROM articles').map(row => Number(row.id)))
const imageAssetIds = new Set(queryJson('SELECT Id FROM image_assets').map(row => Number(row.Id)))
for (const definition of tableDefinitions) {
  if (!tableExists(definition.source)) {
    manifest.tables[definition.target] = { sourceTable: definition.source, skipped: true, sourceRows: 0, exportedRows: 0, skippedRows: 0, checksum: null }
    continue
  }

  const sourceRows = queryJson(
    `SELECT ${definition.columns.map(quoteIdentifier).join(', ')} FROM ${quoteIdentifier(definition.source)} ORDER BY ${quoteIdentifier(definition.primaryKey)}`
  )
  const rows = []
  let skippedRows = 0
  for (const sourceRow of sourceRows) {
    const row = normalizeRow(definition, sourceRow)
    if (definition.target === 'likes' && !articleIds.has(Number(row.article_id))) {
      skippedRows += 1
      continue
    }
    if (definition.target === 'comments' && !articleIds.has(Number(row.article_id))) {
      throw new Error(`Invalid comments.article_id ${row.article_id} for row ${row.id}`)
    }
    if (definition.target === 'articles' && row.cover_image_asset_id !== null && !imageAssetIds.has(Number(row.cover_image_asset_id))) {
      throw new Error(`Invalid articles.cover_image_asset_id ${row.cover_image_asset_id} for row ${row.id}`)
    }
    rows.push(row)
  }
  const tableManifest = {
    sourceTable: definition.source,
    targetTable: definition.target,
    columns: definition.mapped,
    sourceRows: sourceRows.length,
    exportedRows: rows.length,
    skippedRows,
    checksum: checksum(rows)
  }
  manifest.tables[definition.target] = tableManifest
  manifest.totals.sourceRows += tableManifest.sourceRows
  manifest.totals.exportedRows += tableManifest.exportedRows
  manifest.totals.skippedRows += tableManifest.skippedRows
  for (const row of rows) lines.push(...rowStatements(definition, row))
}

lines.push('COMMIT;')
mkdirSync(dirname(outputPath), { recursive: true })
mkdirSync(dirname(manifestPath), { recursive: true })
writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8')
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ outputPath, manifestPath, maxStatementBytes, totals: manifest.totals, tables: manifest.tables }, null, 2))
