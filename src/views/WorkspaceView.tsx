import { AlertTriangle, ArrowLeft, ArrowLeftRight, Check, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Eye, History, Layers, Lightbulb, PenLine, RotateCcw, Scale, Unlink, Wand2, X } from 'lucide-react'
import { SourceReader } from '../components/SourceReader'
import { useEffect, useMemo, useState } from 'react'
import { evidenceSufficiency } from '../ai/pipeline'
import type { useAI } from '../ai/useAI'
import { EvidenceCard } from '../components/EvidenceCard'
import { NewBadge, RunBanner, StepGuide } from '../components/Flow'
import { Button, Dialog, Field, FieldGroup, SourceIcon, StatusChip, cardClass, cx, inputCls } from '../components/ui'
import { locate } from '../lib/text'
import { coverage, flags, usage, useStore, useT } from '../store'
import type { Evidence, Insight, Project } from '../types'

/* ---------- helpers ---------- */

function positionOf(p: Project, e: Evidence) {
  const sIdx = p.sources.findIndex((s) => s.id === e.sourceId)
  const src = p.sources[sIdx]
  const at = src ? locate(src.content, e.quote)?.start ?? 0 : 0
  return sIdx * 1e7 + at
}

/** All evidence for an insight, in reading order across sources. */
function orderedEvidence(p: Project, i: Insight) {
  return [...i.supporting, ...i.counter]
    .map((id) => p.evidence.find((e) => e.id === id))
    .filter(Boolean)
    .sort((a, b) => positionOf(p, a!) - positionOf(p, b!)) as Evidence[]
}

/* ---------- dialogs: tiered friction ---------- */

function RewriteDialog({ insight, onClose }: { insight: Insight; onClose: () => void }) {
  const { editInsight } = useStore()
  const T = useT()
  const t = T.workspace
  const [text, setText] = useState(insight.statement)
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const save = () => {
    if (!text.trim()) return setErr(t.errEmpty)
    if (text.trim() !== insight.statement) editInsight(insight.id, text.trim(), reason.trim() || undefined)
    onClose()
  }
  return (
    <Dialog title={t.rewriteT} onClose={onClose}>
      <Field label={t.field}><textarea autoFocus className={cx(inputCls, 'quote')} rows={3} value={text} onChange={(e) => { setText(e.target.value); setErr('') }} /></Field>
      <Field label={t.whyEdit}><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t.phEdit} onKeyDown={(e) => e.key === 'Enter' && save()} /></Field>
      {err && <p role="alert" className="mb-3 text-[13px] text-counter">{err}</p>}
      <div className="flex justify-end gap-2"><Button onClick={onClose}>{T.common.cancel}</Button><Button variant="primary" onClick={save}>{t.saveInsight}</Button></div>
    </Dialog>
  )
}

function RejectDialog({ insight, onClose }: { insight: Insight; onClose: () => void }) {
  const { setInsightStatus } = useStore()
  const T = useT()
  const t = T.workspace
  const [chip, setChip] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const submit = () => {
    if (!chip && !note.trim()) return setErr(t.errChip)
    setInsightStatus(insight.id, 'rejected', [chip, note.trim()].filter(Boolean).join(T.common.colon))
    onClose()
  }
  return (
    <Dialog title={t.rejectT} onClose={onClose}>
      <p className="quote mb-4 rounded-md bg-paper p-3 text-[15px]">{insight.statement}</p>
      <p className="mb-2 text-[13px] font-medium">{t.rejectPick}</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {t.chips.map((c) => (
          <button key={c} onClick={() => { setChip(chip === c ? null : c); setErr('') }} aria-pressed={chip === c}
            className={cx('rounded-full border px-3 py-1.5 text-[13px]', chip === c ? 'border-counter bg-counter-soft text-counter' : 'border-line hover:border-[#C9CED8]')}>{c}</button>
        ))}
      </div>
      <Field label={t.rejectNote}><input className={inputCls} value={note} onChange={(e) => { setNote(e.target.value); setErr('') }} onKeyDown={(e) => e.key === 'Enter' && submit()} /></Field>
      {err && <p role="alert" className="mb-3 text-[13px] text-counter">{err}</p>}
      <div className="flex justify-end gap-2"><Button onClick={onClose}>{T.common.cancel}</Button><Button variant="danger" onClick={submit}>{t.rejectInsight}</Button></div>
    </Dialog>
  )
}

