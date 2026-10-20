export const FINGERPRINT_VERSION = 'phash-dct32-ac63-rgb-v1'
export const FINGERPRINT_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const PHASH_SIZE = 32

export type ImageFingerprint = {
  hash: string
  width: number
  height: number
  red: number
  green: number
  blue: number
  deviation: number
}

export type DuplicateImage = {
  key: string
  imageUrl: string
  sourceUrl: string
  sourceKey?: string
  label: string
  id?: number
  /** Gallery creation time; used to keep the oldest copy of an exact duplicate. */
  createdAt?: string
  fingerprint?: ImageFingerprint
  error?: string
}

export type DuplicateMatch = { left: DuplicateImage; right: DuplicateImage; distance: number; exact: boolean }
export type DuplicateCandidate = DuplicateImage & { matches: DuplicateMatch[]; keep: boolean }
export type GalleryDuplicateCatalog = {
  items: Array<{ id: number; imageUrl: string; sourceUrl: string; isActive: boolean; createdAt: string }>
  nextCursor: number | null
  snapshot: number
}

export function fingerprintKey(value: string): string {
  const trimmed = value.trim()
  try {
    const url = new URL(trimmed)
    url.hash = ''
    return url.toString()
  } catch {
    return trimmed.split('#')[0] || ''
  }
}

/** The DC term is excluded: brightness must not dominate the perceptual bits. */
export function fingerprintPixels(rgba: ArrayLike<number>, width: number, height: number): ImageFingerprint {
  const size = PHASH_SIZE
  if (rgba.length !== size * size * 4 || width < 1 || height < 1) throw new Error('Invalid fingerprint pixels')
  const luminance = new Float64Array(size * size)
  let red = 0, green = 0, blue = 0, sum = 0, squared = 0
  for (let i = 0; i < luminance.length; i++) {
    const alpha = rgba[i * 4 + 3]! / 255
    const r = rgba[i * 4]! * alpha + 255 * (1 - alpha)
    const g = rgba[i * 4 + 1]! * alpha + 255 * (1 - alpha)
    const b = rgba[i * 4 + 2]! * alpha + 255 * (1 - alpha)
    const value = r * 0.299 + g * 0.587 + b * 0.114
    luminance[i] = value
    red += r; green += g; blue += b; sum += value; squared += value * value
  }
  const cosines = Array.from({ length: 8 }, (_, frequency) =>
    Array.from({ length: size }, (_, pixel) => Math.cos((2 * pixel + 1) * frequency * Math.PI / (2 * size))))
  const horizontal = new Float64Array(size * 8)
  for (let y = 0; y < size; y++) {
    for (let u = 0; u < 8; u++) {
      for (let x = 0; x < size; x++) horizontal[y * 8 + u]! += luminance[y * size + x]! * cosines[u]![x]!
    }
  }
  const coefficients: number[] = []
  for (let v = 0; v < 8; v++) {
    for (let u = 0; u < 8; u++) {
      if (!u && !v) continue
      let value = 0
      for (let y = 0; y < size; y++) value += horizontal[y * 8 + u]! * cosines[v]![y]!
      coefficients.push(value * (u ? 1 : Math.SQRT1_2) * (v ? 1 : Math.SQRT1_2))
    }
  }
  const median = [...coefficients].sort((a, b) => a - b)[31]!
  // Compression noise must not turn near-zero coefficients of smooth artwork into random bits.
  const noiseFloor = Math.max(...coefficients.map(Math.abs)) * 0.01
  const threshold = Math.max(median, noiseFloor) + 1e-7
  const bits = coefficients.map(value => value > threshold ? '1' : '0').join('') + '0'
  let hash = ''
  for (let i = 0; i < bits.length; i += 4) hash += Number.parseInt(bits.slice(i, i + 4), 2).toString(16)
  const count = luminance.length
  return { hash, width, height, red: red / count, green: green / count, blue: blue / count,
    deviation: Math.sqrt(Math.max(0, squared / count - (sum / count) ** 2)) }
}

