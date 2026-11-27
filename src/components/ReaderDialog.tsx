import { PanelsTopLeft } from 'lucide-react'
import { useState } from 'react'
import { sourceMeta, useStore, useT } from '../store'
import { SourceReader } from './SourceReader'
import { Button, Dialog, SourceIcon } from './ui'

/** Read a source and excerpt evidence without leaving the current step. */
export function ReaderDialog({ sourceId, onClose }: { sourceId: string; onClose: () => void }) {
  const { project: p, go } = useStore()
  const T = useT()
  const [focus, setFocus] = useState<string>()
  const source = p.sources.find((s) => s.id === sourceId)
  if (!source) return null
  const n = p.evidence.filter((e) => e.sourceId === source.id && e.status !== 'rejected').length
  return (
    <Dialog title={source.title} onClose={onClose} width={780}>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1"><SourceIcon type={source.type} size={12} />{sourceMeta(source, T)}</span>
        <span>{T.sources.quotes(n)}</span>
      </div>
      <p className="mb-3 rounded-md bg-ink-soft px-3 py-2 text-[13px] text-ink">{T.reader.hint}</p>
      <SourceReader source={source} focusId={focus} onMark={(e) => setFocus(e.id)} onAdded={setFocus}
        className="max-h-[56vh] overflow-y-auto rounded-lg border border-line px-5 py-4" />
      <div className="mt-4 flex justify-between gap-2">
        <Button variant="ghost" onClick={() => { onClose(); go({ view: 'workspace', sourceId: source.id }) }}><PanelsTopLeft size={14} />{T.reader.workspace}</Button>
        <Button variant="primary" onClick={onClose}>{T.common.close}</Button>
      </div>
    </Dialog>
  )
}
