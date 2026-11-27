import { AlertTriangle, BookOpenText, ExternalLink, Plus, Trash2, Wand2 } from 'lucide-react'
import { useState } from 'react'
import type { useAI } from '../ai/useAI'
import { StepGuide } from '../components/Flow'
import { ImportDialog } from '../components/ImportDialog'
import { ReaderDialog } from '../components/ReaderDialog'
import { Button, Dialog, Empty, SourceIcon } from '../components/ui'
import { useStore, useT } from '../store'
import type { Source } from '../types'

function DeleteDialog({ source, onClose }: { source: Source; onClose: () => void }) {
  const { project: p, deleteSource } = useStore()
  const T = useT()
  const t = T.sources
  const ids = new Set(p.evidence.filter((e) => e.sourceId === source.id).map((e) => e.id))
  const themes = p.themes.filter((x) => x.evidenceIds.some((e) => ids.has(e)))
  const insights = p.insights.filter((i) => i.status !== 'rejected' && [...i.supporting, ...i.counter].some((e) => ids.has(e)))
  return (
    <Dialog title={t.impactT} onClose={onClose}>
      <p className="mb-1 text-[14px] font-medium">{source.title}{source.participant && <span className="font-normal text-muted"> · {source.participant}</span>}</p>
      {themes.length || insights.length ? (
        <>
          <p className="text-[13px] text-muted">{t.impactB(ids.size, themes.length, insights.length)}</p>
          <ul className="my-3 space-y-1.5 rounded-lg bg-warn-soft p-3 text-[13px]">
            {insights.map((i) => <li key={i.id} className="flex gap-2"><AlertTriangle size={14} className="mt-0.5 shrink-0 text-warn" />{i.statement}</li>)}
          </ul>
          <p className="mb-4 text-xs text-muted">{t.impactNote}</p>
        </>
      ) : <p className="mb-4 text-[13px] text-muted">{t.impactNone}</p>}
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>{T.common.cancel}</Button>
        <Button variant="danger" onClick={() => { deleteSource(source.id); onClose() }}><Trash2 size={14} />{t.confirmDelete}</Button>
      </div>
    </Dialog>
  )
}

export function SourcesView({ ai }: { ai: ReturnType<typeof useAI> }) {
  const { project: p, progress } = useStore()
  const T = useT()
  const t = T.sources
  const [importing, setImporting] = useState(false)
  const [deleting, setDeleting] = useState<Source | null>(null)
  const [reading, setReading] = useState<string | null>(null)
  const count = (id: string) => p.evidence.filter((e) => e.sourceId === id && e.status !== 'rejected').length

  return (
    <>
      <StepGuide step="sources" actions={<Button variant="primary" onClick={() => setImporting(true)}><Plus size={15} />{t.import}</Button>} />
      {!p.sources.length ? (
        <Empty title={t.emptyT} body={t.emptyB} action={<Button variant="primary" onClick={() => setImporting(true)}><Plus size={15} />{t.import}</Button>} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {p.sources.map((s) => (
            <li key={s.id} className="flex flex-col rounded-xl border border-line bg-white p-4">
              <div className="mb-2 flex items-start gap-2.5">
                <span className="mt-0.5 rounded-md bg-graphite-soft p-1.5 text-muted"><SourceIcon type={s.type} size={15} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold" title={s.title}>{s.title}</p>
                  <p className="truncate text-xs text-muted">{T.type[s.type]}{s.participant ? ` · ${s.participant}` : ''} · {t.quotes(count(s.id))}</p>
                </div>
                <button aria-label={t.del} onClick={() => setDeleting(s)} className="rounded p-1 text-muted hover:bg-graphite-soft hover:text-counter"><Trash2 size={14} /></button>
              </div>
              <p className="quote line-clamp-3 flex-1 text-[13.5px] text-muted">{s.content.replace(/^.*?[:：]\s*/m, '').slice(0, 220)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setReading(s.id)}><BookOpenText size={13} />{t.open}</Button>
                <Button size="sm" variant="ghost" disabled={!!progress} onClick={() => ai.extract(s.id)}><Wand2 size={13} />{t.extract}</Button>
                {s.url && <a href={s.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 self-center text-xs text-ink hover:underline">{t.openOriginal}<ExternalLink size={11} /></a>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {importing && <ImportDialog onClose={() => setImporting(false)} onImported={() => {}} />}
      {reading && <ReaderDialog sourceId={reading} onClose={() => setReading(null)} />}
      {deleting && <DeleteDialog source={deleting} onClose={() => setDeleting(null)} />}
    </>
  )
}
