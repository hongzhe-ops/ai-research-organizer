import { Check, MessageSquarePlus, RotateCcw, X } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../store'
import type { Evidence } from '../types'
import { Button, StatusChip, cardClass, cx, inputCls } from './ui'

/** A quote with its provenance. `compact` is used on the theme board and inside insight drawers. */
export function EvidenceCard({ e, compact, actions = true, tone }: { e: Evidence; compact?: boolean; actions?: boolean; tone?: 'counter' }) {
  const { project: p, go, setEvidenceStatus, setEvidenceNote } = useStore()
  const [noting, setNoting] = useState(false)
  const [note, setNote] = useState(e.note || '')
  const src = p.sources.find((s) => s.id === e.sourceId)

  return (
    <div className={cx('rounded-lg', tone === 'counter' ? 'border border-counter/25 border-l-[3px] border-l-counter bg-counter-soft/50' : cardClass(e.status), compact ? 'p-3' : 'p-4')}>
      <p className={cx('quote', compact && 'text-[14px]')}>“{e.quote}”</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <button onClick={() => go({ view: 'sources', sourceId: e.sourceId, focusEvidenceId: e.id })}
          className="text-left text-xs text-muted underline decoration-line underline-offset-2 hover:text-ink hover:decoration-ink" title="Open in source">
          {src?.participant || src?.title}
        </button>
        {!compact && <StatusChip status={e.status} origin={e.origin} />}
      </div>
      {!compact && e.rationale && <p className="mt-2 text-xs text-muted">AI reason: {e.rationale}</p>}
      {!compact && e.note && !noting && <p className="mt-1 text-xs text-ink">Your note: {e.note}</p>}
      {noting && (
        <div className="mt-2 flex gap-2">
          <input autoFocus className={inputCls} value={note} onChange={(x) => setNote(x.target.value)} placeholder="Why this matters, or what to watch out for"
            onKeyDown={(x) => { if (x.key === 'Enter') { setEvidenceNote(e.id, note.trim()); setNoting(false) } }} />
          <Button size="sm" variant="primary" onClick={() => { setEvidenceNote(e.id, note.trim()); setNoting(false) }}>Save</Button>
        </div>
      )}
      {actions && !compact && !noting && (
        <div className="mt-3 flex flex-wrap gap-2">
          {e.status === 'suggested' && <Button size="sm" variant="primary" onClick={() => setEvidenceStatus(e.id, 'confirmed')}><Check size={13} />Confirm</Button>}
          {e.status !== 'rejected' && <Button size="sm" onClick={() => setNoting(true)}><MessageSquarePlus size={13} />{e.note ? 'Edit note' : 'Add note'}</Button>}
          {e.status !== 'rejected' && <Button size="sm" variant="ghost" onClick={() => setEvidenceStatus(e.id, 'rejected')}><X size={13} />Reject</Button>}
          {e.status === 'rejected' && <Button size="sm" variant="ghost" onClick={() => setEvidenceStatus(e.id, 'suggested')}><RotateCcw size={13} />Reopen</Button>}
        </div>
      )}
    </div>
  )
}
