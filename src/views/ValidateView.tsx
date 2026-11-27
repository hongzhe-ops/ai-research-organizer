import { AlertTriangle, CheckCircle2, Pencil, Scale, Signature } from 'lucide-react'
import { useState } from 'react'
import { StepGuide } from '../components/Flow'
import { Button, cx } from '../components/ui'
import { flags, useStore, useT } from '../store'
import type { Insight, LogEntry, Origin } from '../types'

function Queue({ title, icon: Icon, tone, items }: { title: string; icon: typeof Pencil; tone: string; items: Insight[] }) {
  const { go } = useStore()
  const t = useT().validate
  if (!items.length) return null
  return (
    <section className="rounded-xl border border-line bg-white">
      <h2 className={cx('flex items-center gap-2 border-b border-line px-4 py-3 text-[13px] font-semibold', tone)}><Icon size={15} />{title} <span className="font-normal text-muted">{items.length}</span></h2>
      <ul className="divide-y divide-line">
        {items.map((i) => (
          <li key={i.id} className="flex items-start gap-3 px-4 py-3">
            <p className="quote flex-1 text-[14.5px] leading-snug">{i.statement}{i.needsReview && <span className="mt-1 block font-sans text-xs text-warn">{i.needsReview}</span>}</p>
            <Button size="sm" variant="outline" onClick={() => go({ view: 'workspace', insightId: i.id })}>{t.open}</Button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function ValidateView() {
  const { project: p, go } = useStore()
  const T = useT()
  const t = T.validate
  const [who, setWho] = useState<Origin | 'all'>('all')
  const fmt = new Intl.DateTimeFormat(T.date, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  const live = p.insights.filter((i) => i.status !== 'rejected')
  const drafts = live.filter((i) => i.status === 'suggested' && !i.needsReview)
  const affected = live.filter((i) => i.needsReview)
  const single = live.filter((i) => i.status !== 'suggested' && !i.needsReview && flags(p, i).single)
  const split = live.filter((i) => i.status !== 'suggested' && !i.needsReview && !flags(p, i).single && flags(p, i).disagreement)
  const evDrafts = p.evidence.filter((e) => e.status === 'suggested').length
  const thDrafts = p.themes.filter((x) => x.status === 'suggested').length
  const clear = !drafts.length && !affected.length && !evDrafts && !thDrafts

  const log = p.log.filter((l) => who === 'all' || l.actor === who)
  const open = (target?: LogEntry['target']) => {
    if (!target) return
    if (target.kind === 'insight') go({ view: 'workspace', insightId: target.id })
    else if (target.kind === 'theme') go({ view: 'themes' })
    else if (target.kind === 'source') go({ view: 'workspace', sourceId: target.id })
    else {
      const e = p.evidence.find((x) => x.id === target.id)
      if (e) go({ view: 'workspace', sourceId: e.sourceId, focusEvidenceId: e.id })
    }
  }

  return (
    <>
      <StepGuide step="validate" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {clear && (
            <div className="flex gap-3 rounded-xl border border-line bg-white p-5">
              <CheckCircle2 size={20} className="shrink-0 text-ink" />
              <div><p className="text-[14px] font-semibold">{t.clearT}</p><p className="mt-1 text-[13px] text-muted">{t.clearB}</p>
                <Button className="mt-3" variant="primary" size="sm" onClick={() => go({ view: 'export' })}>06 {T.steps.export.label}</Button></div>
            </div>
          )}
          <Queue title={t.needsReview} icon={AlertTriangle} tone="text-warn" items={affected} />
          <Queue title={t.drafts} icon={Pencil} tone="text-graphite" items={drafts} />
          <Queue title={t.single} icon={AlertTriangle} tone="text-warn" items={single} />
          <Queue title={t.disagreement} icon={Scale} tone="text-counter" items={split} />
          {(evDrafts > 0 || thDrafts > 0) && (
            <div className="flex flex-wrap gap-2 text-[13px]">
              {evDrafts > 0 && <button onClick={() => go({ view: 'evidence' })} className="rounded-full border border-dashed border-graphite/60 bg-white px-3 py-1 text-graphite hover:text-ink">{t.evDrafts(evDrafts)}</button>}
              {thDrafts > 0 && <button onClick={() => go({ view: 'themes' })} className="rounded-full border border-dashed border-graphite/60 bg-white px-3 py-1 text-graphite hover:text-ink">{t.thDrafts(thDrafts)}</button>}
            </div>
          )}
        </div>

        <section>
          <h2 className="text-[15px] font-semibold">{t.log}</h2>
          <p className="mt-1 mb-3 text-xs text-muted">{t.logSub}</p>
          <div className="mb-4 flex gap-1.5">
            {([['all', t.all], ['ai', t.ai], ['researcher', t.you]] as const).map(([id, label]) => (
              <button key={id} onClick={() => setWho(id)} className={cx('rounded-full border px-3 py-1 text-[13px]', who === id ? 'border-ink bg-ink text-white' : 'border-line bg-white text-muted')}>{label}</button>
            ))}
          </div>
          {!log.length ? <p className="text-[13px] text-muted">{t.emptyT}</p> : (
            <ol className="relative border-l border-line pl-6">
              {log.slice(0, 80).map((l) => (
                <li key={l.id} className="relative mb-4">
                  <span className={cx('absolute top-0.5 -left-[35px] flex h-[22px] w-[22px] items-center justify-center rounded-full', l.actor === 'ai' ? 'border border-dashed border-graphite bg-white text-graphite' : 'bg-ink text-white')}>
                    {l.actor === 'ai' ? <Pencil size={11} /> : <Signature size={11} />}
                  </span>
                  <div className="text-xs text-muted">{l.actor === 'ai' ? t.ai : t.you} · {fmt.format(l.at)}</div>
                  {l.target ? <button onClick={() => open(l.target)} className="text-left text-[13px] leading-snug hover:text-ink hover:underline">{l.text}</button> : <p className="text-[13px] leading-snug">{l.text}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  )
}
