import { AlertTriangle, ArrowLeftRight, Check, Eye, PenLine, RotateCcw, Unlink, Wand2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { runInsights, useAIAction } from '../ai/useAI'
import { EvidenceCard } from '../components/EvidenceCard'
import { Button, Dialog, Empty, Field, PageHeader, StatusChip, cardClass, cx, inputCls } from '../components/ui'
import { coverage, useStore, useT } from '../store'
import type { Evidence, Insight } from '../types'

function Coverage({ i }: { i: Insight }) {
  const p = useStore((s) => s.project)
  const t = useT().insights
  const c = coverage(p, i.supporting)
  const thin = c.totalPeople > 1 && c.people <= 1
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className="text-muted">
        {t.saidBy} <b className="font-medium text-text">{t.participants(c.people, c.totalPeople)}</b>{t.partWord && ` ${t.partWord}`} · {t.sources(c.sources)}
      </span>
      <span className="flex items-center gap-1" aria-hidden="true">
        {Array.from({ length: c.totalPeople }).map((_, k) => <span key={k} className={cx('h-1.5 w-3 rounded-full', k < c.people ? 'bg-ink' : 'bg-line')} />)}
      </span>
      {i.counter.length > 0 && <span className="text-counter">{t.challenging(i.counter.length)}</span>}
      {thin && <span className="inline-flex items-center gap-1 text-warn"><AlertTriangle size={12} />{t.single}</span>}
    </div>
  )
}

function DecideDialog({ insight, mode, onClose }: { insight: Insight; mode: 'edit' | 'reject'; onClose: () => void }) {
  const { editInsight, setInsightStatus } = useStore()
  const T = useT()
  const t = T.insights
  const [text, setText] = useState(insight.statement)
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const submit = () => {
    if (mode === 'edit' && !text.trim()) return setErr(t.errEmpty)
    if (!reason.trim()) return setErr(t.errReason)
    if (mode === 'edit') editInsight(insight.id, text.trim(), reason.trim())
    else setInsightStatus(insight.id, 'rejected', reason.trim())
    onClose()
  }
  return (
    <Dialog title={mode === 'edit' ? t.rewriteT : t.rejectT} onClose={onClose}>
      {mode === 'edit'
        ? <Field label={t.field}><textarea className={cx(inputCls, 'quote')} rows={3} value={text} onChange={(e) => { setText(e.target.value); setErr('') }} /></Field>
        : <p className="quote mb-4 rounded-md bg-paper p-3">{insight.statement}</p>}
      <Field label={mode === 'edit' ? t.whyEdit : t.whyReject}>
        <input className={inputCls} value={reason} onChange={(e) => { setReason(e.target.value); setErr('') }} placeholder={mode === 'edit' ? t.phEdit : t.phReject} onKeyDown={(e) => e.key === 'Enter' && submit()} />
      </Field>
      {err && <p role="alert" className="mb-3 text-[13px] text-counter">{err}</p>}
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>{T.common.cancel}</Button>
        <Button variant={mode === 'edit' ? 'primary' : 'danger'} onClick={submit}>{mode === 'edit' ? t.saveInsight : t.rejectInsight}</Button>
      </div>
    </Dialog>
  )
}

