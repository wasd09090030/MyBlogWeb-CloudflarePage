const encoder = new TextEncoder()
// Cloudflare Workers Free allows 10 ms of CPU per request. The 210k setting
// exceeded that budget during the production canary, while 100k remains
// compatible with the existing verifier minimum and completes on Free.
const PBKDF2_ITERATIONS = 100_000

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function fixedTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) difference |= (left[index] ?? 0) ^ (right[index] ?? 0)
  return difference === 0
}

async function derivePassword(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const saltBuffer = new Uint8Array(salt).buffer
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBuffer, iterations, hash: 'SHA-256' }, key, 256)
  return new Uint8Array(bits)
}

export async function hashPassword(password: string, iterations = PBKDF2_ITERATIONS) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const derived = await derivePassword(password, salt, iterations)
  return {
    hash: toBase64Url(derived),
    salt: toBase64Url(salt),
    iterations,
    algorithm: 'pbkdf2-sha256'
  }
}

export async function verifyPassword(password: string, hash: string, salt: string, iterations: number, algorithm: string): Promise<boolean> {
  if (algorithm !== 'pbkdf2-sha256' || iterations < 100_000 || iterations > 1_000_000) return false
  try {
    const expected = fromBase64Url(hash)
    const derived = await derivePassword(password, fromBase64Url(salt), iterations)
    return fixedTimeEqual(expected, derived)
  } catch {
    return false
  }
}

export function randomToken(bytes = 32): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)))
}

export async function hashToken(token: string, pepper: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${pepper}:${token}`))
  return toBase64Url(new Uint8Array(digest))
}

export async function hashIdentifier(value: string, pepper: string): Promise<string> {
  return await hashToken(value, pepper)
}

export async function hmacSha256(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  return toBase64Url(new Uint8Array(signature))
}

export { PBKDF2_ITERATIONS }
