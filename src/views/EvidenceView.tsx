import { BookOpenText, CheckCheck, ShieldX } from 'lucide-react'
import { useState } from 'react'
import { EvidenceCard } from '../components/EvidenceCard'
import { StepGuide } from '../components/Flow'
import { ReaderDialog } from '../components/ReaderDialog'
import { Button, Empty, SourceIcon, cx } from '../components/ui'
import { useStore, useT } from '../store'
import type { Status } from '../types'

type Filter = 'review' | 'decided' | 'rejected' | 'all'
const FILTERS: Array<{ id: Filter; match: (s: Status) => boolean }> = [
  { id: 'review', match: (s) => s === 'suggested' },
  { id: 'decided', match: (s) => s === 'confirmed' || s === 'edited' },
  { id: 'rejected', match: (s) => s === 'rejected' },
  { id: 'all', match: () => true },
]

function Intercepted() {
  const p = useStore((s) => s.project)
  const t = useT().evidence
  const [open, setOpen] = useState(false)
  if (!p.intercepted.length) return null
  return (
    <section className="mb-6 rounded-xl border border-counter/25 bg-white">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-start gap-3 p-4 text-left">
        <ShieldX size={18} className="mt-0.5 shrink-0 text-counter" />
        <span className="flex-1">
          <span className="block text-[13px] font-semibold">{t.interceptedT} <span className="font-normal text-muted">{p.intercepted.length}</span></span>
          <span className="mt-0.5 block text-[13px] text-muted">{t.interceptedB(p.intercepted.length)}</span>
        </span>
        <span className="text-xs text-ink">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <ul className="space-y-2 border-t border-line p-4">
          {p.intercepted.map((x) => {
            const s = p.sources.find((y) => y.id === x.sourceId)
            return (
              <li key={x.id} className="rounded-lg bg-counter-soft/60 p-3">
                <p className="quote text-[14px] text-muted line-through decoration-counter/50">“{x.quote}”</p>
                <p className="mt-1 text-xs text-counter">{t.interceptedReason} · {s?.participant || s?.title}</p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export function EvidenceView() {
  const { project: p, confirmAllInSource } = useStore()
  const T = useT()
  const t = T.evidence
  const [reading, setReading] = useState<string | null>(null)
  const toReview = p.evidence.filter((e) => e.status === 'suggested').length
  const [filter, setFilter] = useState<Filter>(toReview ? 'review' : 'all')
  const f = FILTERS.find((x) => x.id === filter)!

  return (
    <>
      <StepGuide step="evidence" />
      {reading && <ReaderDialog sourceId={reading} onClose={() => setReading(null)} />}
      {p.sources.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white px-4 py-3">
          <span className="mr-1 inline-flex items-center gap-1.5 text-[13px] font-medium"><BookOpenText size={14} />{T.reader.open}</span>
          {p.sources.map((s) => (
            <button key={s.id} onClick={() => setReading(s.id)} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[13px] hover:border-ink hover:text-ink">
              <SourceIcon type={s.type} size={12} />{s.title}
            </button>
          ))}
        </div>
      )}
      <Intercepted />
      <div role="tablist" className="mb-5 flex flex-wrap gap-1.5">
        {FILTERS.map((x) => (
          <button key={x.id} role="tab" aria-selected={filter === x.id} onClick={() => setFilter(x.id)}
            className={cx('rounded-full border px-3 py-1 text-[13px]', filter === x.id ? 'border-ink bg-ink text-white' : 'border-line bg-white text-muted hover:text-text')}>
            {t[x.id]} <span className="tabular-nums opacity-70">{p.evidence.filter((e) => x.match(e.status)).length}</span>
          </button>
        ))}
      </div>

      {p.evidence.filter((e) => f.match(e.status)).length === 0 ? (
        <Empty title={filter === 'review' ? t.allDoneT : t.noneT} body={filter === 'review' ? t.allDoneB : t.noneB}
 />
      ) : (
        <div className="space-y-8">
          {p.sources.map((s) => {
            const list = p.evidence.filter((e) => e.sourceId === s.id && f.match(e.status))
            if (!list.length) return null
            const drafts = list.filter((e) => e.status === 'suggested').length
            return (
              <section key={s.id}>
                <div className="mb-3 flex items-center gap-3">
                  <button onClick={() => setReading(s.id)} className="flex items-center gap-2 text-left text-[13px] font-semibold hover:text-ink">
                    <SourceIcon type={s.type} /> {s.title}{s.participant && <span className="font-normal text-muted">{s.participant}</span>} <span className="font-normal text-muted">{list.length}</span>
                  </button>
                  <Button size="sm" variant="ghost" onClick={() => setReading(s.id)}><BookOpenText size={13} />{T.reader.open}</Button>
                  {drafts > 1 && <Button size="sm" variant="ghost" className="ml-auto" onClick={() => confirmAllInSource(s.id)}><CheckCheck size={14} />{t.confirmAll(drafts)}</Button>}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {list.map((e) => <EvidenceCard key={e.id} e={e} />)}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </>
  )
}
