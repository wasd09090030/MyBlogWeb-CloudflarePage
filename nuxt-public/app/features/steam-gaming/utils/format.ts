export function formatHours(minutes: number | null | undefined): string {
  const value = Math.max(0, Number(minutes) || 0)
  const hours = value / 60
  if (hours >= 1000) return Math.round(hours).toLocaleString('en-US')
  return hours >= 100 ? String(Math.round(hours)) : hours.toFixed(1)
}

export function formatNumber(value: number | null | undefined): string {
  return (Number(value) || 0).toLocaleString('en-US')
}

export function relativeTime(value: string | null | undefined): string {
  if (!value) return '未知'
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return '未知'
  const diff = Date.now() - timestamp
  if (diff < 60_000) return '刚刚'
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

export function achievementsPercent(unlocked: number | null, total: number | null): number {
  if (!total || total <= 0) return 0
  return Math.min(100, Math.round(((unlocked || 0) / total) * 100))
}
