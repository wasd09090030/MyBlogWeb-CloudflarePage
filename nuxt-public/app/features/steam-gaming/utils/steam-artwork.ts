/**
 * Steam 封面取图规范。
 *
 * Steam 的 CDN 对同一款游戏提供多档素材，尺寸差别很大：
 *   header.jpg            460×215   —— 列表卡片
 *   capsule_616x353.jpg   616×353   —— 商店横向胶囊（本轮主力）
 *   library_600x900.jpg   300×450   —— 库竖版海报（1x）
 *   library_600x900_2x.jpg 600×900  —— 库竖版海报（2x）
 *   library_hero.jpg      1920×620  —— 库头图（横向宽幅）
 *
 * 数据库里只落了 `header.jpg`，所以这里按 appid 反推更大的一档；素材缺失时由
 * `steamArtworkChain` 逐级降级，最终兜底到首字母块，绝不出现破图。
 */

export type SteamArtworkVariant = 'hero' | 'capsule' | 'poster' | 'poster2x' | 'header'

const FILENAME: Record<SteamArtworkVariant, string> = {
  hero: 'library_hero.jpg',
  capsule: 'capsule_616x353.jpg',
  poster: 'library_600x900.jpg',
  poster2x: 'library_600x900_2x.jpg',
  header: 'header.jpg'
}

const CDN_ROOT = 'https://cdn.cloudflare.steamstatic.com/steam/apps'

/** 每个档位对应的宽高比，供 `aspect-ratio` 使用（已按素材实际尺寸取值）。 */
export const ARTWORK_RATIO: Record<SteamArtworkVariant, string> = {
  hero: '1920 / 620',
  capsule: '616 / 353',
  poster: '2 / 3',
  poster2x: '2 / 3',
  header: '460 / 215'
}

/** 素材缺失时的降级顺序：先同比例大图，再通用 header。 */
const FALLBACK_CHAIN: Record<SteamArtworkVariant, SteamArtworkVariant[]> = {
  hero: ['hero', 'header'],
  capsule: ['capsule', 'header'],
  poster: ['poster', 'capsule', 'header'],
  poster2x: ['poster2x', 'poster', 'capsule', 'header'],
  header: ['header']
}

export function steamArtwork(appid: number | null | undefined, variant: SteamArtworkVariant): string | null {
  const id = Number(appid)
  if (!Number.isSafeInteger(id) || id <= 0) return null
  return `${CDN_ROOT}/${id}/${FILENAME[variant]}`
}

export function steamArtworkChain(appid: number | null | undefined, variant: SteamArtworkVariant): string[] {
  return FALLBACK_CHAIN[variant]
    .map(item => steamArtwork(appid, item))
    .filter((url): url is string => Boolean(url))
}

/** 竖版海报用 srcset 给窄屏降规格，省一半流量。 */
export function steamArtworkSrcset(appid: number | null | undefined, variant: SteamArtworkVariant): string | null {
  if (variant !== 'poster' && variant !== 'poster2x') return null
  const small = steamArtwork(appid, 'poster')
  const large = steamArtwork(appid, 'poster2x')
  if (!small || !large) return null
  return `${small} 300w, ${large} 600w`
}
