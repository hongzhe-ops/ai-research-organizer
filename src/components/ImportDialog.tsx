import { Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useStore, useT } from '../store'
import type { SourceType } from '../types'
import { Button, Dialog, Field, FieldGroup, SourceIcon, cx, inputCls } from './ui'

const TYPES: SourceType[] = ['interview', 'observation', 'paper', 'survey', 'review', 'web', 'text']
const PERSON = new Set<SourceType>(['interview', 'observation', 'survey'])
const CITE = new Set<SourceType>(['paper', 'review', 'web'])

export function ImportDialog({ onClose, onImported }: { onClose: () => void; onImported: (id: string) => void }) {
  const { addSource, startEmpty, project } = useStore()
  const T = useT()
  const t = T.importer
  const [type, setType] = useState<SourceType>('interview')
  const [target, setTarget] = useState<'new' | 'demo'>('new')
  const [title, setTitle] = useState('')
  const [participant, setParticipant] = useState('')
  const [citation, setCitation] = useState('')
  const [content, setContent] = useState('')
  const [url, setUrl] = useState('')
  const [fromPdf, setFromPdf] = useState(false)
  const [error, setError] = useState('')
  const [reading, setReading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const onFile = async (f?: File) => {
    if (!f) return
    setError('')
    setReading(true)
    try {
      if (f.name.toLowerCase().endsWith('.pdf')) {
        const { pdfToText } = await import('../lib/pdf')
        const text = await pdfToText(f)
        if (!text.replace(/\[Page \d+\]/g, '').trim()) throw new Error('scan')
        setContent(text)
        setFromPdf(true)
      } else {
        setContent(await f.text())
      }
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
    } catch (e) {
      setError((e as Error).message === 'scan' ? t.errScan : t.errFile)
    } finally {
      setReading(false)
    }
  }

  const submit = () => {
    if (!title.trim()) return setError(t.errTitle)
    if (content.trim().length < 10) return setError(t.errText)
    if (url && !/^https?:\/\//.test(url)) return setError(t.errUrl)
    if (project.isDemo && target === 'new') startEmpty(T.settings.untitled)
    const id = addSource({
      title: title.trim(),
      type: type === 'text' && fromPdf ? 'pdf' : type,
      participant: PERSON.has(type) ? participant.trim() || undefined : undefined,
      citation: CITE.has(type) ? citation.trim() || undefined : undefined,
      url: CITE.has(type) ? url.trim() || undefined : undefined,
      content: content.replace(/\r\n/g, '\n').trim(),
    })
    onImported(id)
    onClose()
  }

  return (
    <Dialog title={t.title} onClose={onClose} width={680}>
      {project.isDemo && (
        <fieldset className="mb-5 rounded-lg border border-warn/30 bg-warn-soft p-3">
          <legend className="px-1 text-[13px] font-medium text-warn">{t.demoT}</legend>
          {(['new', 'demo'] as const).map((v) => (
            <label key={v} className="mt-1 flex cursor-pointer items-center gap-2 text-[13px]">
              <input type="radio" name="target" checked={target === v} onChange={() => setTarget(v)} className="accent-[#1E3A8A]" />
              {v === 'new' ? t.demoNew : t.demoAdd}
            </label>
          ))}
        </fieldset>
      )}

      <FieldGroup label={t.kind}>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {TYPES.map((k) => (
            <button key={k} type="button" onClick={() => { setType(k); setError('') }} aria-pressed={type === k}
              className={cx('rounded-lg border px-3 py-2 text-left', type === k ? 'border-ink bg-ink-soft' : 'border-line hover:border-[#C9CED8]')}>
              <span className={cx('flex items-center gap-1.5 text-[13px] font-medium', type === k && 'text-ink')}><SourceIcon type={k} size={13} />{T.type[k]}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted">{T.typeHint[k]}</span>
            </button>
          ))}
        </div>
      </FieldGroup>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label={t.titleF}><input className={inputCls} value={title} onChange={(e) => { setTitle(e.target.value); setError('') }} placeholder={t.titlePh} /></Field>
        {PERSON.has(type) && (
          <Field label={T.person[type as 'interview']} hint={t.participantHint}><input className={inputCls} value={participant} onChange={(e) => setParticipant(e.target.value)} placeholder={t.participantPh} /></Field>
        )}
        {CITE.has(type) && (
          <Field label={T.cite[type as 'paper']}><input className={inputCls} value={citation} onChange={(e) => setCitation(e.target.value)} placeholder={T.citePh[type as 'paper']} /></Field>
        )}
      </div>
      {CITE.has(type) && <Field label={t.linkOpt}><input className={inputCls} value={url} onChange={(e) => { setUrl(e.target.value); setError('') }} placeholder="https://" /></Field>}

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input ref={fileRef} type="file" hidden accept=".txt,.md,.pdf" onChange={(e) => onFile(e.target.files?.[0])} />
        <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={reading}><Upload size={14} /> {reading ? t.reading : t.upload2}</Button>
        <span className="text-xs text-muted">{type === 'web' ? t.webNote : t.fileHint}</span>
      </div>

      <Field label={t.text}>
        <textarea className={cx(inputCls, 'font-serif text-[14px] leading-relaxed')} rows={9} value={content} onChange={(e) => { setContent(e.target.value); setError('') }}
          placeholder={T.textPh[type] || T.textPh.text} />
      </Field>
      {error && <p role="alert" className="mb-3 text-[13px] text-counter">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>{T.common.cancel}</Button>
        <Button variant="primary" onClick={submit}>{t.submit}</Button>
      </div>
    </Dialog>
  )
}
