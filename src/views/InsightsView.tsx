import { AlertTriangle, ArrowLeftRight, Check, Eye, PenLine, RotateCcw, Unlink, Wand2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { runInsights, useAIAction } from '../ai/useAI'
import { EvidenceCard } from '../components/EvidenceCard'
import { Button, Dialog, Empty, Field, PageHeader, StatusChip, cardClass, cx, inputCls } from '../components/ui'
import { coverage, useStore } from '../store'
import type { Evidence, Insight } from '../types'

function Coverage({ i }: { i: Insight }) {
  const p = useStore((s) => s.project)
  const c = coverage(p, i.supporting)
  const thin = c.totalPeople > 1 && c.people <= 1
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className="text-muted">
        Said by <b className="font-medium text-text">{c.people} of {c.totalPeople}</b> participants · {c.sources} {c.sources === 1 ? 'source' : 'sources'}
      </span>
      <span className="flex items-center gap-1" aria-hidden="true">
        {Array.from({ length: c.totalPeople }).map((_, k) => <span key={k} className={cx('h-1.5 w-3 rounded-full', k < c.people ? 'bg-ink' : 'bg-line')} />)}
      </span>
      {i.counter.length > 0 && <span className="text-counter">{i.counter.length} challenging</span>}
      {thin && <span className="inline-flex items-center gap-1 text-warn"><AlertTriangle size={12} />Single participant</span>}
    </div>
  )
}

function DecideDialog({ insight, mode, onClose }: { insight: Insight; mode: 'edit' | 'reject'; onClose: () => void }) {
  const { editInsight, setInsightStatus } = useStore()
  const [text, setText] = useState(insight.statement)
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const submit = () => {
    if (mode === 'edit' && !text.trim()) return setErr('The insight cannot be empty.')
    if (!reason.trim()) return setErr('Add a short reason. It is kept in the activity log so others can follow your decision.')
    if (mode === 'edit') editInsight(insight.id, text.trim(), reason.trim())
    else setInsightStatus(insight.id, 'rejected', reason.trim())
    onClose()
  }
  return (
    <Dialog title={mode === 'edit' ? 'Rewrite insight' : 'Reject insight'} onClose={onClose}>
      {mode === 'edit'
        ? <Field label="Insight"><textarea className={cx(inputCls, 'quote')} rows={3} value={text} onChange={(e) => { setText(e.target.value); setErr('') }} /></Field>
        : <p className="quote mb-4 rounded-md bg-paper p-3">{insight.statement}</p>}
      <Field label={mode === 'edit' ? 'Why did you change it?' : 'Why are you rejecting it?'}>
        <input className={inputCls} value={reason} onChange={(e) => { setReason(e.target.value); setErr('') }} placeholder={mode === 'edit' ? 'e.g. Too strong for 2 of 5 participants' : 'e.g. Contradicted by most mentions'} onKeyDown={(e) => e.key === 'Enter' && submit()} />
      </Field>
      {err && <p role="alert" className="mb-3 text-[13px] text-counter">{err}</p>}
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant={mode === 'edit' ? 'primary' : 'danger'} onClick={submit}>{mode === 'edit' ? 'Save insight' : 'Reject insight'}</Button>
      </div>
    </Dialog>
  )
}

