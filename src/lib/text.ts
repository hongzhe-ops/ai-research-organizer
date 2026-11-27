const norm = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ')

/**
 * Finds a quote in the source. Returns the exact source substring, or null if the quote
 * does not appear verbatim (ignoring whitespace, curly quotes and case).
 */
export function locate(content: string, quote: string): { start: number; end: number; text: string } | null {
  const direct = content.indexOf(quote)
  if (direct >= 0) return { start: direct, end: direct + quote.length, text: quote }
  const q = norm(quote).trim().toLowerCase()
  if (q.length < 8) return null
  // Build a normalised copy with an index map back to the original.
  let flat = ''
  const map: number[] = []
  let prevSpace = false
  for (let i = 0; i < content.length; i++) {
    let ch = norm(content[i])
    if (/\s/.test(ch)) { if (prevSpace) continue; ch = ' '; prevSpace = true } else prevSpace = false
    flat += ch.toLowerCase()
    map.push(i)
  }
  const at = flat.indexOf(q)
  if (at < 0) return null
  const start = map[at]
  const end = map[at + q.length - 1] + 1
  return { start, end, text: content.slice(start, end) }
}
