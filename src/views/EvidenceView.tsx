import { useState } from 'react'
import { EvidenceCard } from '../components/EvidenceCard'
import { Empty, PageHeader, SourceIcon, cx } from '../components/ui'
import { useStore } from '../store'
import type { Status } from '../types'

type Filter = 'review' | 'decided' | 'rejected' | 'all'
const FILTERS: Array<{ id: Filter; label: string; match: (s: Status) => boolean }> = [
  { id: 'review', label: 'To review', match: (s) => s === 'suggested' },
  { id: 'decided', label: 'Decided', match: (s) => s === 'confirmed' || s === 'edited' },
  { id: 'rejected', label: 'Rejected', match: (s) => s === 'rejected' },
  { id: 'all', label: 'All', match: () => true },
]

export function EvidenceView() {
  const { project: p, go } = useStore()
  const toReview = p.evidence.filter((e) => e.status === 'suggested').length
  const [filter, setFilter] = useState<Filter>(toReview ? 'review' : 'all')
  const f = FILTERS.find((x) => x.id === filter)!

  return (
    <>
      <PageHeader title="Evidence" sub="Every quote is checked word for word against its source before it appears here. Confirm what is meaningful, reject what is not, and add notes in your own words." />
      <div role="tablist" className="mb-5 flex flex-wrap gap-1.5">
        {FILTERS.map((x) => {
          const n = p.evidence.filter((e) => x.match(e.status)).length
          return (
            <button key={x.id} role="tab" aria-selected={filter === x.id} onClick={() => setFilter(x.id)}
              className={cx('rounded-full border px-3 py-1 text-[13px]', filter === x.id ? 'border-ink bg-ink text-white' : 'border-line bg-white text-muted hover:text-text')}>
              {x.label} <span className="tabular-nums opacity-70">{n}</span>
            </button>
          )
        })}
      </div>

      {p.evidence.filter((e) => f.match(e.status)).length === 0 ? (
        <Empty title={filter === 'review' ? 'All quotes reviewed' : 'No quotes here'}
          body={filter === 'review' ? 'There are no AI drafts waiting. Move on to themes, or extract evidence from a new source.' : 'Extract evidence from a source, or select text in a source to add it yourself.'} />
      ) : (
        <div className="space-y-8">
          {p.sources.map((s) => {
            const list = p.evidence.filter((e) => e.sourceId === s.id && f.match(e.status))
            if (!list.length) return null
            return (
              <section key={s.id}>
                <button onClick={() => go({ view: 'sources', sourceId: s.id })} className="mb-3 flex items-center gap-2 text-[13px] font-semibold hover:text-ink">
                  <SourceIcon type={s.type} /> {s.participant || s.title}
                  <span className="font-normal text-muted">{list.length}</span>
                </button>
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
