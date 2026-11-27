import { Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useStore } from '../store'
import type { SourceType } from '../types'
import { Button, Dialog, Field, SourceIcon, cx, inputCls } from './ui'

type Tab = 'text' | 'pdf' | 'web'

export function ImportDialog({ onClose, onImported }: { onClose: () => void; onImported: (id: string) => void }) {
  const addSource = useStore((s) => s.addSource)
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
      setError((e as Error).message === 'scan'
        ? 'This PDF has no selectable text, so it is probably a scan. Paste the text instead.'
        : 'The file could not be read. Try a .txt, .md or text-based .pdf file.')
    } finally {
      setReading(false)
    }
  }

  const submit = () => {
    if (!title.trim()) return setError('Give the source a title.')
    if (content.trim().length < 20) return setError('Add the source text. It needs at least a few sentences.')
    if (tab === 'web' && url && !/^https?:\/\//.test(url)) return setError('The link should start with http:// or https://')
    const type: SourceType = tab === 'web' ? 'web' : tab === 'pdf' ? 'pdf' : participant ? 'interview' : 'text'
    const id = addSource({ title: title.trim(), type, participant: participant.trim() || undefined, url: url.trim() || undefined, content: content.replace(/\r\n/g, '\n').trim() })
    onImported(id)
    onClose()
  }

  const tabs: Array<{ id: Tab; label: string; icon: SourceType }> = [
    { id: 'text', label: 'Transcript or notes', icon: 'interview' },
    { id: 'pdf', label: 'PDF', icon: 'pdf' },
    { id: 'web', label: 'Web page', icon: 'web' },
  ]

  return (
    <Dialog title="Import a source" onClose={onClose} width={640}>
      <div role="tablist" className="mb-5 flex gap-1 rounded-lg bg-graphite-soft p-1">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => { setTab(t.id); setError('') }}
            className={cx('flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[13px]', tab === t.id ? 'bg-white font-medium shadow-sm' : 'text-muted')}>
            <SourceIcon type={t.icon} /> {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="Title"><input className={inputCls} value={title} onChange={(e) => { setTitle(e.target.value); setError('') }} placeholder="Interview with Sam" /></Field>
        {tab === 'web'
          ? <Field label="Link"><input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /></Field>
          : <Field label="Participant (optional)" hint="Used to show how many people support an insight."><input className={inputCls} value={participant} onChange={(e) => setParticipant(e.target.value)} placeholder="P6 · Sam, art director" /></Field>}
      </div>

      {tab !== 'web' && (
        <div className="mb-4">
          <input ref={fileRef} type="file" hidden accept={tab === 'pdf' ? '.pdf' : '.txt,.md,.pdf'} onChange={(e) => onFile(e.target.files?.[0])} />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={reading}>
            <Upload size={14} /> {reading ? 'Reading file…' : tab === 'pdf' ? 'Choose a PDF' : 'Upload .txt, .md or .pdf'}
          </Button>
          <span className="ml-3 text-xs text-muted">or paste the text below</span>
        </div>
      )}
      {tab === 'web' && (
        <p className="mb-3 text-xs leading-relaxed text-muted">Browsers can't read most web pages directly. Copy the page text and paste it below. The link is kept so you can always return to the original.</p>
      )}

      <Field label="Text">
        <textarea className={cx(inputCls, 'font-serif text-[14px] leading-relaxed')} rows={10} value={content} onChange={(e) => { setContent(e.target.value); setError('') }}
          placeholder={tab === 'web' ? 'Paste the page text here' : 'Interviewer: …\nParticipant: …'} />
      </Field>
      {error && <p role="alert" className="mb-3 text-[13px] text-counter">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={submit}>Import source</Button>
      </div>
    </Dialog>
  )
}
