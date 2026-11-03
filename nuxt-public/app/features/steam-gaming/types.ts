export type SteamGame = {
  appid: number
  name: string
  headerUrl: string | null
  minutesTotal: number
  minutes2Weeks: number
  lastPlayedAt: string | null
  achievementsUnlocked: number | null
  achievementsTotal: number | null
}

export type SteamRankedGame = SteamGame & { share: number }

/** 我为某款游戏打的分（0.5 步进，1~10）与一句短评。 */
export type SteamRating = {
  score: number
  comment: string | null
}

export type SteamRatedGame = SteamGame & SteamRating

/** 「最爱游戏」附带它的评分，没有评过分时 rating 为 null。 */
export type SteamFavoriteGame = SteamGame & { rating: SteamRating | null }

export type SteamRatingBucket = {
  key: string
  label: string
  count: number
}

/** 评分展柜：items 受 limit 限制，分布与平均分覆盖全部已评游戏。 */
export type SteamRatingData = {
  items: SteamRatedGame[]
  total: number
  average: number
  best: { name: string; score: number } | null
  distribution: SteamRatingBucket[]
  /** 分布里最大的计数，前端按它算条形宽度，避免再算一遍。 */
  peakCount: number
}

export type SteamAchievement = {
  appid: number
  game: string
  apiName: string
  displayName: string
  description: string | null
  percent: number | null
  unlockedAt: string | null
  iconUrl: string | null
}

export type SteamWishlistItem = {
  appid: number
  name: string
  headerUrl: string | null
  addedAt: string
  daysWaiting: number
}

export type SteamCollectorData = {
  gameCount: number
  totalMinutes: number
  averageMinutes: number
  perfectCount: number
  recent: SteamGame[]
}

export type SteamProfile = {
  personaName: string
  avatarUrl: string | null
  profileUrl: string | null
  level: number | null
  gameCount: number
  totalMinutes: number
  minutes2Weeks: number
  achievementsUnlocked: number
  achievementsTotal: number
}

export type SteamShowcaseType =
  | 'favorite'
  | 'rating'
  | 'recent'
  | 'collector'
  | 'top-playtime'
  | 'completionist'
  | 'rarest-achievement'
  | 'wishlist'

/** 展柜配置：limit 是首页预览条数，more 控制「更多…」入口。 */
export type SteamShowcaseConfig = {
  limit?: number
  sort?: 'total' | 'recent'
  appid?: number
  more?: boolean
}

export type SteamShowcase = {
  type: SteamShowcaseType
  label: string
  span: number
  config: SteamShowcaseConfig
  empty: boolean
  /** 该类数据的完整条目数，用来判断是否还有更多内容。 */
  total: number
  data: unknown
}

export type SteamOverviewStatus = 'ok' | 'stale' | 'privacy_blocked' | 'unconfigured' | 'empty' | 'error'

export type SteamOverview = {
  status: SteamOverviewStatus
  syncedAt: string | null
  stale: boolean
  profile: SteamProfile | null
  showcases: SteamShowcase[]
  freshnessWindowMinutes: number
}

/** 详情页 /games/playtime：完整榜单按 offset/limit 分页。 */
export type SteamPlaytimePage = {
  games: SteamRankedGame[]
  totalMinutes: number
  total: number
  offset: number
  limit: number
}

/** 详情页 /games/wishlist：完整愿望单按 offset/limit 分页。 */
export type SteamWishlistPage = {
  items: SteamWishlistItem[]
  total: number
  offset: number
  limit: number
}
