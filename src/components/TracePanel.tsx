import { Layers, Lightbulb } from 'lucide-react'
import { usage, useStore } from '../store'
import type { Evidence } from '../types'
import { Button, StatusChip, cardClass } from './ui'

export function TracePanel({ evidence: e }: { evidence: Evidence }) {
  const { project: p, go, setEvidenceStatus } = useStore()
  const u = usage(p, e.id)
  const none = !u.themes.length && !u.supports.length && !u.challenges.length
  return (
    <div className="sticky top-4 space-y-4">
      <div className={`${cardClass(e.status)} rounded-xl p-4`}>
        <div className="mb-2"><StatusChip status={e.status} origin={e.origin} /></div>
        <p className="quote">“{e.quote}”</p>
        {e.rationale && <p className="mt-2 text-xs text-muted">AI reason: {e.rationale}</p>}
        {e.note && <p className="mt-1.5 text-xs text-ink">Your note: {e.note}</p>}
        {e.status === 'suggested' && (
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="primary" onClick={() => setEvidenceStatus(e.id, 'confirmed')}>Confirm</Button>
            <Button size="sm" onClick={() => setEvidenceStatus(e.id, 'rejected')}>Reject</Button>
          </div>
        )}
      </div>
      <div className="rounded-xl border border-line bg-white p-4">
        <h3 className="mb-3 text-[13px] font-semibold">Where this quote is used</h3>
        {none && <p className="text-xs text-muted">Not used in any theme or insight yet.</p>}
        {u.themes.length > 0 && (
          <ul className="mb-3 space-y-1.5">
            {u.themes.map((t) => (
              <li key={t.id}><button onClick={() => go({ view: 'themes' })} className="flex items-start gap-2 text-left text-[13px] hover:text-ink"><Layers size={14} className="mt-0.5 shrink-0 text-muted" />{t.name}</button></li>
            ))}
          </ul>
        )}
        {u.supports.map((i) => (
          <button key={i.id} onClick={() => go({ view: 'insights', insightId: i.id })} className="mb-1.5 flex w-full items-start gap-2 text-left text-[13px] hover:text-ink">
            <Lightbulb size={14} className="mt-0.5 shrink-0 text-ink" /><span><span className="text-xs text-ink">Supports · </span>{i.statement}</span>
          </button>
        ))}
        {u.challenges.map((i) => (
          <button key={i.id} onClick={() => go({ view: 'insights', insightId: i.id })} className="mb-1.5 flex w-full items-start gap-2 text-left text-[13px] hover:text-counter">
            <Lightbulb size={14} className="mt-0.5 shrink-0 text-counter" /><span><span className="text-xs text-counter">Challenges · </span>{i.statement}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
