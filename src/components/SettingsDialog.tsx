import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useStore, useT } from '../store'
import type { Provider } from '../types'
import { Button, Dialog, Field, FieldGroup, inputCls } from './ui'

const DEFAULT_MODEL: Record<Provider, string> = { anthropic: 'claude-sonnet-5-5', openai: 'gpt-5-mini' }

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { settings, setSettings, project, renameProject, startEmpty, loadDemo } = useStore()
  const T = useT()
  const t = T.settings
  const [provider, setProvider] = useState(settings.provider)
  const [apiKey, setKey] = useState(settings.apiKey)
  const [model, setModel] = useState(settings.model)
  const [name, setName] = useState(project.name)
  const [question, setQuestion] = useState(project.question)

  const save = () => {
    setSettings({ provider, apiKey: apiKey.trim(), model: model.trim() || DEFAULT_MODEL[provider] })
    renameProject(name.trim() || t.untitled, question.trim())
    onClose()
  }

  return (
    <Dialog title={t.title} onClose={onClose}>
      <h3 className="mb-3 text-[13px] font-semibold text-muted">{t.study}</h3>
      <Field label={t.name}><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label={t.question} hint={t.questionHint}>
        <textarea className={inputCls} rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} />
      </Field>

      <h3 className="mt-6 mb-3 text-[13px] font-semibold text-muted">{t.ai}</h3>
      <FieldGroup label={t.provider}>
        <div className="flex gap-2">
          {(['anthropic', 'openai'] as Provider[]).map((p) => (
            <button key={p} onClick={() => { setProvider(p); setModel(DEFAULT_MODEL[p]) }}
              className={`flex-1 rounded-md border px-3 py-2 text-[13px] ${provider === p ? 'border-ink bg-ink-soft font-medium text-ink' : 'border-line'}`}>
              {p === 'anthropic' ? 'Anthropic (Claude)' : 'OpenAI'}
            </button>
          ))}
        </div>
      </FieldGroup>
      <Field label={t.key}>
        <input className={inputCls} type="password" autoComplete="off" placeholder={provider === 'anthropic' ? 'sk-ant-…' : 'sk-…'} value={apiKey} onChange={(e) => setKey(e.target.value)} />
      </Field>
      <Field label={t.model} hint={t.modelHint}>
        <input className={inputCls} value={model} onChange={(e) => setModel(e.target.value)} />
      </Field>
      <p className="mb-5 flex gap-2 rounded-md bg-graphite-soft p-3 text-xs leading-relaxed text-muted">
        <ShieldCheck size={16} className="shrink-0 text-ink" />
        {t.privacy}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => { if (confirm(t.newConfirm)) { startEmpty(); onClose() } }}>{t.newStudy}</Button>
          <Button size="sm" variant="ghost" onClick={() => { loadDemo(); onClose() }}>{t.loadDemo}</Button>
        </div>
        <div className="flex gap-2">
          <Button onClick={onClose}>{T.common.cancel}</Button>
          <Button variant="primary" onClick={save}>{t.save}</Button>
        </div>
      </div>
    </Dialog>
  )
}