export function hammingDistance(left: string, right: string): number {
  if (!/^[a-f0-9]{16}$/.test(left) || !/^[a-f0-9]{16}$/.test(right)) throw new Error('Invalid perceptual hash')
  let result = 0
  for (let i = 0; i < left.length; i++) {
    let value = Number.parseInt(left[i]!, 16) ^ Number.parseInt(right[i]!, 16)
    while (value) { result++; value &= value - 1 }
  }
  return result
}

export function compareImages(left: DuplicateImage, right: DuplicateImage): DuplicateMatch | null {
  if ((left.sourceKey ?? fingerprintKey(left.sourceUrl)) === (right.sourceKey ?? fingerprintKey(right.sourceUrl))) return { left, right, distance: 0, exact: true }
  const a = left.fingerprint, b = right.fingerprint
  if (!a || !b) return null
  const ratio = (a.width / a.height) / (b.width / b.height)
  if (ratio < 0.97 || ratio > 1.03) return null
  const colorDifference = Math.max(Math.abs(a.red - b.red), Math.abs(a.green - b.green), Math.abs(a.blue - b.blue))
  if (colorDifference > 24) return null
  const distance = hammingDistance(a.hash, b.hash)
  // Uniform pictures have unstable DCT signs; compare their colors and detail instead.
  if (a.deviation < 4 && b.deviation < 4) {
    return colorDifference <= 6 ? { left, right, distance, exact: false } : null
  }
  // Sparse hashes carry less information; a fixed eight-bit allowance would overmatch simple artwork.
  const detailBits = Math.max(hammingDistance(a.hash, '0000000000000000'), hammingDistance(b.hash, '0000000000000000'))
  const maximumDistance = Math.min(8, Math.max(2, Math.floor(detailBits * 0.3)))
  if (Math.abs(a.deviation - b.deviation) > 20 || distance > maximumDistance) return null
  return { left, right, distance, exact: false }
}

export type ExactDuplicateGroup = { keep: DuplicateImage; remove: DuplicateImage[] }

/** Oldest gallery record first; the id breaks ties and orders records sharing a timestamp. */
function olderRecordFirst(left: DuplicateImage, right: DuplicateImage): number {
  const a = left.createdAt ?? '', b = right.createdAt ?? ''
  if (a !== b) return a < b ? -1 : 1
  return (left.id ?? 0) - (right.id ?? 0)
}

/**
 * Groups gallery records that are the same picture: identical stored file or a zero
 * perceptual distance. The oldest record of every group is kept, so a batch purge
 * removes only later copies.
 */
export function exactDuplicateGroups(items: DuplicateImage[]): ExactDuplicateGroup[] {
  const entries = items.filter(item => !item.error && typeof item.id === 'number')
  const parent = entries.map((_, index) => index)
  const find = (index: number): number => {
    let root = index
    while (parent[root] !== root) root = parent[root]!
    let current = index
    while (parent[current] !== root) {
      const next = parent[current]!
      parent[current] = root
      current = next
    }
    return root
  }
  for (let index = 0; index < entries.length; index++) {
    for (let previous = 0; previous < index; previous++) {
      const match = compareImages(entries[index]!, entries[previous]!)
      if (!match || match.distance !== 0) continue
      const left = find(index), right = find(previous)
      if (left !== right) parent[right] = left
    }
  }
  const buckets = new Map<number, DuplicateImage[]>()
  for (let index = 0; index < entries.length; index++) {
    const root = find(index)
    const bucket = buckets.get(root)
    if (bucket) bucket.push(entries[index]!)
    else buckets.set(root, [entries[index]!])
  }
  const groups: ExactDuplicateGroup[] = []
  for (const members of buckets.values()) {
    if (members.length < 2) continue
    const sorted = [...members].sort(olderRecordFirst)
    const keep = sorted[0]!
    groups.push({ keep, remove: sorted.slice(1) })
  }
  return groups.sort((left, right) => olderRecordFirst(left.keep, right.keep))
}

export function reviewCandidates(incoming: DuplicateImage[], existing: DuplicateImage[]): DuplicateCandidate[] {
  return incoming.map((item, index) => {
    const matches = [...existing, ...incoming.slice(0, index)]
      .map(other => compareImages(item, other)).filter((match): match is DuplicateMatch => Boolean(match))
    return { ...item, matches, keep: !item.error && !matches.length }
  })
}
