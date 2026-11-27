import { Plus, TextCursorInput } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { locate } from '../lib/text'
import { useStore, useT } from '../store'
import type { Evidence, Source } from '../types'
import { cx } from './ui'

const isStop = (c: string) => /[。！？!?\n]/.test(c) || c === '.'
const isWord = (c: string | undefined) => !!c && /[A-Za-z0-9'’-]/.test(c)

/** Snap a selection to whole words so a hurried drag doesn't cut words in half. */
function snapWords(content: string, start: number, end: number) {
  while (start > 0 && isWord(content[start - 1]) && isWord(content[start])) start--
  while (end < content.length && isWord(content[end - 1]) && isWord(content[end])) end++
  return { start, end }
}

/** Grow a selection to the full sentence(s) it touches, without the speaker label. */
function sentenceRange(content: string, start: number, end: number) {
  let s = start
  while (s > 0 && !isStop(content[s - 1])) s--
  const lineStart = content.lastIndexOf('\n', s - 1) + 1
  if (s === lineStart) {
    const m = content.slice(s, s + 40).match(/^[^\n：:]{1,24}[：:]\s*/)
    if (m) s += m[0].length
  }
  while (s < end && /\s/.test(content[s])) s++
  let e = end
  while (e < content.length && !isStop(content[e])) e++
  if (e < content.length && content[e] !== '\n') e++
  while (e < content.length && /[”"’）)]/.test(content[e])) e++
  return { start: s, end: e }
}

export function SourceReader({ source, markClass, focusId, onMark, onAdded, className }: {
  source: Source
  markClass?: (e: Evidence) => string
  focusId?: string
  onMark?: (e: Evidence) => void
  onAdded?: (id: string) => void
  className?: string
}) {
  const { project: p, addEvidence } = useStore()
  const t = useT().reader
  const ref = useRef<HTMLDivElement>(null)
  const [sel, setSel] = useState<{ exact: { start: number; end: number }; sentence: { start: number; end: number }; x: number; y: number } | null>(null)

  const spans = useMemo(() => {
    const out: Array<{ start: number; end: number; ev: Evidence }> = []
    for (const ev of p.evidence.filter((e) => e.sourceId === source.id && e.status !== 'rejected')) {
      const hit = locate(source.content, ev.quote)
      if (hit) out.push({ start: hit.start, end: hit.end, ev })
    }
    out.sort((a, b) => a.start - b.start)
    let maxEnd = 0
    return out.filter((s) => { const ok = s.start >= maxEnd; if (ok) maxEnd = s.end; return ok })
  }, [source, p.evidence])

  useEffect(() => {
    if (!focusId) return
    document.getElementById(`hl-${focusId}`)?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [focusId, source.id])
  useEffect(() => setSel(null), [source.id])

  const onMouseUp = () => {
    const s = window.getSelection()
    const text = s?.toString().trim() || ''
    if (!s || text.length < 2 || !ref.current?.contains(s.anchorNode)) return setSel(null)
    const hit = locate(source.content, text)
    if (!hit) return setSel(null)
    const exact = snapWords(source.content, hit.start, hit.end)
    const sentence = sentenceRange(source.content, exact.start, exact.end)
    const r = s.getRangeAt(0).getBoundingClientRect()
    const box = ref.current.getBoundingClientRect()
    setSel({ exact, sentence, x: r.left - box.left + r.width / 2, y: r.top - box.top + ref.current.scrollTop })
  }

  const add = (range: { start: number; end: number }) => {
    const quote = source.content.slice(range.start, range.end).trim()
    if (!quote) return
    const id = addEvidence({ sourceId: source.id, quote, origin: 'researcher', status: 'confirmed' })
    window.getSelection()?.removeAllRanges()
    setSel(null)
    onAdded?.(id)
  }

  const cls = markClass || ((e: Evidence) => (e.status === 'suggested' ? 'hl-draft' : 'hl'))
  const parts: React.ReactNode[] = []
  let at = 0
  for (const s of spans) {
    if (s.start > at) parts.push(source.content.slice(at, s.start))
    parts.push(
      <mark key={s.ev.id} id={`hl-${s.ev.id}`} tabIndex={0} onClick={() => onMark?.(s.ev)} onKeyDown={(e) => e.key === 'Enter' && onMark?.(s.ev)}
        className={cx(cls(s.ev), s.ev.id === focusId && 'hl-focus')}>
        {source.content.slice(s.start, s.end)}
      </mark>,
    )
    at = s.end
  }
  parts.push(source.content.slice(at))
  const sentenceDiffers = sel && (sel.sentence.start !== sel.exact.start || sel.sentence.end !== sel.exact.end)

  return (
    <div ref={ref} onMouseUp={onMouseUp} className={cx('relative font-serif text-[15.5px] leading-[1.8] whitespace-pre-wrap', className)}>
      {parts}
      {sel && (
        <div onMouseDown={(e) => e.preventDefault()} style={{ left: sel.x, top: sel.y }}
          className="absolute z-10 flex -translate-x-1/2 -translate-y-[calc(100%+8px)] gap-1 rounded-lg bg-ink p-1 font-sans shadow-lg">
          <button onClick={() => add(sel.exact)} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white hover:bg-white/15">
            <Plus size={13} /> {t.exact}
          </button>
          {sentenceDiffers && (
            <button onClick={() => add(sel.sentence)} title={source.content.slice(sel.sentence.start, sel.sentence.end)} className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-ink hover:bg-ink-soft">
              <TextCursorInput size={13} /> {t.sentence}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
