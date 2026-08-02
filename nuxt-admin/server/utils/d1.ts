import type { H3Event } from 'h3'
import { getCloudflareDatabase } from './cloudflare'

export type D1Value = string | number | boolean | null

export type D1StatementInput = {
  sql: string
  values?: D1Value[]
}

export function getDb(event: H3Event): D1Database {
  return getCloudflareDatabase(event)
}

export async function queryAll<T>(db: D1Database, sql: string, ...values: D1Value[]): Promise<T[]> {
  const result = await db.prepare(sql).bind(...values).all<T>()
  return result.results || []
}

export async function queryFirst<T>(db: D1Database, sql: string, ...values: D1Value[]): Promise<T | null> {
  return await db.prepare(sql).bind(...values).first<T>()
}

export async function execute(db: D1Database, sql: string, ...values: D1Value[]) {
  return await db.prepare(sql).bind(...values).run()
}

export async function executeBatch(db: D1Database, statements: D1PreparedStatement[]) {
  return await db.batch(statements)
}

export async function batch(db: D1Database, statements: D1StatementInput[]) {
  return await db.batch(statements.map(statement => db.prepare(statement.sql).bind(...(statement.values || []))))
}

export function parsePositiveInt(value: unknown, fallback: number, max: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

export function parseNonNegativeInt(value: unknown, fallback: number, max: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return Math.min(parsed, max)
}

export function parsePagination(query: Record<string, unknown>, defaults: { page?: number; pageSize?: number; maxPageSize?: number } = {}) {
  const page = parsePositiveInt(query.page, defaults.page ?? 1, 100_000)
  const pageSize = parsePositiveInt(query.limit ?? query.pageSize, defaults.pageSize ?? 20, defaults.maxPageSize ?? 100)
  return { page, pageSize, offset: (page - 1) * pageSize }
}

export function asBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === '1'
}

export function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function asString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value)
}

export function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value !== 'string' || !value.trim()) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []
  } catch {
    return []
  }
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function optionalIso(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function requireId(value: unknown, name = 'id'): number {
  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${name}` })
  }
  return parsed
}

export function badRequest(message: string): never {
  throw createError({ statusCode: 400, statusMessage: message })
}

export function notFound(message = 'Not found'): never {
  throw createError({ statusCode: 404, statusMessage: message })
}
