import type { H3Event } from 'h3'
import { badRequest, getDb, nowIso, parseJsonArray, queryAll, queryFirst, notFound } from '~~/server/utils/d1'

/**
 * 每日日记领域。
 * 一天一条（entry_date 主键），公开页「碎碎念」形态：无 emoji、全文直出、按年/月筛选。
 */

export const DIARY_MOODS = ['happy', 'excited', 'calm', 'busy', 'tired', 'cozy', 'pensive'] as const
export const DIARY_WEATHERS = ['sunny', 'cloudy', 'overcast', 'rain', 'thunder', 'haze'] as const

export type DiaryMood = (typeof DIARY_MOODS)[number]
export type DiaryWeather = (typeof DIARY_WEATHERS)[number]

type DiaryRow = {
  entry_date: string
  content_markdown: string
  mood: string
  weather: string
  location: string | null
  tags: string | null
  is_public: number
  created_at: string
  updated_at: string
}

export type DiaryEntryInput = {
  contentMarkdown?: unknown
  mood?: unknown
  weather?: unknown
  location?: unknown
  tags?: unknown
  isPublic?: unknown
}

/** 校验 'YYYY-MM-DD' 且为真实日期 */
export function isValidEntryDate(value: unknown): value is string {
  if (typeof value !== 'string') return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

function normalizeMood(value: unknown): string {
  const mood = String(value || 'calm').trim()
  return (DIARY_MOODS as readonly string[]).includes(mood) ? mood : 'calm'
}

function normalizeWeather(value: unknown): string {
  const weather = String(value || 'sunny').trim()
  return (DIARY_WEATHERS as readonly string[]).includes(weather) ? weather : 'sunny'
}

function normalizeTags(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify(value.map(String).filter(Boolean).slice(0, 10))
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return JSON.stringify(parsed.map(String).filter(Boolean).slice(0, 10))
    } catch {
      // fallthrough: 逗号分隔字符串
    }
    return JSON.stringify(value.split(/[,，]/).map(s => s.trim()).filter(Boolean).slice(0, 10))
  }
  return '[]'
}

function mapDiary(row: DiaryRow) {
  return {
    entryDate: row.entry_date,
    contentMarkdown: row.content_markdown,
    mood: row.mood,
    weather: row.weather,
    location: row.location,
    tags: parseJsonArray(row.tags),
    isPublic: row.is_public === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

const diarySelect = `
  SELECT entry_date, content_markdown, mood, weather, location, tags, is_public, created_at, updated_at
  FROM diary_entries
`

async function getDiaryRow(event: H3Event, date: string): Promise<DiaryRow | null> {
  return await queryFirst<DiaryRow>(getDb(event), `${diarySelect} WHERE entry_date = ? LIMIT 1`, date)
}

/** 管理端：全部日记（含草稿），按日期倒序 */
export async function listAdminDiaryEntries(event: H3Event) {
  const rows = await queryAll<DiaryRow>(getDb(event), `${diarySelect} ORDER BY entry_date DESC`)
  return rows.map(mapDiary)
}

export async function getAdminDiaryEntry(event: H3Event, dateValue: unknown) {
  if (!isValidEntryDate(dateValue)) badRequest('Invalid diary date, expected YYYY-MM-DD')
  const row = await getDiaryRow(event, dateValue)
  if (!row) notFound('Diary entry not found')
  return mapDiary(row!)
}

/**
 * 公开端：is_public = 1，按日期倒序，支持 ?year=2026&month=7 时间筛选。
 */
export async function listPublicDiaryEntries(event: H3Event, query: Record<string, unknown>) {
  const where: string[] = ['is_public = 1']
  const values: Array<string | number> = []

  const year = Number(query.year)
  const month = Number(query.month)
  if (Number.isFinite(year) && year >= 2000 && year <= 2100) {
    if (Number.isFinite(month) && month >= 1 && month <= 12) {
      // 按年月精确过滤
      where.push('entry_date >= ?')
      where.push('entry_date <= ?')
      values.push(`${year}-${String(month).padStart(2, '0')}-01`)
      const endMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`
      values.push(endMonth)
    } else {
      where.push('entry_date >= ?')
      where.push('entry_date <= ?')
      values.push(`${year}-01-01`, `${year}-12-31`)
    }
  }

  const rows = await queryAll<DiaryRow>(
    getDb(event),
    `${diarySelect} WHERE ${where.join(' AND ')} ORDER BY entry_date DESC`,
    ...values
  )
  return rows.map(mapDiary)
}

/** 新建或覆盖某一天的日记（upsert，一天一条） */
export async function upsertDiaryEntry(event: H3Event, dateValue: unknown, input: DiaryEntryInput) {
  if (!isValidEntryDate(dateValue)) badRequest('Invalid diary date, expected YYYY-MM-DD')
  const content = String(input.contentMarkdown || '').trim()
  if (!content) badRequest('Diary content is required')

  const now = nowIso()
  const db = getDb(event)
  await db.prepare(`
    INSERT INTO diary_entries (entry_date, content_markdown, mood, weather, location, tags, is_public, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(entry_date) DO UPDATE SET
      content_markdown = excluded.content_markdown,
      mood = excluded.mood,
      weather = excluded.weather,
      location = excluded.location,
      tags = excluded.tags,
      is_public = excluded.is_public,
      updated_at = excluded.updated_at
  `).bind(
    dateValue,
    content,
    normalizeMood(input.mood),
    normalizeWeather(input.weather),
    input.location === null || input.location === undefined || String(input.location).trim() === '' ? null : String(input.location).trim(),
    normalizeTags(input.tags),
    input.isPublic === false || input.isPublic === 0 || input.isPublic === '0' ? 0 : 1,
    now,
    now
  ).run()

  return await getAdminDiaryEntry(event, dateValue)
}

export async function deleteDiaryEntry(event: H3Event, dateValue: unknown) {
  if (!isValidEntryDate(dateValue)) badRequest('Invalid diary date, expected YYYY-MM-DD')
  const result = await getDb(event).prepare('DELETE FROM diary_entries WHERE entry_date = ?').bind(dateValue).run()
  if (!result.meta?.changes) notFound('Diary entry not found')
  return null
}
