export function stripMdcMarkup(content?: string | null): string {
  if (!content) return ''
  let output = content

  output = output.replace(/^---[\s\S]*?---\s*/, '')
  output = output.replace(/```[\s\S]*?```/g, '')
  output = output.replace(/::[A-Za-z][\w-]*(?:\{[^}]*\})?[\s\S]*?::/g, '')
  output = output.replace(/:[A-Za-z][\w-]*(?:\{[^}]*\})?/g, '')
  output = output.replace(/^::.*$/gm, '')
  output = output.replace(/<[^>]*>/g, '')
  output = output.replace(/!\[([^\]]*)\]\([^\)]*\)/g, '$1')
  output = output.replace(/\[([^\]]+)\]\([^\)]*\)/g, '$1')
  output = output.replace(/`([^`]+)`/g, '$1')
  output = output.replace(/^\s*#{1,6}\s+/gm, '')
  output = output.replace(/^\s*>+\s?/gm, '')
  output = output.replace(/^\s*[-*+]\s+/gm, '')
  output = output.replace(/^\s*\d+\.\s+/gm, '')
  output = output.replace(/\s+/g, ' ').trim()

  return output
}

export function getExcerpt(content?: string | null, maxLength = 150): string {
  const plainText = stripMdcMarkup(content)
  if (!plainText) return ''
  return plainText.length > maxLength ? `${plainText.substring(0, maxLength)}...` : plainText
}
