import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../store'
import type { Provider } from '../types'
import { Button, Dialog, Field, inputCls } from './ui'

const DEFAULT_MODEL: Record<Provider, string> = { anthropic: 'claude-sonnet-5-5', openai: 'gpt-5-mini' }

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { settings, setSettings, project, renameProject, startEmpty, loadDemo } = useStore()
  const [provider, setProvider] = useState(settings.provider)
  const [apiKey, setKey] = useState(settings.apiKey)
  const [model, setModel] = useState(settings.model)
  const [name, setName] = useState(project.name)
  const [question, setQuestion] = useState(project.question)

  const save = () => {
    setSettings({ provider, apiKey: apiKey.trim(), model: model.trim() || DEFAULT_MODEL[provider] })
    renameProject(name.trim() || 'Untitled study', question.trim())
    onClose()
  }

  return (
    <Dialog title="Settings" onClose={onClose}>
      <h3 className="mb-3 text-[13px] font-semibold text-muted">Study</h3>
      <Field label="Study name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Research question" hint="The AI uses this to decide what counts as relevant evidence.">
        <textarea className={inputCls} rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} />
      </Field>

      <h3 className="mt-6 mb-3 text-[13px] font-semibold text-muted">AI model</h3>
      <Field label="Provider">
        <div className="flex gap-2">
          {(['anthropic', 'openai'] as Provider[]).map((p) => (
            <button key={p} onClick={() => { setProvider(p); setModel(DEFAULT_MODEL[p]) }}
              className={`flex-1 rounded-md border px-3 py-2 text-[13px] ${provider === p ? 'border-ink bg-ink-soft font-medium text-ink' : 'border-line'}`}>
              {p === 'anthropic' ? 'Anthropic (Claude)' : 'OpenAI'}
            </button>
          ))}
        </div>
      </Field>
      <Field label="API key">
        <input className={inputCls} type="password" autoComplete="off" placeholder={provider === 'anthropic' ? 'sk-ant-…' : 'sk-…'} value={apiKey} onChange={(e) => setKey(e.target.value)} />
      </Field>
      <Field label="Model" hint="Use any model name your key has access to.">
        <input className={inputCls} value={model} onChange={(e) => setModel(e.target.value)} />
      </Field>
      <p className="mb-5 flex gap-2 rounded-md bg-graphite-soft p-3 text-xs leading-relaxed text-muted">
        <ShieldCheck size={16} className="shrink-0 text-ink" />
        Your key stays in this browser and is sent only to the provider you choose. Research material is sent to that provider when you run AI analysis.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => { if (confirm('Start a new empty study? The current study in this browser will be replaced.')) { startEmpty(); onClose() } }}>New empty study</Button>
          <Button size="sm" variant="ghost" onClick={() => { loadDemo(); onClose() }}>Load demo study</Button>
        </div>
        <div className="flex gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save}>Save settings</Button>
        </div>
      </div>
    </Dialog>
  )
}
