import { md5 } from '~/utils/md5'

const GRAVATAR_BASE = 'https://www.gravatar.com/avatar'
const GRAVATAR_SIZE = 80
const DICEBEAR_BASE = 'https://api.dicebear.com/7.x/notionists/svg'

/**
 * Build a Gravatar URL using exact md5 of the email.
 * Falls back to a DiceBear Notionist URL when no email is provided.
 *
 * @param email  Optional. Will be lowercased and trimmed before md5.
 *               Falsy or empty-after-trim values trigger the DiceBear fallback.
 * @param name   Used to seed the DiceBear fallback. Also used for the
 *               `<UAvatar>` `alt` attribute in the consuming component.
 */
export function getAvatarUrl(email?: string | null, name: string): string {
  if (email && email.trim()) {
    const hash = md5(email.toLowerCase().trim())
    return `${GRAVATAR_BASE}/${hash}?d=404&s=${GRAVATAR_SIZE}`
  }
  return getDiceBearUrl(name)
}

/**
 * Build a stable DiceBear Notionist URL keyed off the author name.
 * Used as the onError fallback in the consuming component.
 */
export function getDiceBearUrl(name: string): string {
  const seed = encodeURIComponent(name)
  return `${DICEBEAR_BASE}?seed=${seed}&backgroundColor=transparent`
}
