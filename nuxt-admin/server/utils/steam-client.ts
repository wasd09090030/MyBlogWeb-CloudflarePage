/**
 * Thin Steam Web API client.
 *
 * Only the endpoints the gaming page needs are wrapped, the key travels in the
 * `x-webapi-key` header (never in a URL), and every call is counted against a
 * per-run budget so a single invocation stays inside the Worker subrequest limit.
 */

const API_HOST = 'https://api.steampowered.com'
const STORE_HOST = 'https://store.steampowered.com'
const REQUEST_TIMEOUT_MS = 12_000

export class SteamApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'SteamApiError'
    this.status = status
    this.code = code
  }
}

export type SteamOwnedGame = {
  appid: number
  name?: string
  playtime_forever?: number
  playtime_2weeks?: number
  playtime_windows_forever?: number
  playtime_mac_forever?: number
  playtime_linux_forever?: number
  playtime_deck_forever?: number
  rtime_last_played?: number
  img_icon_url?: string
  has_community_visible_stats?: boolean
}

export type SteamPlayerSummary = {
  steamid: string
  personaname: string
  avatar?: string
  avatarmedium?: string
  avatarfull?: string
  profileurl?: string
  personastate?: number
  communityvisibilitystate?: number
  lastlogoff?: number
  timecreated?: number
  gameid?: string
  gameextrainfo?: string
}

export type SteamPlayerAchievement = {
  apiname: string
  achieved: number
  unlocktime: number
  name?: string
  description?: string
}

export type SteamSchemaAchievement = {
  name: string
  defaultvalue: number
  displayName?: string
  hidden: number
  description?: string
  icon?: string
  icongray?: string
}

export type SteamWishlistItem = {
  appid: number
  priority?: number
  date_added?: number
}

export type SteamAppDetails = {
  name?: string
  header_image?: string
  is_free?: boolean
  release_date?: { date?: string }
  genres?: Array<{ description?: string }>
  short_description?: string
}

type Json = Record<string, unknown>

export type SteamClientOptions = {
  apiKey: string
  /** Hard cap on upstream requests for this run. */
  budget?: number
  /** Requests already spent before this client was created. */
  used?: number
}

export class SteamClient {
  private used: number
  private readonly budget: number
  private readonly apiKey: string

  constructor(options: SteamClientOptions) {
    this.apiKey = options.apiKey
    this.budget = options.budget ?? 40
    this.used = options.used ?? 0
  }

  get calls(): number {
    return this.used
  }

  get remaining(): number {
    return Math.max(0, this.budget - this.used)
  }

  canSpend(count = 1): boolean {
    return this.remaining >= count
  }

  private async request(url: string, init?: RequestInit): Promise<Response> {
    if (!this.canSpend()) {
      throw new SteamApiError(429, 'budget_exhausted', 'Steam request budget exhausted for this run')
    }
    this.used += 1
    const signal = typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(REQUEST_TIMEOUT_MS) : undefined
    let response: Response
    try {
      response = await fetch(url, {
        ...init,
        signal,
        headers: {
          'accept': 'application/json',
          ...(init?.headers || {})
        }
      })
    } catch {
      throw new SteamApiError(504, 'timeout', 'Steam request timed out')
    }
    if (response.status === 429) {
      throw new SteamApiError(429, 'rate_limited', 'Steam rate limited the request')
    }
    if (response.status >= 500) {
      throw new SteamApiError(response.status, 'upstream_error', `Steam returned ${response.status}`)
    }
    if (response.status === 401 || response.status === 403) {
      throw new SteamApiError(response.status, 'forbidden', 'Steam rejected the API key')
    }
    return response
  }

