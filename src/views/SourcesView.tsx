import { ExternalLink, Pencil, Plus, Trash2, Wand2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { runExtract, useAIAction } from '../ai/useAI'
import { ImportDialog } from '../components/ImportDialog'
import { TracePanel } from '../components/TracePanel'
import { Button, Empty, PageHeader, SourceIcon, cx } from '../components/ui'
import { locate } from '../lib/text'
import { useStore, useT } from '../store'
import type { Evidence } from '../types'

interface Span { start: number; end: number; ev: Evidence }

export function SourcesView({ onNeedKey }: { onNeedKey: () => void }) {
  const { project: p, nav, go, addEvidence, deleteSource, busy } = useStore()
  const T = useT()
  const t = T.sources
  const [importing, setImporting] = useState(false)
  const act = useAIAction(onNeedKey)
  const source = p.sources.find((s) => s.id === nav.sourceId) || p.sources[0]
  const focusId = nav.focusEvidenceId
  const textRef = useRef<HTMLDivElement>(null)
  const [sel, setSel] = useState<{ text: string; x: number; y: number } | null>(null)

  const spans = useMemo<Span[]>(() => {
    if (!source) return []
    const out: Span[] = []
    for (const ev of p.evidence.filter((e) => e.sourceId === source.id && e.status !== 'rejected')) {
      const hit = locate(source.content, ev.quote)
      if (hit) out.push({ start: hit.start, end: hit.end, ev })
    }
    out.sort((a, b) => a.start - b.start)
    // Drop overlaps so the text renders cleanly; the earlier quote wins.
    return out.filter((s, i) => i === 0 || s.start >= out.slice(0, i).reduce((m, x) => Math.max(m, x.end), 0))
  }, [source, p.evidence])

  useEffect(() => {
    if (!focusId) return
    const el = document.getElementById(`hl-${focusId}`)
    el?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [focusId, source?.id])

  const onMouseUp = () => {
    const s = window.getSelection()
    const text = s?.toString().trim() || ''
    if (!s || text.length < 6 || !textRef.current?.contains(s.anchorNode)) return setSel(null)
    const r = s.getRangeAt(0).getBoundingClientRect()
    const box = textRef.current.getBoundingClientRect()
    setSel({ text, x: r.left - box.left + r.width / 2, y: r.top - box.top })
  }

  const addSelection = () => {
    if (!sel || !source) return
    const hit = locate(source.content, sel.text)
    if (!hit) return setSel(null)
    const id = addEvidence({ sourceId: source.id, quote: hit.text, origin: 'researcher', status: 'confirmed' })
    window.getSelection()?.removeAllRanges()
    setSel(null)
    go({ view: 'sources', sourceId: source.id, focusEvidenceId: id })
  }

  if (!p.sources.length) {
    return (
      <>
        <PageHeader title={t.title} />
        <Empty title={t.emptyT} body={t.emptyB} action={<Button variant="primary" onClick={() => setImporting(true)}><Plus size={15} />{t.import}</Button>} />
        {importing && <ImportDialog onClose={() => setImporting(false)} onImported={(id) => go({ view: 'sources', sourceId: id })} />}
      </>
    )
  }

  const focus = p.evidence.find((e) => e.id === focusId && e.sourceId === source?.id)
  const evCount = (id: string) => p.evidence.filter((e) => e.sourceId === id && e.status !== 'rejected').length

  const renderText = () => {
    if (!source) return null
    const parts: React.ReactNode[] = []
    let at = 0
    spans.forEach((s) => {
      if (s.start > at) parts.push(source.content.slice(at, s.start))
      const draft = s.ev.status === 'suggested'
      parts.push(
        <mark key={s.ev.id} id={`hl-${s.ev.id}`} tabIndex={0}
          onClick={() => go({ view: 'sources', sourceId: source.id, focusEvidenceId: s.ev.id })}
          onKeyDown={(e) => e.key === 'Enter' && go({ view: 'sources', sourceId: source.id, focusEvidenceId: s.ev.id })}
          title={draft ? t.hlDraftTitle : t.hlTitle}
          className={cx(draft ? 'hl-draft' : 'hl', s.ev.id === focusId && 'hl-focus')}>
          {source.content.slice(s.start, s.end)}
        </mark>,
      )
      at = s.end
    })
    parts.push(source.content.slice(at))
    return parts
  }

  return (
    <>
      <PageHeader title={t.title} sub={t.sub}
        actions={<Button variant="primary" onClick={() => setImporting(true)}><Plus size={15} />{t.import}</Button>} />
      <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)_300px]">
        <ul className="space-y-1" aria-label="Sources">
          {p.sources.map((s) => (
            <li key={s.id}>
              <button onClick={() => go({ view: 'sources', sourceId: s.id })} aria-current={s.id === source?.id}
                className={cx('flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left', s.id === source?.id ? 'bg-white shadow-[0_0_0_1px_var(--color-line)]' : 'hover:bg-white/60')}>
                <span className="mt-0.5 text-muted"><SourceIcon type={s.type} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{s.participant || s.title}</span>
                  <span className="block text-xs text-muted">{t.quotes(evCount(s.id))}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {source && (
          <article className="relative min-w-0 rounded-xl border border-line bg-white">
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-6 py-3.5">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[15px] font-semibold">{source.title}</h2>
                <p className="text-xs text-muted"><span>{T.type[source.type]}</span>{source.participant ? ` · ${source.participant}` : ''}</p>
              </div>
              {source.url && <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-ink hover:underline">{t.openOriginal} <ExternalLink size={12} /></a>}
              <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act(() => runExtract(source.id), t.extractDone)}>
                <Wand2 size={13} />{t.extract}
              </Button>
              <Button size="sm" variant="ghost" aria-label={t.del} onClick={() => { if (confirm(t.delConfirm(source.title))) { deleteSource(source.id); go({ view: 'sources' }) } }}>
                <Trash2 size={14} />
              </Button>
            </div>
            <div ref={textRef} onMouseUp={onMouseUp} className="relative px-6 py-5 font-serif text-[15.5px] leading-[1.75] whitespace-pre-wrap">
              {renderText()}
              {sel && (
                <button onMouseDown={(e) => e.preventDefault()} onClick={addSelection}
                  className="absolute z-10 inline-flex -translate-x-1/2 -translate-y-[calc(100%+6px)] items-center gap-1.5 rounded-md bg-ink px-2.5 py-1.5 font-sans text-xs font-medium text-white shadow-lg"
                  style={{ left: sel.x, top: sel.y }}>
                  <Plus size={13} /> {t.addEv}
                </button>
              )}
            </div>
          </article>
        )}

        <aside>
          {focus ? <TracePanel evidence={focus} /> : (
            <div className="rounded-xl border border-dashed border-line p-5 text-[13px] leading-relaxed text-muted">
              <p className="mb-3 font-medium text-text">{t.traceT}</p>
              <p>{t.traceB}</p>
              <p className="mt-3 flex items-center gap-2"><mark className="hl px-1">{t.solid}</mark> {t.solidD}</p>
              <p className="mt-1.5 flex items-center gap-2"><mark className="hl-draft">{t.dashed}</mark><Pencil size={11} /> {t.dashedD}</p>
            </div>
          )}
        </aside>
      </div>
      {importing && <ImportDialog onClose={() => setImporting(false)} onImported={(id) => go({ view: 'sources', sourceId: id })} />}
    </>
  )
}
