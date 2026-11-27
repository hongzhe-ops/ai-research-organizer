import { useState } from 'react'
import { useStore, useT } from '../store'
import { Button, Dialog, Field, inputCls } from './ui'

export function NewStudyDialog({ onClose, onCreated }: { onClose: () => void; onCreated?: () => void }) {
  const startEmpty = useStore((s) => s.startEmpty)
  const T = useT()
  const t = T.newStudy
  const [name, setName] = useState('')
  const [question, setQuestion] = useState('')
  const [err, setErr] = useState('')
  const create = () => {
    if (!name.trim()) return setErr(t.errName)
    startEmpty(name.trim(), question.trim())
    onClose()
    onCreated?.()
  }
  return (
    <Dialog title={t.title} onClose={onClose}>
      <Field label={t.name}><input autoFocus className={inputCls} value={name} placeholder={t.namePh} onChange={(e) => { setName(e.target.value); setErr('') }} onKeyDown={(e) => e.key === 'Enter' && create()} /></Field>
      <Field label={t.question} hint={t.questionHint}><textarea className={inputCls} rows={2} value={question} placeholder={t.questionPh} onChange={(e) => setQuestion(e.target.value)} /></Field>
      {err && <p role="alert" className="mb-3 text-[13px] text-counter">{err}</p>}
      <p className="mb-4 text-xs leading-relaxed text-muted">{t.note}</p>
      <div className="flex justify-end gap-2"><Button onClick={onClose}>{T.common.cancel}</Button><Button variant="primary" onClick={create}>{t.create}</Button></div>
    </Dialog>
  )
}
