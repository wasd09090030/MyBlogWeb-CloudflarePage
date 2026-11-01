/**
 * Pure validation checks for the Steam showcase configuration.
 * Run with: node --experimental-strip-types scripts/check-steam-showcases.mjs
 */
import {
  DEFAULT_STEAM_SHOWCASES,
  STEAM_SHOWCASE_LIMIT,
  SteamShowcaseError,
  normalizeShowcaseList
} from '../shared/steam-showcases.ts'

let failures = 0

function check(name, fn) {
  try {
    fn()
    console.log(`  ok  ${name}`)
  } catch (error) {
    failures += 1
    console.error(`FAIL  ${name}: ${error.message}`)
  }
}

function expectError(fn, field) {
  try {
    fn()
  } catch (error) {
    if (!(error instanceof SteamShowcaseError)) throw new Error(`expected SteamShowcaseError, got ${error}`)
    if (field && error.field !== field) throw new Error(`expected field ${field}, got ${error.field}`)
    return
  }
  throw new Error('expected a validation error')
}

console.log('steam showcase validation')

check('default configuration is valid and complete', () => {
  const normalized = normalizeShowcaseList(DEFAULT_STEAM_SHOWCASES)
  if (normalized.length !== 8) throw new Error(`expected 8 defaults, got ${normalized.length}`)
  if (normalized[0].type !== 'favorite') throw new Error('favorite should lead the default layout')
  if (normalized[1].type !== 'rating') throw new Error('rating should follow favorite in the default layout')
})

check('rating accepts a limit inside its range', () => {
  const [entry] = normalizeShowcaseList([{ type: 'rating', config: { limit: 8 } }])
  if (entry.config.limit !== 8) throw new Error('rating limit was dropped')
})

check('recent accepts up to 8 but not 9', () => {
  const [entry] = normalizeShowcaseList([{ type: 'recent', config: { limit: 8 } }])
  if (entry.config.limit !== 8) throw new Error('recent limit 8 should be accepted')
  expectError(() => normalizeShowcaseList([{ type: 'recent', config: { limit: 9 } }]), 'config.limit')
})

check('unknown type is rejected', () => {
  expectError(() => normalizeShowcaseList([{ type: 'screenshots' }]), 'showcases[0].type')
})

check('duplicate type is rejected', () => {
  expectError(() => normalizeShowcaseList([{ type: 'recent' }, { type: 'recent' }]), 'showcases[1].type')
})

check('listing over the slot limit is rejected', () => {
  const list = Array.from({ length: STEAM_SHOWCASE_LIMIT + 1 }, () => ({ type: 'recent' }))
  expectError(() => normalizeShowcaseList(list), 'showcases')
})

check('limit outside the type range is rejected', () => {
  expectError(() => normalizeShowcaseList([{ type: 'recent', config: { limit: 9 } }]), 'config.limit')
})

check('sort is only accepted by list types that support it', () => {
  expectError(() => normalizeShowcaseList([{ type: 'wishlist', config: { sort: 'total' } }]), 'config.sort')
})

check('appid is only accepted by the favorite showcase', () => {
  expectError(() => normalizeShowcaseList([{ type: 'recent', config: { appid: 730 } }]), 'config.appid')
})

check('favorite accepts an appid and defaults are merged', () => {
  const [entry] = normalizeShowcaseList([{ type: 'favorite', config: { appid: 1245620 } }])
  if (entry.config.appid !== 1245620) throw new Error('appid was dropped')
  const [top] = normalizeShowcaseList([{ type: 'top-playtime', config: {} }])
  if (top.config.limit !== 6) throw new Error(`expected default limit 6, got ${top.config.limit}`)
})

check('visible defaults to true', () => {
  const [entry] = normalizeShowcaseList([{ type: 'collector' }])
  if (entry.visible !== true) throw new Error('visible should default to true')
})

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exitCode = 1
} else {
  console.log('\nall showcase checks passed')
}
