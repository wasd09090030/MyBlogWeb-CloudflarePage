import md5Lib from 'js-md5'

/**
 * Compute lowercase hex MD5 of a UTF-8 string.
 * Used to match Gravatar URLs: gravatar.com only recognizes exact md5 hashes.
 *
 * Throws if `js-md5` is somehow unavailable at runtime (should never happen —
 * the dep is declared in package.json and installed). Callers should NOT
 * try/catch this; let the error surface so the bug is visible.
 */
export function md5(input: string): string {
  return md5Lib(input)
}