  private async getJson(path: string, params: Record<string, string | number | undefined>): Promise<Json> {
    const url = new URL(API_HOST + path)
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === '') continue
      url.searchParams.set(key, String(value))
    }
    const response = await this.request(url.toString(), {
      headers: { 'x-webapi-key': this.apiKey }
    })
    if (!response.ok) {
      throw new SteamApiError(response.status, 'bad_request', `Steam returned ${response.status}`)
    }
    return await response.json() as Json
  }

  /**
   * GetOwnedGames returns `{"response":{}}` when the profile hides game details.
   * Callers must treat that as "unknown", never as an empty library.
   */
  async getOwnedGames(steamid: string): Promise<SteamOwnedGame[] | null> {
    const payload = await this.getJson('/IPlayerService/GetOwnedGames/v1/', {
      steamid,
      include_appinfo: 1,
      include_played_free_games: 1
    })
    const response = payload.response as Json | undefined
    if (!response || !Array.isArray(response.games)) return null
    return response.games as SteamOwnedGame[]
  }

  async getRecentlyPlayedGames(steamid: string): Promise<SteamOwnedGame[] | null> {
    const payload = await this.getJson('/IPlayerService/GetRecentlyPlayedGames/v1/', { steamid })
    const response = payload.response as Json | undefined
    if (!response || !Array.isArray(response.games)) return null
    return response.games as SteamOwnedGame[]
  }

  async getPlayerSummaries(steamid: string): Promise<SteamPlayerSummary | null> {
    const payload = await this.getJson('/ISteamUser/GetPlayerSummaries/v2/', { steamids: steamid })
    const response = payload.response as { players?: SteamPlayerSummary[] } | undefined
    return response?.players?.[0] ?? null
  }

  async getSteamLevel(steamid: string): Promise<number | null> {
    const payload = await this.getJson('/IPlayerService/GetSteamLevel/v1/', { steamid })
    const response = payload.response as { player_level?: number } | undefined
    return typeof response?.player_level === 'number' ? response.player_level : null
  }

  async getPlayerAchievements(steamid: string, appid: number): Promise<SteamPlayerAchievement[] | null> {
    try {
      const payload = await this.getJson('/ISteamUserStats/GetPlayerAchievements/v1/', { steamid, appid, l: 'schinese' })
      const stats = payload.playerstats as { achievements?: SteamPlayerAchievement[] } | undefined
      return Array.isArray(stats?.achievements) ? stats!.achievements : null
    } catch (error) {
      // Games without stats return 400/403; that is a per-game miss, not a run failure.
      if (error instanceof SteamApiError) return null
      throw error
    }
  }

  async getSchemaForGame(appid: number): Promise<SteamSchemaAchievement[] | null> {
    try {
      const payload = await this.getJson('/ISteamUserStats/GetSchemaForGame/v2/', { appid, l: 'schinese' })
      const game = payload.game as { availableGameStats?: { achievements?: SteamSchemaAchievement[] } } | undefined
      const achievements = game?.availableGameStats?.achievements
      return Array.isArray(achievements) ? achievements : null
    } catch (error) {
      if (error instanceof SteamApiError) return null
      throw error
    }
  }

  /** Global unlock percentages need no key but still consume a subrequest. */
  async getGlobalAchievementPercentages(appid: number): Promise<Map<string, number> | null> {
    try {
      const payload = await this.getJson('/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/', { gameid: appid })
      const list = (payload.achievementpercentages as { achievements?: Array<{ name: string, percent: string | number }> } | undefined)?.achievements
      if (!Array.isArray(list)) return null
      const map = new Map<string, number>()
      for (const item of list) {
        const percent = Number(item.percent)
        if (Number.isFinite(percent)) map.set(item.name, percent)
      }
      return map
    } catch (error) {
      if (error instanceof SteamApiError) return null
      throw error
    }
  }

  async getWishlist(steamid: string): Promise<SteamWishlistItem[]> {
    try {
      const payload = await this.getJson('/IWishlistService/GetWishlist/v1/', { steamid })
      const items = (payload.response as { items?: SteamWishlistItem[] } | undefined)?.items
      return Array.isArray(items) ? items : []
    } catch (error) {
      if (error instanceof SteamApiError) return []
      throw error
    }
  }

  /**
   * Store metadata is an unofficial endpoint and optional: failures degrade the
   * cover image only, so a non-200 becomes `null` instead of failing the run.
   */
  async getAppDetails(appid: number): Promise<SteamAppDetails | null> {
    if (!this.canSpend()) return null
    this.used += 1
    const url = new URL(`${STORE_HOST}/api/appdetails`)
    url.searchParams.set('appids', String(appid))
    url.searchParams.set('l', 'schinese')
    url.searchParams.set('cc', 'cn')
    const signal = typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(REQUEST_TIMEOUT_MS) : undefined
    try {
      const response = await fetch(url.toString(), { signal, headers: { accept: 'application/json' } })
      if (!response.ok) return null
      const payload = await response.json() as Record<string, { success?: boolean, data?: SteamAppDetails }>
      const entry = payload[String(appid)]
      return entry?.success ? entry.data ?? null : null
    } catch {
      return null
    }
  }
}

export function createSteamClient(options: SteamClientOptions): SteamClient {
  return new SteamClient(options)
}