function InsufficientDialog({ q, people, onAnyway, onClose }: { q: number; people: number; onAnyway: () => void; onClose: () => void }) {
  const { go } = useStore()
  const t = useT().workspace
  return (
    <Dialog title={t.insufficientT} onClose={onClose} width={480}>
      <p className="flex gap-3 text-[13px] leading-relaxed text-muted"><AlertTriangle size={18} className="shrink-0 text-warn" />{t.insufficientB(q, people)}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => { onClose(); onAnyway() }}>{t.anyway}</Button>
        <Button variant="primary" onClick={() => { onClose(); go({ view: 'sources' }) }}>{t.addMore}</Button>
      </div>
    </Dialog>
  )
}

function NeedAIDialog({ onConnect, onManual, onClose }: { onConnect: () => void; onManual: () => void; onClose: () => void }) {
  const t = useT().workspace
  return (
    <Dialog title={t.needAiT} onClose={onClose} width={480}>
      <p className="text-[13px] leading-relaxed text-muted">{t.needAiB}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={() => { onClose(); onManual() }}><PenLine size={14} />{t.manual}</Button>
        <Button variant="primary" onClick={() => { onClose(); onConnect() }}>{t.connect}</Button>
      </div>
    </Dialog>
  )
}

function ManualInsightDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { project: p, addInsight } = useStore()
  const T = useT()
  const t = T.workspace
  const [text, setText] = useState('')
  const [themes, setThemes] = useState<string[]>([])
  const [err, setErr] = useState('')
  const live = p.themes.filter((x) => x.status !== 'rejected')
  const save = () => {
    if (!text.trim()) return setErr(t.errEmpty)
    const id = addInsight(text.trim(), themes)
    onClose()
    onCreated(id)
  }
  return (
    <Dialog title={t.manualT} onClose={onClose}>
      <Field label={t.field}><textarea autoFocus className={cx(inputCls, 'quote')} rows={3} value={text} onChange={(e) => { setText(e.target.value); setErr('') }} /></Field>
      {live.length > 0 && (
        <FieldGroup label={t.manualThemes} hint={t.manualHint}>
          <div className="flex flex-wrap gap-1.5">
            {live.map((x) => (
              <button key={x.id} type="button" aria-pressed={themes.includes(x.id)} onClick={() => setThemes((v) => (v.includes(x.id) ? v.filter((y) => y !== x.id) : [...v, x.id]))}
                className={cx('rounded-full border px-3 py-1 text-[13px]', themes.includes(x.id) ? 'border-ink bg-ink-soft text-ink' : 'border-line')}>{x.name}</button>
            ))}
          </div>
        </FieldGroup>
      )}
      {err && <p role="alert" className="mb-3 text-[13px] text-counter">{err}</p>}
      <div className="flex justify-end gap-2"><Button onClick={onClose}>{T.common.cancel}</Button><Button variant="primary" onClick={save}>{t.manualSave}</Button></div>
    </Dialog>
  )
}

/* ---------- right column ---------- */

function Flags({ i }: { i: Insight }) {
  const p = useStore((s) => s.project)
  const t = useT().workspace
  const f = flags(p, i)
  if (i.status === 'rejected') return null
  return (
    <>
      {i.isNew && <NewBadge />}
      {f.needsReview && <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-medium text-warn"><AlertTriangle size={11} />{t.needsReview}</span>}
      {f.single && <span className="inline-flex items-center gap-1 text-[11px] text-warn"><AlertTriangle size={11} />{t.single}</span>}
      {f.disagreement && <span className="inline-flex items-center gap-1 text-[11px] text-counter"><Scale size={11} />{t.disagreement}</span>}
    </>
  )
}

function CoverageLine({ i }: { i: Insight }) {
  const p = useStore((s) => s.project)
  const t = useT().workspace
  const c = coverage(p, i.supporting)
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      <span>{t.saidBy} <b className="font-medium text-text">{t.participants(c.people, c.totalPeople)}</b>{t.partWord && ` ${t.partWord}`} · {t.sources(c.sources)}</span>
      <span className="flex items-center gap-1" aria-hidden="true">
        {Array.from({ length: c.totalPeople }).map((_, k) => <span key={k} className={cx('h-1.5 w-3 rounded-full', k < c.people ? 'bg-ink' : 'bg-line')} />)}
      </span>
      {i.counter.length > 0 && <span className="text-counter">{t.challenging(i.counter.length)}</span>}
    </div>
  )
}

