import { Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useStore, useT } from '../store'
import type { SourceType } from '../types'
import { Button, Dialog, Field, SourceIcon, cx, inputCls } from './ui'

type Tab = 'text' | 'pdf' | 'web'

export function ImportDialog({ onClose, onImported }: { onClose: () => void; onImported: (id: string) => void }) {
  const addSource = useStore((s) => s.addSource)
  const T = useT()
  const t = T.importer
  const [tab, setTab] = useState<Tab>('text')
  const [title, setTitle] = useState('')
  const [participant, setParticipant] = useState('')
  const [content, setContent] = useState('')
  const [url, setUrl] = useState('')
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
        setTab('pdf')
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
    if (content.trim().length < 20) return setError(t.errText)
    if (tab === 'web' && url && !/^https?:\/\//.test(url)) return setError(t.errUrl)
    const type: SourceType = tab === 'web' ? 'web' : tab === 'pdf' ? 'pdf' : participant ? 'interview' : 'text'
    const id = addSource({ title: title.trim(), type, participant: participant.trim() || undefined, url: url.trim() || undefined, content: content.replace(/\r\n/g, '\n').trim() })
    onImported(id)
    onClose()
  }

  const tabs: Array<{ id: Tab; label: string; icon: SourceType }> = [
    { id: 'text', label: t.tabText, icon: 'interview' },
    { id: 'pdf', label: t.tabPdf, icon: 'pdf' },
    { id: 'web', label: t.tabWeb, icon: 'web' },
  ]

  return (
    <Dialog title={t.title} onClose={onClose} width={640}>
      <div role="tablist" className="mb-5 flex gap-1 rounded-lg bg-graphite-soft p-1">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => { setTab(t.id); setError('') }}
            className={cx('flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[13px]', tab === t.id ? 'bg-white font-medium shadow-sm' : 'text-muted')}>
            <SourceIcon type={t.icon} /> {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label={t.titleF}><input className={inputCls} value={title} onChange={(e) => { setTitle(e.target.value); setError('') }} placeholder={t.titlePh} /></Field>
        {tab === 'web'
          ? <Field label={t.link}><input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /></Field>
          : <Field label={t.participant} hint={t.participantHint}><input className={inputCls} value={participant} onChange={(e) => setParticipant(e.target.value)} placeholder={t.participantPh} /></Field>}
      </div>

      {tab !== 'web' && (
        <div className="mb-4">
          <input ref={fileRef} type="file" hidden accept={tab === 'pdf' ? '.pdf' : '.txt,.md,.pdf'} onChange={(e) => onFile(e.target.files?.[0])} />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={reading}>
            <Upload size={14} /> {reading ? t.reading : tab === 'pdf' ? t.choosePdf : t.upload}
          </Button>
          <span className="ml-3 text-xs text-muted">{t.orPaste}</span>
        </div>
      )}
      {tab === 'web' && (
        <p className="mb-3 text-xs leading-relaxed text-muted">{t.webNote}</p>
      )}

      <Field label={t.text}>
        <textarea className={cx(inputCls, 'font-serif text-[14px] leading-relaxed')} rows={10} value={content} onChange={(e) => { setContent(e.target.value); setError('') }}
          placeholder={tab === 'web' ? t.webPh : t.textPh} />
      </Field>
      {error && <p role="alert" className="mb-3 text-[13px] text-counter">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>{T.common.cancel}</Button>
        <Button variant="primary" onClick={submit}>{t.submit}</Button>
      </div>
    </Dialog>
  )
}