function EvidenceList({ insight, ids, stance }: { insight: Insight; ids: string[]; stance: 'support' | 'counter' }) {
  const { project: p, flipStance, unlinkEvidence } = useStore()
  const t = useT().insights
  const list = ids.map((id) => p.evidence.find((e) => e.id === id)).filter(Boolean) as Evidence[]
  if (!list.length) {
    return <p className="rounded-lg border border-dashed border-line p-4 text-xs leading-relaxed text-muted">{stance === 'counter' ? t.noCounter : t.noSupport}</p>
  }
  return (
    <div className="space-y-2.5">
      {list.map((e) => (
        <div key={e.id}>
          <EvidenceCard e={e} compact tone={stance === 'counter' ? 'counter' : undefined} />
          {insight.status !== 'rejected' && (
            <div className="mt-1 flex gap-3 pl-1">
              <button onClick={() => flipStance(insight.id, e.id)} className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink"><ArrowLeftRight size={11} />{stance === 'support' ? t.markCh : t.markSup}</button>
              <button onClick={() => unlinkEvidence(insight.id, e.id)} className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-counter"><Unlink size={11} />{t.notRelevant}</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function InsightsView({ onNeedKey }: { onNeedKey: () => void }) {
  const { project: p, nav, go, reviewed, markReviewed, setInsightStatus, busy } = useStore()
  const T = useT()
  const t = T.insights
  const act = useAIAction(onNeedKey)
  const [decide, setDecide] = useState<'edit' | 'reject' | null>(null)
  const order = { suggested: 0, edited: 1, confirmed: 1, rejected: 2 }
  const list = [...p.insights].sort((a, b) => order[a.status] - order[b.status])
  const open = p.insights.find((i) => i.id === nav.insightId)

  useEffect(() => { if (open) markReviewed(open.id) }, [open, markReviewed])

  if (!p.insights.length) {
    return (
      <>
        <PageHeader title={t.title} />
        <Empty title={t.emptyT} body={t.emptyB}
          action={<Button variant="primary" disabled={!!busy} onClick={() => act(runInsights, t.draftDone)}><Wand2 size={15} />{t.draft}</Button>} />
      </>
    )
  }

  return (
    <>
      <PageHeader title={t.title} sub={t.sub}
        actions={<Button variant="primary" disabled={!!busy} onClick={() => act(runInsights, t.draftMoreDone)}><Wand2 size={15} />{t.draftMore}</Button>} />
      <div className={cx('grid gap-5', open && 'xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]')}>
        <ul className="space-y-3">
          {list.map((i) => (
            <li key={i.id}>
              <button onClick={() => go({ view: 'insights', insightId: i.id })} aria-expanded={open?.id === i.id}
                className={cx('w-full rounded-xl p-4 text-left transition-shadow', cardClass(i.status), open?.id === i.id && 'shadow-[0_0_0_2px_var(--color-ink)]')}>
                <div className="mb-2 flex items-center gap-2">
                  <StatusChip status={i.status} origin={i.origin} />
                  {i.status === 'suggested' && !reviewed.includes(i.id) && <span className="text-[11px] text-muted">{t.notOpened}</span>}
                </div>
                <p className={cx('quote text-[16px]', i.status === 'rejected' && 'line-through decoration-graphite/60')}>{i.statement}</p>
                <div className="mt-3"><Coverage i={i} /></div>
                {i.decisionNote && <p className="mt-2 text-xs text-ink">{t.decisionNote}{T.common.colon}{i.decisionNote}</p>}
              </button>
            </li>
          ))}
        </ul>

        {open && (
          <section aria-label={t.panel} className="xl:sticky xl:top-4 xl:self-start">
            <div className="rounded-xl border border-line bg-white">
              <div className="border-b border-line p-5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <StatusChip status={open.status} origin={open.origin} />
                  <button aria-label={t.closePanel} onClick={() => go({ view: 'insights' })} className="rounded p-1 text-muted hover:bg-graphite-soft"><X size={16} /></button>
                </div>
                <p className="quote text-[18px] leading-snug">{open.statement}</p>
                <div className="mt-3"><Coverage i={open} /></div>
                {open.themeIds.length > 0 && (
                  <p className="mt-2 text-xs text-muted">{t.fromThemes}{T.common.colon}{open.themeIds.map((t) => p.themes.find((x) => x.id === t)?.name).filter(Boolean).join('; ')}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {open.status === 'suggested' && <Button variant="primary" onClick={() => setInsightStatus(open.id, 'confirmed')}><Check size={14} />{t.confirm}</Button>}
                  {open.status !== 'rejected' && <Button onClick={() => setDecide('edit')}><PenLine size={14} />{t.rewrite}</Button>}
                  {open.status !== 'rejected' && <Button variant="danger" onClick={() => setDecide('reject')}><X size={14} />{T.common.reject}</Button>}
                  {open.status !== 'suggested' && <Button variant="ghost" onClick={() => setInsightStatus(open.id, 'suggested')}><RotateCcw size={14} />{T.common.reopen}</Button>}
                </div>
                {open.status === 'suggested' && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted"><Eye size={13} />{t.canConfirm}</p>
                )}
              </div>
              <div className="grid gap-5 p-5 md:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-[13px] font-semibold text-ink">{t.supports} <span className="font-normal text-muted">{open.supporting.length}</span></h3>
                  <EvidenceList insight={open} ids={open.supporting} stance="support" />
                </div>
                <div>
                  <h3 className="mb-3 text-[13px] font-semibold text-counter">{t.challenges} <span className="font-normal text-muted">{open.counter.length}</span></h3>
                  <EvidenceList insight={open} ids={open.counter} stance="counter" />
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
      {open && decide && <DecideDialog insight={open} mode={decide} onClose={() => setDecide(null)} />}
    </>
  )
}
