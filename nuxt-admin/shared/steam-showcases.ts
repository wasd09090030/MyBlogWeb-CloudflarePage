/**
 * Showcase layout shared by the admin editor and the public projection.
 *
 * The allowlist mirrors the subset of Steam's `EProfileCustomizationType` that the
 * Web API can actually feed. Custom text and screenshot showcases are intentionally
 * excluded: screenshots live in the gallery, free-form writing lives in articles.
 */

export const STEAM_SHOWCASE_LIMIT = 12

export type SteamShowcaseType =
  | 'favorite'
  | 'rating'
  | 'recent'
  | 'collector'
  | 'top-playtime'
  | 'completionist'
  | 'rarest-achievement'
  | 'wishlist'

export type SteamShowcaseConfig = {
  limit?: number
  sort?: 'total' | 'recent'
  appid?: number
  /** 首页是否显示「更多…」入口；只对有独立详情页的展柜生效。 */
  more?: boolean
}

export type SteamShowcaseDefinition = {
  type: SteamShowcaseType
  label: string
  /** Grid span on the 12-column page grid. */
  span: number
  description: string
  defaults: SteamShowcaseConfig
  /** Allowed numeric range for `config.limit`, omitted when the type has no list. */
  limitRange?: [number, number]
  sortOptions?: Array<'total' | 'recent'>
  /** 完整列表页路径；有值时首页只放预览，并允许开关「更多…」入口。 */
  detailPath?: string
}

export const STEAM_SHOWCASES: Record<SteamShowcaseType, SteamShowcaseDefinition> = {
  favorite: {
    type: 'favorite',
    label: '最爱游戏',
    span: 12,
    description: '指定一款游戏，以居中英雄区展示封面、时长、成就与我的评分。',
    defaults: {}
  },
  rating: {
    type: 'rating',
    label: '我的评分',
    span: 12,
    description: '我为游戏打的分（1~10，0.5 档）与一句短评；首页只放预览，完整列表在详情页。',
    defaults: { limit: 6, more: true },
    limitRange: [3, 12],
    detailPath: '/games/ratings'
  },
  collector: {
    type: 'collector',
    label: '游戏收藏家',
    span: 12,
    description: '库总数、总时长、平均时长与最近入库的封面墙。',
    defaults: {}
  },
  recent: {
    type: 'recent',
    label: '最近在玩',
    span: 12,
    description: '近 14 天有游玩的游戏，4 款铺满一行，更多时横向滚动。',
    defaults: { limit: 4 },
    limitRange: [1, 8]
  },
  'top-playtime': {
    type: 'top-playtime',
    label: '游玩时长',
    span: 7,
    description: '按时长排序的榜单，带竖版小海报；首页只放预览，完整榜单在详情页。',
    defaults: { limit: 6, sort: 'total', more: true },
    limitRange: [3, 10],
    sortOptions: ['total', 'recent'],
    detailPath: '/games/playtime'
  },
  completionist: {
    type: 'completionist',
    label: '完美通关',
    span: 5,
    description: '成就全部解锁的游戏。',
    defaults: { limit: 5 },
    limitRange: [1, 8]
  },
  'rarest-achievement': {
    type: 'rarest-achievement',
    label: '最稀有成就',
    span: 12,
    description: '按全球解锁率升序挑选的成就，第一张为大幅展示，带成就徽章。',
    defaults: { limit: 3 },
    limitRange: [1, 6]
  },
  wishlist: {
    type: 'wishlist',
    label: '愿望单',
    span: 12,
    description: '愿望单中最早加入的项目；首页只放预览，完整列表在详情页。',
    defaults: { limit: 8, more: true },
    limitRange: [1, 12],
    detailPath: '/games/wishlist'
  }
}

export const STEAM_SHOWCASE_TYPES = Object.keys(STEAM_SHOWCASES) as SteamShowcaseType[]

/**
 * 默认顺序即页面的视觉层级：英雄区 → 观点（评分）→ 进行时 → 档案卡。
 * 后台仍可自由拖拽，这里只决定首次部署 / 重置时的顺序。
 */
export const DEFAULT_STEAM_SHOWCASES: Array<{ type: SteamShowcaseType, config: SteamShowcaseConfig }> = [
  { type: 'favorite', config: {} },
  { type: 'rating', config: { limit: 6, more: true } },
  { type: 'recent', config: { limit: 4 } },
  { type: 'collector', config: {} },
  { type: 'top-playtime', config: { limit: 6, sort: 'total', more: true } },
  { type: 'completionist', config: { limit: 5 } },
  { type: 'rarest-achievement', config: { limit: 3 } },
  { type: 'wishlist', config: { limit: 8, more: true } }
]

