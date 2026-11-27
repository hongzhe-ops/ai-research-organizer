import { Pencil, Signature } from 'lucide-react'
import { useState } from 'react'
import { Empty, PageHeader, cx } from '../components/ui'
import { useStore, useT } from '../store'
import type { LogEntry, Origin } from '../types'


export function ActivityView() {
  const { project: p, go } = useStore()
  const T = useT()
  const t = T.activity
  const fmt = new Intl.DateTimeFormat(T.date, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  const [who, setWho] = useState<Origin | 'all'>('all')
  const list = p.log.filter((l) => who === 'all' || l.actor === who)
  const open = (t?: LogEntry['target']) => {
    if (!t) return
    if (t.kind === 'insight') go({ view: 'insights', insightId: t.id })
    else if (t.kind === 'theme') go({ view: 'themes' })
    else if (t.kind === 'source') go({ view: 'sources', sourceId: t.id })
    else {
      const e = p.evidence.find((x) => x.id === t.id)
      if (e) go({ view: 'sources', sourceId: e.sourceId, focusEvidenceId: e.id })
    }
  }
  return (
    <>
      <PageHeader title={t.title} sub={t.sub} />
      <div className="mb-5 flex gap-1.5">
        {([['all', t.all], ['ai', t.ai], ['researcher', t.you]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setWho(id)} className={cx('rounded-full border px-3 py-1 text-[13px]', who === id ? 'border-ink bg-ink text-white' : 'border-line bg-white text-muted')}>{label}</button>
        ))}
      </div>
      {!list.length ? <Empty title={t.emptyT} body={t.emptyB} /> : (
        <ol className="relative max-w-3xl border-l border-line pl-6">
          {list.map((l) => (
            <li key={l.id} className="relative mb-4">
              <span className={cx('absolute top-0.5 -left-[35px] flex h-[22px] w-[22px] items-center justify-center rounded-full', l.actor === 'ai' ? 'border border-dashed border-graphite bg-white text-graphite' : 'bg-ink text-white')}>
                {l.actor === 'ai' ? <Pencil size={11} /> : <Signature size={11} />}
              </span>
              <div className="text-xs text-muted">{l.actor === 'ai' ? t.ai : t.you} · {fmt.format(l.at)}</div>
              {l.target ? (
                <button onClick={() => open(l.target)} className="text-left text-[13px] leading-snug hover:text-ink hover:underline">{l.text}</button>
              ) : <p className="text-[13px] leading-snug">{l.text}</p>}
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