function EvidenceGroup({ insight, ids, stance, onLocate }: { insight: Insight; ids: string[]; stance: 'support' | 'counter'; onLocate: (e: Evidence) => void }) {
  const { project: p, flipStance, unlinkEvidence } = useStore()
  const t = useT().workspace
  const list = ids.map((id) => p.evidence.find((e) => e.id === id)).filter(Boolean) as Evidence[]
  return (
    <div>
      <h4 className={cx('mb-2 text-xs font-semibold', stance === 'support' ? 'text-ink' : 'text-counter')}>{stance === 'support' ? t.supports : t.challenges} <span className="font-normal text-muted">{list.length}</span></h4>
      {!list.length && <p className="rounded-lg border border-dashed border-line p-3 text-xs leading-relaxed text-muted">{stance === 'counter' ? t.noCounter : t.noSupport}</p>}
      <div className="space-y-2">
        {list.map((e) => {
          const src = p.sources.find((s) => s.id === e.sourceId)
          return (
            <div key={e.id}>
              <button onClick={() => onLocate(e)} className={cx('w-full rounded-lg p-2.5 text-left transition-shadow hover:shadow-[0_0_0_1.5px_var(--color-ink)]', stance === 'counter' ? 'border border-counter/25 border-l-[3px] border-l-counter bg-counter-soft/50' : cardClass(e.status))}>
                <span className="quote block text-[13.5px] leading-snug">“{e.quote}”</span>
                <span className="mt-1 block text-[11px] text-muted">{src?.participant || src?.title}</span>
              </button>
              {insight.status !== 'rejected' && (
                <div className="mt-0.5 flex gap-3 pl-1">
                  <button onClick={() => flipStance(insight.id, e.id)} className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink"><ArrowLeftRight size={10} />{stance === 'support' ? t.markCh : t.markSup}</button>
                  <button onClick={() => unlinkEvidence(insight.id, e.id)} className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-counter"><Unlink size={10} />{t.notRelevant}</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function InsightDetail({ i, onLocate }: { i: Insight; onLocate: (e: Evidence) => void }) {
  const { project: p, setInsightStatus } = useStore()
  const T = useT()
  const t = T.workspace
  const [dialog, setDialog] = useState<'rewrite' | 'reject' | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const fmt = new Intl.DateTimeFormat(T.date, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  return (
    <div className="border-t border-line px-4 pt-3 pb-4">
      {i.needsReview && <p className="mb-3 flex gap-2 rounded-md bg-warn-soft p-2.5 text-xs text-warn"><AlertTriangle size={14} className="shrink-0" />{i.needsReview}</p>}
      <CoverageLine i={i} />
      {i.themeIds.length > 0 && <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted"><Layers size={12} className="mt-0.5 shrink-0" />{i.themeIds.map((x) => p.themes.find((y) => y.id === x)?.name).filter(Boolean).join('；')}</p>}
      {i.decisionNote && <p className="mt-2 text-xs text-ink">{t.decisionNote}{T.common.colon}{i.decisionNote}</p>}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {i.status === 'suggested' && <Button size="sm" variant="primary" onClick={() => setInsightStatus(i.id, 'confirmed')}><Check size={13} />{t.confirm}</Button>}
        {i.status !== 'suggested' && i.needsReview && <Button size="sm" variant="primary" onClick={() => setInsightStatus(i.id, i.status)}><Check size={13} />{t.confirm}</Button>}
        {i.status !== 'rejected' && <Button size="sm" onClick={() => setDialog('rewrite')}><PenLine size={13} />{t.rewrite}</Button>}
        {i.status !== 'rejected' && <Button size="sm" variant="danger" onClick={() => setDialog('reject')}><X size={13} />{T.common.reject}</Button>}
        {i.status !== 'suggested' && <Button size="sm" variant="ghost" onClick={() => setInsightStatus(i.id, 'suggested')}><RotateCcw size={13} />{t.reopen}</Button>}
      </div>
      {i.status === 'suggested' && <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted"><Eye size={12} />{t.canConfirm}</p>}

      {!!i.versions?.length && (
        <div className="mt-3">
          <button onClick={() => setShowHistory(!showHistory)} aria-expanded={showHistory} className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
            <History size={12} />{t.versions} ({i.versions.length}) <ChevronDown size={12} className={cx('transition-transform', showHistory && 'rotate-180')} />
          </button>
          {showHistory && (
            <ol className="mt-2 space-y-2 border-l border-line pl-3">
              {i.versions.map((v, k) => (
                <li key={k} className="text-xs">
                  <span className="text-muted">{v.actor === 'ai' ? t.aiOriginal : t.you} · {fmt.format(v.at)}</span>
                  <p className="quote mt-0.5 text-[13px] text-muted line-through decoration-graphite/40">{v.statement}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div className="mt-4 space-y-4">
        <EvidenceGroup insight={i} ids={i.supporting} stance="support" onLocate={onLocate} />
        <EvidenceGroup insight={i} ids={i.counter} stance="counter" onLocate={onLocate} />
      </div>
      {dialog === 'rewrite' && <RewriteDialog insight={i} onClose={() => setDialog(null)} />}
      {dialog === 'reject' && <RejectDialog insight={i} onClose={() => setDialog(null)} />}
    </div>
  )
}

function TraceCard({ e, onBack, onPickInsight }: { e: Evidence; onBack: () => void; onPickInsight: (id: string) => void }) {
  const { project: p, go, linkEvidence } = useStore()
  const [target, setTarget] = useState('')
  const T = useT()
  const t = T.workspace
  const u = usage(p, e.id)
  return (
    <div className="p-4">
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-xs text-ink hover:underline"><ArrowLeft size={12} />{t.back}</button>
      <EvidenceCard e={e} />
      <h3 className="mt-4 mb-2 text-[13px] font-semibold">{t.traceT}</h3>
      {!u.themes.length && !u.supports.length && !u.challenges.length && <p className="text-xs text-muted">{t.traceNone}</p>}
      <ul className="space-y-1.5 text-[13px]">
        {u.themes.map((x) => <li key={x.id}><button onClick={() => go({ view: 'themes' })} className="flex gap-2 text-left hover:text-ink"><Layers size={14} className="mt-0.5 shrink-0 text-muted" /><span><span className="text-xs text-muted">{t.inTheme} · </span>{x.name}</span></button></li>)}
        {u.supports.map((x) => <li key={x.id}><button onClick={() => onPickInsight(x.id)} className="flex gap-2 text-left hover:text-ink"><Lightbulb size={14} className="mt-0.5 shrink-0 text-ink" /><span><span className="text-xs text-ink">{t.supports} · </span>{x.statement}</span></button></li>)}
        {u.challenges.map((x) => <li key={x.id}><button onClick={() => onPickInsight(x.id)} className="flex gap-2 text-left hover:text-counter"><Lightbulb size={14} className="mt-0.5 shrink-0 text-counter" /><span><span className="text-xs text-counter">{t.challenges} · </span>{x.statement}</span></button></li>)}
      </ul>
      {p.insights.some((i) => i.status !== 'rejected') && e.status !== 'rejected' && (
        <div className="mt-4 rounded-lg border border-line p-3">
          <p className="mb-2 text-xs font-semibold">{t.addTo}</p>
          <select aria-label={t.pickInsight} value={target} onChange={(x) => setTarget(x.target.value)} className={cx(inputCls, 'mb-2')}>
            <option value="">{t.pickInsight}</option>
            {p.insights.filter((i) => i.status !== 'rejected').map((i) => <option key={i.id} value={i.id}>{i.statement}</option>)}
          </select>
          <div className="flex gap-2">
            <Button size="sm" disabled={!target} onClick={() => { linkEvidence(target, e.id, 'support'); onPickInsight(target) }}>{t.asSupport}</Button>
            <Button size="sm" variant="danger" disabled={!target} onClick={() => { linkEvidence(target, e.id, 'counter'); onPickInsight(target) }}>{t.asCounter}</Button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- the workspace ---------- */

export function WorkspaceView({ ai }: { ai: ReturnType<typeof useAI> }) {
  const { project: p, nav, go, reviewed, markReviewed, progress, settings } = useStore()
  const T = useT()
  const t = T.workspace
  const [trace, setTrace] = useState<string | null>(null)
  const [insufficient, setInsufficient] = useState<{ q: number; people: number } | null>(null)
  const [needAI, setNeedAI] = useState(false)
  const [manual, setManual] = useState(false)

  const insight = p.insights.find((i) => i.id === nav.insightId)
  const source = p.sources.find((s) => s.id === nav.sourceId) || p.sources[0]
  const focusId = nav.focusEvidenceId
  const traced = p.evidence.find((e) => e.id === trace)
  const order = { suggested: 0, edited: 1, confirmed: 1, rejected: 2 }
  const insights = [...p.insights].sort((a, b) => order[a.status] - order[b.status])
  const chain = useMemo(() => (insight ? orderedEvidence(p, insight) : []), [p, insight])

  useEffect(() => { if (insight) markReviewed(insight.id) }, [insight, markReviewed])
  useEffect(() => {
    if (!focusId) return
    document.getElementById(`hl-${focusId}`)?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [focusId, source?.id])

  const pickInsight = (id: string | undefined) => {
    setTrace(null)
    if (!id || id === insight?.id) return go({ view: 'workspace', sourceId: source?.id })
    const cur = useStore.getState().project
    const i = cur.insights.find((x) => x.id === id)
    if (!i) return
    const list = orderedEvidence(cur, i)
    const here = list.find((e) => e.sourceId === source?.id)
    const first = here || list[0]
    go({ view: 'workspace', insightId: id, sourceId: first?.sourceId || source?.id, focusEvidenceId: first?.id })
  }
  const locateEv = (e: Evidence) => go({ ...nav, view: 'workspace', sourceId: e.sourceId, focusEvidenceId: e.id })
  const step = (dir: 1 | -1) => {
    if (!chain.length) return
    const idx = chain.findIndex((e) => e.id === focusId)
    const next = chain[(idx + dir + chain.length) % chain.length]
    locateEv(next)
  }
  const draft = () => {
    if (!settings.apiKey) return setNeedAI(true)
    const s = evidenceSufficiency(p)
    if (!s.enough) setInsufficient({ q: s.quotes, people: s.people })
    else ai.insights()
  }

  const markClass = (ev: Evidence) => {
    if (insight) {
      if (insight.supporting.includes(ev.id)) return 'hl-support'
      if (insight.counter.includes(ev.id)) return 'hl-counter'
      return 'hl-dim'
    }
    return ev.status === 'suggested' ? 'hl-draft' : 'hl'
  }

  const hitsIn = (sid: string) => insight ? {
    s: insight.supporting.filter((id) => p.evidence.find((e) => e.id === id)?.sourceId === sid).length,
    c: insight.counter.filter((id) => p.evidence.find((e) => e.id === id)?.sourceId === sid).length,
  } : null
  const h = source ? hitsIn(source.id) : null
  const chainIdx = chain.findIndex((e) => e.id === focusId)

  return (
    <>
      <StepGuide step="workspace" actions={<>
        <Button onClick={() => setManual(true)}><PenLine size={15} />{t.manual}</Button>
        <Button variant="primary" disabled={!!progress} onClick={draft}><Wand2 size={15} />{p.insights.length ? t.draftMore : t.draft}</Button>
      </>} />
      <RunBanner />
      <div className="grid gap-4 xl:h-[calc(100vh-150px)] xl:min-h-[560px] xl:grid-cols-[220px_minmax(0,1fr)_390px]">
        {/* left: sources and participants */}
        <aside aria-label={t.library} className="flex min-h-0 flex-col rounded-xl border border-line bg-white">
          <h2 className="border-b border-line px-4 py-3 text-[13px] font-semibold">{t.library}</h2>
          <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
            {p.sources.map((s) => {
              const hits = hitsIn(s.id)
              const dim = hits && !hits.s && !hits.c
              return (
                <li key={s.id}>
                  <button onClick={() => { setTrace(null); go({ ...nav, view: 'workspace', sourceId: s.id, focusEvidenceId: undefined }) }} aria-current={s.id === source?.id}
                    className={cx('flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left', s.id === source?.id ? 'bg-ink-soft' : 'hover:bg-paper', dim && 'opacity-50')}>
                    <span className="mt-0.5 text-muted"><SourceIcon type={s.type} size={13} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium" title={s.title}>{s.title}</span>
                      {s.participant && <span className="block truncate text-[11px] text-muted">{s.participant}</span>}
                      {hits ? (
                        <span className="mt-0.5 flex gap-1.5 text-[11px]">
                          {hits.s > 0 && <span className="rounded bg-mark/70 px-1 text-[#5C4A00]">{hits.s}</span>}
                          {hits.c > 0 && <span className="rounded bg-counter-soft px-1 text-counter">{hits.c}</span>}
                        </span>
                      ) : <span className="block text-[11px] text-muted">{T.sources.quotes(p.evidence.filter((e) => e.sourceId === s.id && e.status !== 'rejected').length)}</span>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        {/* middle: transcript with evidence highlighted */}
        <article className="flex min-h-0 flex-col rounded-xl border border-line bg-white">
          {source && (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[14px] font-semibold">{source.title}</h2>
                  <p className="text-xs text-muted">{T.type[source.type]}{source.participant ? ` · ${source.participant}` : ''}{h ? ` · ${t.hits(h.s, h.c)}` : ''}</p>
                </div>
                {source.url && <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-ink hover:underline">{T.sources.openOriginal}<ExternalLink size={11} /></a>}
                {insight && chain.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" aria-label={t.prev} onClick={() => step(-1)}><ChevronLeft size={14} /></Button>
                    <span className="text-xs tabular-nums text-muted">{t.ofN(Math.max(chainIdx + 1, 1), chain.length)}</span>
                    <Button size="sm" variant="ghost" aria-label={t.next} onClick={() => step(1)}><ChevronRight size={14} /></Button>
                  </div>
                )}
              </div>
              <SourceReader source={source} markClass={markClass} focusId={focusId}
                onMark={(ev) => { setTrace(ev.id); go({ ...nav, view: 'workspace', sourceId: source.id, focusEvidenceId: ev.id }) }}
                onAdded={(id) => { setTrace(id); go({ ...nav, view: 'workspace', sourceId: source.id, focusEvidenceId: id }) }}
                className="min-h-0 flex-1 overflow-y-auto px-6 py-5" />
            </>
          )}
        </article>

        {/* right: insights and decisions */}
        <aside aria-label={t.insights} className="flex min-h-0 flex-col rounded-xl border border-line bg-white">
          {traced ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <TraceCard e={traced} onBack={() => setTrace(null)} onPickInsight={(id) => pickInsight(id)} />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <h2 className="text-[13px] font-semibold">{t.insights} <span className="font-normal text-muted">{p.insights.length}</span></h2>
                {!insight && p.insights.length > 0 && <span className="text-[11px] text-muted">{t.pick}</span>}
              </div>
              <ul className="min-h-0 flex-1 overflow-y-auto">
                {!p.insights.length && (
                  <li className="p-5 text-center text-[13px] text-muted">
                    <p className="mb-3">{T.steps.workspace.guide}</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button onClick={() => setManual(true)}><PenLine size={14} />{t.manual}</Button>
                      <Button variant="primary" onClick={draft}><Wand2 size={14} />{t.draft}</Button>
                    </div>
                  </li>
                )}
                {insights.map((i) => {
                  const open = i.id === insight?.id
                  return (
                    <li key={i.id} className={cx('border-b border-line last:border-b-0', open && 'bg-paper/60')}>
                      <button onClick={() => pickInsight(i.id)} aria-expanded={open} className="w-full px-4 py-3 text-left">
                        <div className={cx('rounded-lg p-3', cardClass(i.status), open && 'shadow-[0_0_0_2px_var(--color-ink)]')}>
                          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                            <StatusChip status={i.status} origin={i.origin} />
                            <Flags i={i} />
                            {i.status === 'suggested' && !reviewed.includes(i.id) && <span className="text-[11px] text-muted">{t.notOpened}</span>}
                          </div>
                          <p className={cx('quote text-[15px] leading-snug', i.status === 'rejected' && 'line-through decoration-graphite/60')}>{i.statement}</p>
                        </div>
                      </button>
                      {open && <InsightDetail i={i} onLocate={locateEv} />}
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </aside>
      </div>
      {needAI && <NeedAIDialog onClose={() => setNeedAI(false)} onManual={() => setManual(true)} onConnect={() => ai.insights()} />}
      {manual && <ManualInsightDialog onClose={() => setManual(false)} onCreated={(id) => pickInsight(id)} />}
      {insufficient && <InsufficientDialog q={insufficient.q} people={insufficient.people} onAnyway={ai.insights} onClose={() => setInsufficient(null)} />}
    </>
  )
}
