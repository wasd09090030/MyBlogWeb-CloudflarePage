import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const args = process.argv.slice(2)
const getArg = (name, fallback) => {
  const index = args.indexOf(name)
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback
}

const inputPath = resolve(getArg('--input', './.data/d1-import.sql'))
const database = getArg('--database', 'blog-db')
const config = resolve(getArg('--config', './wrangler.toml'))
const chunkSize = Number(getArg('--chunk-size', '400000'))
const maxStatementBytes = Number(getArg('--max-statement-bytes', '90000'))
const remote = args.includes('--remote')
const outputDir = resolve(getArg('--chunks', './.data/d1-import-chunks'))

if (!Number.isFinite(chunkSize) || chunkSize < 1000) throw new Error('--chunk-size must be at least 1000')
if (!Number.isFinite(maxStatementBytes) || maxStatementBytes < 1000 || maxStatementBytes > 100000) {
  throw new Error('--max-statement-bytes must be between 1000 and 100000')
}

function byteLength(value) {
  return Buffer.byteLength(value, 'utf8')
}

function splitStatements(source) {
  const statements = []
  let start = 0
  let quote = null
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (quote) {
      if (char === quote && source[index + 1] === quote) {
        index += 1
      } else if (char === quote) {
        quote = null
      }
      continue
    }
    if (char === "'" || char === '"') {
      quote = char
      continue
    }
    if (char === ';') {
      const statement = source.slice(start, index + 1).trim()
      if (statement && !/^BEGIN\s+TRANSACTION;?$/i.test(statement) && !/^COMMIT;?$/i.test(statement)) statements.push(statement)
      start = index + 1
    }
  }
  const tail = source.slice(start).trim()
  if (tail) statements.push(tail)
  return statements
}

const statements = splitStatements(readFileSync(inputPath, 'utf8'))
if (!statements.length) throw new Error(`No SQL statements found in ${inputPath}`)
rmSync(outputDir, { recursive: true, force: true })
mkdirSync(outputDir, { recursive: true })

const chunks = []
let current = []
let currentSize = 0
for (const statement of statements) {
  const statementBytes = byteLength(statement)
  if (statementBytes > maxStatementBytes) {
    throw new Error(`SQL statement exceeds ${maxStatementBytes} bytes: ${statementBytes}`)
  }
  const nextSize = currentSize + statementBytes + 1
  if (current.length && nextSize > chunkSize) {
    chunks.push(current)
    current = []
    currentSize = 0
  }
  current.push(statement)
  currentSize += statement.length + 1
}
if (current.length) chunks.push(current)

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
for (let index = 0; index < chunks.length; index += 1) {
  const chunkPath = resolve(outputDir, `chunk-${String(index + 1).padStart(4, '0')}.sql`)
  writeFileSync(chunkPath, `${chunks[index].join('\n')}\n`, 'utf8')
  const commandArgs = ['wrangler', 'd1', 'execute', database, remote ? '--remote' : '--local', `--file=${chunkPath}`, '--config', config]
  execFileSync(npx, commandArgs, { stdio: 'inherit', shell: process.platform === 'win32' })
}

console.log(JSON.stringify({ inputPath, database, remote, statements: statements.length, chunks: chunks.length, maxStatementBytes, outputDir }, null, 2))