export type SteamShowcaseRow = {
  id: number
  type: string
  position: number
  visible: number
  config: string
}

export type SteamShowcaseEntry = {
  type: SteamShowcaseType
  position: number
  visible: boolean
  config: SteamShowcaseConfig
}

export class SteamShowcaseError extends Error {
  field: string
  constructor(field: string, message: string) {
    super(message)
    this.name = 'SteamShowcaseError'
    this.field = field
  }
}

export function isSteamShowcaseType(value: unknown): value is SteamShowcaseType {
  return typeof value === 'string' && (STEAM_SHOWCASE_TYPES as string[]).includes(value)
}

export function parseShowcaseConfig(value: unknown): SteamShowcaseConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const raw = value as Record<string, unknown>
  const config: SteamShowcaseConfig = {}
  if (raw.limit !== undefined && raw.limit !== null && raw.limit !== '') {
    const limit = Number(raw.limit)
    if (Number.isFinite(limit)) config.limit = Math.trunc(limit)
  }
  if (raw.sort === 'total' || raw.sort === 'recent') config.sort = raw.sort
  if (typeof raw.more === 'boolean') config.more = raw.more
  if (raw.appid !== undefined && raw.appid !== null && raw.appid !== '') {
    const appid = Number(raw.appid)
    if (Number.isSafeInteger(appid) && appid > 0) config.appid = appid
  }
  return config
}

/**
 * Validates one entry against its type definition and returns the normalized config.
 * Throws SteamShowcaseError so route handlers can surface a field-level message.
 */
export function normalizeShowcaseConfig(type: SteamShowcaseType, value: unknown): SteamShowcaseConfig {
  const definition = STEAM_SHOWCASES[type]
  const config = parseShowcaseConfig(value)

  if (config.limit !== undefined) {
    const range = definition.limitRange
    if (!range) throw new SteamShowcaseError('config.limit', `${definition.label}不接受 limit 参数`)
    if (config.limit < range[0] || config.limit > range[1]) {
      throw new SteamShowcaseError('config.limit', `${definition.label}的数量需在 ${range[0]} 到 ${range[1]} 之间`)
    }
  }
  if (config.sort !== undefined) {
    if (!definition.sortOptions?.includes(config.sort)) {
      throw new SteamShowcaseError('config.sort', `${definition.label}不支持该排序方式`)
    }
  }
  if (config.appid !== undefined && type !== 'favorite') {
    throw new SteamShowcaseError('config.appid', '只有「最爱游戏」可以指定 appid')
  }
  if (config.more !== undefined && !definition.detailPath) {
    throw new SteamShowcaseError('config.more', `${definition.label}没有独立详情页，不支持「更多」入口`)
  }

  return { ...definition.defaults, ...config }
}

export type NormalizedShowcase = {
  type: SteamShowcaseType
  visible: boolean
  config: SteamShowcaseConfig
}

/** Validates the whole submitted list. Positions are derived from array order. */
export function normalizeShowcaseList(input: unknown): NormalizedShowcase[] {
  if (!Array.isArray(input)) throw new SteamShowcaseError('showcases', '展柜配置必须是数组')
  if (input.length > STEAM_SHOWCASE_LIMIT) {
    throw new SteamShowcaseError('showcases', `最多只能启用 ${STEAM_SHOWCASE_LIMIT} 个展柜`)
  }
  const seen = new Set<string>()
  return input.map((item, index) => {
    const raw = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
    const type = raw.type
    if (!isSteamShowcaseType(type)) {
      throw new SteamShowcaseError(`showcases[${index}].type`, `未知的展柜类型：${String(type)}`)
    }
    if (seen.has(type)) {
      throw new SteamShowcaseError(`showcases[${index}].type`, `展柜重复：${STEAM_SHOWCASES[type].label}`)
    }
    seen.add(type)
    return {
      type,
      visible: raw.visible === undefined ? true : Boolean(raw.visible),
      config: normalizeShowcaseConfig(type, raw.config)
    }
  })
}

export function defaultShowcaseEntries(): NormalizedShowcase[] {
  return DEFAULT_STEAM_SHOWCASES.map(entry => ({
    type: entry.type,
    visible: true,
    config: normalizeShowcaseConfig(entry.type, entry.config)
  }))
}
