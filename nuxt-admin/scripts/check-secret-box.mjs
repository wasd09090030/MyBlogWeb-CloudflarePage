/**
 * Checks for the generic secret box (AES-GCM + per-purpose derivation + key id).
 * Run: node --experimental-strip-types scripts/check-secret-box.mjs
 */
import { createSecretBox, fingerprintSecret, loadKeyRing } from '../server/utils/secret-box.ts'

let failures = 0
async function check(name, fn) {
  try {
    await fn()
    console.log(`  ok  ${name}`)
  } catch (error) {
    failures += 1
    console.error(`FAIL  ${name}: ${error.message}`)
  }
}

const PURPOSE = 'steam-credential'
const CURRENT = 'master-key-current-1234567890'
const RETIRED = 'master-key-retired-0987654321'

await check('seal then open round-trips', async () => {
  const box = createSecretBox(await loadKeyRing({ current: CURRENT }), PURPOSE)
  const sealed = await box.seal('0123456789abcdef0123456789abcdef')
  const opened = await box.open(sealed)
  if (opened !== '0123456789abcdef0123456789abcdef') throw new Error(`unexpected plaintext: ${opened}`)
})

await check('key id is a stable fingerprint', async () => {
  const a = await fingerprintSecret(CURRENT)
  const b = await fingerprintSecret(CURRENT)
  if (a !== b) throw new Error('fingerprint is not deterministic')
  if (a === await fingerprintSecret(RETIRED)) throw new Error('different secrets share a fingerprint')
  if (!/^[0-9a-f]{16}$/.test(a)) throw new Error(`unexpected fingerprint shape: ${a}`)
})

await check('ciphertext is bound to its purpose', async () => {
  const box = createSecretBox(await loadKeyRing({ current: CURRENT }), PURPOSE)
  const sealed = await box.seal('secret-value')
  const otherPurpose = createSecretBox(await loadKeyRing({ current: CURRENT }), 'another-purpose')
  if (await otherPurpose.open(sealed) !== null) throw new Error('cross-purpose open must fail')
})

await check('rotation keeps old rows readable', async () => {
  const before = createSecretBox(await loadKeyRing({ current: RETIRED }), PURPOSE)
  const sealed = await before.seal('rotated-value')
  const after = createSecretBox(await loadKeyRing({ current: CURRENT, previous: RETIRED }), PURPOSE)
  if (await after.open(sealed) !== 'rotated-value') throw new Error('previous key was not used')
})

await check('unknown key id fails closed', async () => {
  const box = createSecretBox(await loadKeyRing({ current: CURRENT }), PURPOSE)
  const sealed = await box.seal('value')
  const stranger = createSecretBox(await loadKeyRing({ current: 'some-other-master' }), PURPOSE)
  if (await stranger.open(sealed) !== null) throw new Error('unknown key id must not decrypt')
})

await check('tampered ciphertext is rejected', async () => {
  const box = createSecretBox(await loadKeyRing({ current: CURRENT }), PURPOSE)
  const sealed = await box.seal('value')
  const bytes = [...atob(sealed.cipher)]
  bytes[0] = String.fromCharCode(bytes[0].charCodeAt(0) ^ 1)
  const tampered = { ...sealed, cipher: btoa(bytes.join('')) }
  if (await box.open(tampered) !== null) throw new Error('tampered ciphertext must fail')
})

await check('rows without key id are treated as legacy', async () => {
  const box = createSecretBox(await loadKeyRing({ current: CURRENT }), PURPOSE)
  const sealed = await box.seal('value')
  if (await box.open({ ...sealed, keyId: '' }) !== null) throw new Error('missing key id must fail')
})

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exitCode = 1
} else {
  console.log('\nall secret-box checks passed')
}
