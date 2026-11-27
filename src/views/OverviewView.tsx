import { ArrowRight } from 'lucide-react'
import { Button } from '../components/ui'
import { STEPS, stepDone, typeSummary, useStore, useT } from '../store'
import type { Status, View } from '../types'

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
    { view: 'sources', label: T.steps.sources.label, count: p.sources.length, desc: t.srcDesc(typeSummary(p, p.sources.map((s) => s.id), T)) },
    { view: 'evidence', label: T.steps.evidence.label, count: p.evidence.length, desc: t.evDesc, statuses: p.evidence.map((e) => e.status) },
    { view: 'themes', label: T.steps.themes.label, count: p.themes.length, desc: t.thDesc, statuses: p.themes.map((x) => x.status) },
    { view: 'workspace', label: T.steps.workspace.label, count: p.insights.length, desc: t.inDesc, statuses: p.insights.map((i) => i.status) },
  ]
  const nextIdx = Math.max(0, STEPS.findIndex((s) => !stepDone(p, s)))
  const next = STEPS[nextIdx]

  return (
    <div>
      <section className="mb-9 grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-end">
        <div>
          <p className="mb-3 text-[13px] text-muted">{t.kicker}</p>
          <h1 className="max-w-2xl text-[32px] leading-[1.15] font-semibold tracking-[-0.02em]">{t.headline}</h1>
          <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-muted">{t.intro}</p>
        </div>
        <div className="rounded-xl bg-ink p-5 text-white">
          <p className="text-xs text-white/70">{t.nextT}</p>
          <p className="mt-1 text-[18px] font-semibold"><span className="tabular-nums text-white/60">0{nextIdx + 1}</span> {T.steps[next].label}</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-white/80">{T.steps[next].guide}</p>
          <Button className="mt-4 bg-white text-ink hover:bg-ink-soft" onClick={() => go({ view: next })}>{t.nextGo} <ArrowRight size={14} /></Button>
        </div>
      </section>

      <section aria-label={t.chain} className="mb-9">
        <div className="mb-3 flex items-baseline gap-3">
          <h2 className="text-[15px] font-semibold">{t.study}</h2>
          <p className="truncate text-[13px] text-muted">{p.question || p.name}</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-stretch">
          {stages.map((s, idx) => (
            <div key={s.view} className="contents">
              <button onClick={() => go({ view: s.view })} className="group flex flex-col rounded-xl border border-line bg-white p-5 text-left transition-colors hover:border-ink/40">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-medium text-muted group-hover:text-ink"><span className="tabular-nums">0{idx + 1}</span> {s.label}</span>
                  <span className="text-[30px] leading-none font-semibold tabular-nums">{s.count}</span>
                </div>
                <p className="mt-1 mb-4 text-xs text-muted">{s.desc}</p>
                {s.statuses ? <Breakdown items={s.statuses} /> : (
                  <ul className="space-y-1 text-xs text-muted">
                    {p.sources.slice(0, 3).map((x) => <li key={x.id} className="truncate">{x.title}</li>)}
                    {p.sources.length > 3 && <li>{t.more(p.sources.length - 3)}</li>}
                  </ul>
                )}
              </button>
              {idx < stages.length - 1 && <div className="hidden items-center justify-center text-graphite lg:flex" aria-hidden="true"><ArrowRight size={18} /></div>}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[15px] font-semibold">{t.marks}</h2>
        <dl className="grid gap-3 rounded-xl border border-line bg-white p-4 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex gap-3"><dt className="pencil h-9 w-12 shrink-0 rounded" /><dd className="leading-snug text-muted"><b className="font-medium text-text">{t.pencilT}</b>{t.pencil}</dd></div>
          <div className="flex gap-3"><dt className="ink h-9 w-12 shrink-0 rounded" /><dd className="leading-snug text-muted"><b className="font-medium text-text">{t.inkT}</b>{t.ink}</dd></div>
          <div className="flex gap-3"><dt className="h-9 w-12 shrink-0 rounded border border-counter/30 bg-counter-soft" /><dd className="leading-snug text-muted"><b className="font-medium text-counter">{t.redT}</b>{t.red}</dd></div>
          <div className="flex gap-3"><dt className="flex h-9 w-12 shrink-0 items-center justify-center rounded border border-line"><mark className="hl px-1 text-xs">{t.hlSample}</mark></dt><dd className="leading-snug text-muted"><b className="font-medium text-text">{t.hlT}</b>{t.hl}</dd></div>
        </dl>
      </section>
    </div>
  )
}
