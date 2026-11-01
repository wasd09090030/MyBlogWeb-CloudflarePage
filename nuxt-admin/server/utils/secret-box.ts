/**
 * Secret box: AES-GCM sealing for values that must be stored at rest in D1.
 *
 * Threat model in one line: this protects database dumps, backups and
 * `wrangler d1 execute` output — not a runtime attacker who can read Worker
 * secrets or deploy code.
 *
 * Design:
 * - one master secret (`STEAM_CREDENTIAL_KEY`, falling back to `SESSION_PEPPER`);
 * - per-purpose subkeys via `SHA-256("dsh:secret-box:v1:<purpose>:<master>")`,
 *   so ciphertext from one field cannot be replayed into another;
 * - the master key's fingerprint (`keyId`) travels with the ciphertext, which
 *   makes rotation self-describing: put the new key in place, move the old one
 *   to `STEAM_CREDENTIAL_KEY_PREVIOUS`, and old rows still open;
 * - AAD binds purpose + keyId, so tampering or cross-field copying fails closed.
 */

const encoder = new TextEncoder()
const DERIVATION_PREFIX = 'dsh:secret-box:v1'

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function sha256(text: string): Promise<Uint8Array<ArrayBuffer>> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(text))
  return new Uint8Array(digest)
}

function toHex(bytes: Uint8Array): string {
  let hex = ''
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0')
  return hex
}

export type MasterKey = { id: string, secret: string }
export type KeyRing = { current: MasterKey | null, previous: MasterKey | null }

export type SealedSecret = { keyId: string, cipher: string, iv: string }

/** `keyId` is a stable fingerprint of the master secret, not a manual counter. */
export async function fingerprintSecret(secret: string): Promise<string> {
  return toHex((await sha256(secret)).slice(0, 8))
}

export async function loadKeyRing(source: { current?: string | null, previous?: string | null }): Promise<KeyRing> {
  const current = source.current?.trim()
  const previous = source.previous?.trim()
  return {
    current: current ? { id: await fingerprintSecret(current), secret: current } : null,
    previous: previous ? { id: await fingerprintSecret(previous), secret: previous } : null
  }
}

async function deriveKey(purpose: string, secret: string): Promise<CryptoKey> {
  const digest = await sha256(`${DERIVATION_PREFIX}:${purpose}:${secret}`)
  return await crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

function aadFor(purpose: string, keyId: string): Uint8Array<ArrayBuffer> {
  return encoder.encode(`${purpose}:${keyId}`)
}

export function createSecretBox(ring: KeyRing, purpose: string) {
  const available = Boolean(ring.current)

  async function seal(plaintext: string): Promise<SealedSecret> {
    if (!ring.current) throw new Error('secret box is not configured')
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const key = await deriveKey(purpose, ring.current.secret)
    const buffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: aadFor(purpose, ring.current.id) },
      key,
      encoder.encode(plaintext)
    )
    return {
      keyId: ring.current.id,
      cipher: toBase64(new Uint8Array(buffer)),
      iv: toBase64(iv)
    }
  }

  /** Returns null for a wrong purpose, wrong key, tampered ciphertext or a legacy row. */
  async function open(sealed: SealedSecret): Promise<string | null> {
    if (!sealed.cipher || !sealed.iv || !sealed.keyId) return null
    const candidates = [ring.current, ring.previous].filter((key): key is MasterKey => Boolean(key))
    for (const master of candidates) {
      if (master.id !== sealed.keyId) continue
      try {
        const key = await deriveKey(purpose, master.secret)
        const buffer = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: fromBase64(sealed.iv), additionalData: aadFor(purpose, master.id) },
          key,
          fromBase64(sealed.cipher)
        )
        return new TextDecoder().decode(buffer)
      } catch {
        return null
      }
    }
    return null
  }

  return {
    available,
    currentKeyId: ring.current?.id ?? null,
    seal,
    open
  }
}

