import { AlertTriangle, ArrowRight, Pencil, Scale } from 'lucide-react'
import { coverage, useStore, useT } from '../store'
import type { Status, View } from '../types'
import { cx } from '../components/ui'

function Breakdown({ items }: { items: Status[] }) {
  const t = useT().overview
  const n = (s: Status[]) => items.filter((x) => s.includes(x)).length
  const decided = n(['confirmed', 'edited'])
  const draft = n(['suggested'])
  const rejected = n(['rejected'])
  const total = Math.max(items.length, 1)
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-graphite-soft" aria-hidden="true">
        <div className="bg-ink" style={{ width: `${(decided / total) * 100}%` }} />
        <div className="border-y border-r border-dashed border-graphite/70 bg-white" style={{ width: `${(draft / total) * 100}%` }} />
        <div className="bg-[#D5D8DE]" style={{ width: `${(rejected / total) * 100}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
        <span><b className="font-medium text-ink">{decided}</b> {t.decided}</span>
        <span><b className="font-medium text-text">{draft}</b> {t.aiDrafts}</span>
        {rejected > 0 && <span>{rejected} {t.rejected}</span>}
      </div>
    </div>
  )
}

export function OverviewView() {
  const { project: p, go } = useStore()
  const T = useT()
  const t = T.overview
  const stages: Array<{ view: View; label: string; count: number; desc: string; statuses?: Status[] }> = [
    { view: 'sources', label: T.nav.sources, count: p.sources.length, desc: t.srcDesc(p.sources.filter((s) => s.participant).length, p.sources.filter((s) => !s.participant).length) },
    { view: 'evidence', label: T.nav.evidence, count: p.evidence.length, desc: t.evDesc, statuses: p.evidence.map((e) => e.status) },
    { view: 'themes', label: T.nav.themes, count: p.themes.length, desc: t.thDesc, statuses: p.themes.map((t) => t.status) },
    { view: 'insights', label: T.nav.insights, count: p.insights.length, desc: t.inDesc, statuses: p.insights.map((i) => i.status) },
  ]

  const attention: Array<{ icon: typeof Pencil; text: string; go: () => void; tone: 'draft' | 'warn' | 'counter' }> = []
  const draftInsights = p.insights.filter((i) => i.status === 'suggested')
  if (draftInsights.length) attention.push({ icon: Pencil, tone: 'draft', text: t.draftInsights(draftInsights.length), go: () => go({ view: 'insights' }) })
  for (const i of p.insights.filter((x) => x.status !== 'rejected')) {
    const c = coverage(p, i.supporting)
    if (c.totalPeople > 1 && c.people <= 1) attention.push({ icon: AlertTriangle, tone: 'warn', text: t.single(i.statement), go: () => go({ view: 'insights', insightId: i.id }) })
    else if (i.counter.length >= i.supporting.length && i.counter.length > 0) attention.push({ icon: Scale, tone: 'counter', text: t.balanced(i.statement), go: () => go({ view: 'insights', insightId: i.id }) })
  }
  const draftEv = p.evidence.filter((e) => e.status === 'suggested').length
  if (draftEv) attention.push({ icon: Pencil, tone: 'draft', text: t.draftEv(draftEv), go: () => go({ view: 'evidence' }) })

  return (
    <div>
      <section className="mb-10">
        <p className="mb-2 text-[13px] text-muted">{p.isDemo ? t.demo : t.yours}</p>
        <h1 className="max-w-3xl text-[28px] leading-[1.2] font-semibold tracking-[-0.015em]">{p.question || p.name}</h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted">
          {t.intro}
        </p>
      </section>

      <section aria-label={t.chain} className="mb-10 grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-stretch">
        {stages.map((s, idx) => (
          <div key={s.view} className="contents">
            <button onClick={() => go({ view: s.view })} className="group flex flex-col rounded-xl border border-line bg-white p-5 text-left transition-colors hover:border-ink/40">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-medium text-muted group-hover:text-ink">{s.label}</span>
                <span className="text-[30px] leading-none font-semibold tabular-nums">{s.count}</span>
              </div>
              <p className="mt-1 mb-4 text-xs text-muted">{s.desc}</p>
              {s.statuses ? <Breakdown items={s.statuses} /> : (
                <ul className="space-y-1 text-xs text-muted">
                  {p.sources.slice(0, 3).map((x) => <li key={x.id} className="truncate">{x.participant || x.title}</li>)}
                  {p.sources.length > 3 && <li>{t.more(p.sources.length - 3)}</li>}
                </ul>
              )}
            </button>
            {idx < stages.length - 1 && (
              <div className="hidden items-center justify-center text-graphite lg:flex" aria-hidden="true"><ArrowRight size={18} /></div>
            )}
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="mb-3 text-[15px] font-semibold">{t.attention}</h2>
          {attention.length === 0 ? (
            <p className="rounded-lg border border-line bg-white p-4 text-[13px] text-muted">{t.nothing}</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
              {attention.slice(0, 7).map((a, k) => (
                <li key={k}>
                  <button onClick={a.go} className="flex w-full items-start gap-3 px-4 py-3 text-left text-[13px] hover:bg-paper">
                    <a.icon size={15} className={cx('mt-0.5 shrink-0', a.tone === 'warn' ? 'text-warn' : a.tone === 'counter' ? 'text-counter' : 'text-graphite')} />
                    <span className="leading-snug">{a.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="mb-3 text-[15px] font-semibold">{t.marks}</h2>
          <dl className="space-y-3 rounded-xl border border-line bg-white p-4 text-[13px]">
            <div className="flex gap-3"><dt className="pencil h-9 w-12 shrink-0 rounded" /><dd className="leading-snug text-muted"><b className="font-medium text-text">{t.pencilT}</b>{t.pencil}</dd></div>
            <div className="flex gap-3"><dt className="ink h-9 w-12 shrink-0 rounded" /><dd className="leading-snug text-muted"><b className="font-medium text-text">{t.inkT}</b>{t.ink}</dd></div>
            <div className="flex gap-3"><dt className="h-9 w-12 shrink-0 rounded border border-counter/30 bg-counter-soft" /><dd className="leading-snug text-muted"><b className="font-medium text-counter">{t.redT}</b>{t.red}</dd></div>
            <div className="flex gap-3"><dt className="flex h-9 w-12 shrink-0 items-center justify-center rounded border border-line"><mark className="hl px-1 text-xs">{t.hlSample}</mark></dt><dd className="leading-snug text-muted"><b className="font-medium text-text">{t.hlT}</b>{t.hl}</dd></div>
          </dl>
        </div>
      </section>
    </div>
  )
}
