export function slugify(input: string): string {
  const normalized = input.trim().toLowerCase().normalize('NFKD')
  let result = ''
  let dash = false
  for (const char of normalized) {
    if (char >= 'a' && char <= 'z' || char >= '0' && char <= '9') {
      result += char
      dash = false
    } else if (result && !dash) {
      result += '-'
      dash = true
    }
  }
  return result.replace(/^-+|-+$/g, '')
}

export function fallbackSlug(input: string): string {
  return slugify(input) || 'article'
}