function EvidenceList({ insight, ids, stance }: { insight: Insight; ids: string[]; stance: 'support' | 'counter' }) {
  const { project: p, flipStance, unlinkEvidence } = useStore()
  const list = ids.map((id) => p.evidence.find((e) => e.id === id)).filter(Boolean) as Evidence[]
  if (!list.length) {
    return <p className="rounded-lg border border-dashed border-line p-4 text-xs leading-relaxed text-muted">{stance === 'counter' ? 'No challenging evidence found. That can mean strong agreement, or that the data never tested the claim.' : 'No supporting evidence.'}</p>
  }
  return (
    <div className="space-y-2.5">
      {list.map((e) => (
        <div key={e.id}>
          <EvidenceCard e={e} compact tone={stance === 'counter' ? 'counter' : undefined} />
          {insight.status !== 'rejected' && (
            <div className="mt-1 flex gap-3 pl-1">
              <button onClick={() => flipStance(insight.id, e.id)} className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink"><ArrowLeftRight size={11} />{stance === 'support' ? 'Mark as challenging' : 'Mark as supporting'}</button>
              <button onClick={() => unlinkEvidence(insight.id, e.id)} className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-counter"><Unlink size={11} />Not relevant</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function InsightsView({ onNeedKey }: { onNeedKey: () => void }) {
  const { project: p, nav, go, reviewed, markReviewed, setInsightStatus, busy } = useStore()
  const act = useAIAction(onNeedKey)
  const [decide, setDecide] = useState<'edit' | 'reject' | null>(null)
  const order = { suggested: 0, edited: 1, confirmed: 1, rejected: 2 }
  const list = [...p.insights].sort((a, b) => order[a.status] - order[b.status])
  const open = p.insights.find((i) => i.id === nav.insightId)

  useEffect(() => { if (open) markReviewed(open.id) }, [open, markReviewed])

  if (!p.insights.length) {
    return (
      <>
        <PageHeader title="Insights" />
        <Empty title="No insights yet" body="Once you have themes, the AI can draft insights. Each one comes with the quotes that support it and the quotes that challenge it."
          action={<Button variant="primary" disabled={!!busy} onClick={() => act(runInsights, 'Insights drafted. Review the evidence before deciding.')}><Wand2 size={15} />Draft insights</Button>} />
      </>
    )
  }

  return (
    <>
      <PageHeader title="Insights" sub="An insight can only be confirmed after you have opened its evidence. Challenging quotes are always shown beside the supporting ones."
        actions={<Button variant="primary" disabled={!!busy} onClick={() => act(runInsights, 'New insight drafts added. Decided insights were kept.')}><Wand2 size={15} />Draft more insights</Button>} />
      <div className={cx('grid gap-5', open && 'xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]')}>
        <ul className="space-y-3">
          {list.map((i) => (
            <li key={i.id}>
              <button onClick={() => go({ view: 'insights', insightId: i.id })} aria-expanded={open?.id === i.id}
                className={cx('w-full rounded-xl p-4 text-left transition-shadow', cardClass(i.status), open?.id === i.id && 'shadow-[0_0_0_2px_var(--color-ink)]')}>
                <div className="mb-2 flex items-center gap-2">
                  <StatusChip status={i.status} origin={i.origin} />
                  {i.status === 'suggested' && !reviewed.includes(i.id) && <span className="text-[11px] text-muted">Evidence not opened yet</span>}
                </div>
                <p className={cx('quote text-[16px]', i.status === 'rejected' && 'line-through decoration-graphite/60')}>{i.statement}</p>
                <div className="mt-3"><Coverage i={i} /></div>
                {i.decisionNote && <p className="mt-2 text-xs text-ink">Decision note: {i.decisionNote}</p>}
              </button>
            </li>
          ))}
        </ul>

        {open && (
          <section aria-label="Evidence for this insight" className="xl:sticky xl:top-4 xl:self-start">
            <div className="rounded-xl border border-line bg-white">
              <div className="border-b border-line p-5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <StatusChip status={open.status} origin={open.origin} />
                  <button aria-label="Close evidence" onClick={() => go({ view: 'insights' })} className="rounded p-1 text-muted hover:bg-graphite-soft"><X size={16} /></button>
                </div>
                <p className="quote text-[18px] leading-snug">{open.statement}</p>
                <div className="mt-3"><Coverage i={open} /></div>
                {open.themeIds.length > 0 && (
                  <p className="mt-2 text-xs text-muted">From themes: {open.themeIds.map((t) => p.themes.find((x) => x.id === t)?.name).filter(Boolean).join('; ')}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {open.status === 'suggested' && <Button variant="primary" onClick={() => setInsightStatus(open.id, 'confirmed')}><Check size={14} />Confirm insight</Button>}
                  {open.status !== 'rejected' && <Button onClick={() => setDecide('edit')}><PenLine size={14} />Rewrite</Button>}
                  {open.status !== 'rejected' && <Button variant="danger" onClick={() => setDecide('reject')}><X size={14} />Reject</Button>}
                  {open.status !== 'suggested' && <Button variant="ghost" onClick={() => setInsightStatus(open.id, 'suggested')}><RotateCcw size={14} />Reopen</Button>}
                </div>
                {open.status === 'suggested' && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted"><Eye size={13} />You are looking at the evidence, so you can now confirm this insight.</p>
                )}
              </div>
              <div className="grid gap-5 p-5 md:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-[13px] font-semibold text-ink">Supports <span className="font-normal text-muted">{open.supporting.length}</span></h3>
                  <EvidenceList insight={open} ids={open.supporting} stance="support" />
                </div>
                <div>
                  <h3 className="mb-3 text-[13px] font-semibold text-counter">Challenges <span className="font-normal text-muted">{open.counter.length}</span></h3>
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
