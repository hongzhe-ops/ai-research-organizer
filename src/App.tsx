import { Check, FilePlus2, Languages, LayoutDashboard, Loader2, Pencil, RotateCcw, Settings as Cog, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cancelRun, useAI } from './ai/useAI'
import { NewStudyDialog } from './components/NewStudyDialog'
import { SettingsDialog } from './components/SettingsDialog'
import { Button, cx } from './components/ui'
import { STEPS, pendingFor, stepDone, useStore, useT } from './store'
import { EvidenceView } from './views/EvidenceView'
import { ExportView } from './views/ExportView'
import { OverviewView } from './views/OverviewView'
import { SourcesView } from './views/SourcesView'
import { ThemesView } from './views/ThemesView'
import { ValidateView } from './views/ValidateView'
import { WorkspaceView } from './views/WorkspaceView'

function ProgressPanel() {
  const progress = useStore((s) => s.progress)
  const t = useT()
  if (!progress) return null
  return (
    <div role="status" aria-live="polite" className="fixed right-4 bottom-4 z-[60] w-[320px] rounded-xl border border-line bg-white p-4 shadow-[0_12px_40px_rgba(20,30,60,.16)]">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold">{t.progress.title}</p>
          <p className="text-xs text-muted">{t.progress.stage(progress.current + 1, progress.stages.length)}</p>
        </div>
        <Button size="sm" variant="outline" onClick={cancelRun}>{t.progress.cancel}</Button>
      </div>
      <ol className="space-y-1.5">
        {progress.stages.map((label, i) => (
          <li key={i} className={cx('flex items-center gap-2 text-[13px]', i > progress.current && 'text-muted')}>
            {i < progress.current ? <Check size={14} className="text-ink" /> : i === progress.current ? <Loader2 size={14} className="animate-spin text-ink" /> : <span className="inline-block h-3.5 w-3.5 rounded-full border border-line" />}
            <span className="truncate">{label}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function App() {
  const { nav, go, project, settings, progress, loadDemo, notice, notify, lang, setLang } = useStore()
  const t = useT()
  const [showSettings, setShowSettings] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const ai = useAI(() => setShowSettings(true))
  useEffect(() => { document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en' }, [lang])
  useEffect(() => {
    if (!notice || notice.action) return
    const id = setTimeout(() => notify(), 6000)
    return () => clearTimeout(id)
  }, [notice, notify])

  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col border-line bg-white md:w-[240px] md:border-r print:hidden">
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="#1E3A8A" /><rect x="7" y="9" width="18" height="4" rx="1" fill="#FFE45C" /><rect x="7" y="16" width="12" height="2" rx="1" fill="#fff" /><rect x="7" y="21" width="15" height="2" rx="1" fill="#fff" /></svg>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold">{t.app.name}</div>
            <div className="text-[11px] text-muted">{t.app.tagline}</div>
          </div>
        </div>
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          <button onClick={() => go({ view: 'overview' })} aria-current={nav.view === 'overview' ? 'page' : undefined}
            className={cx('flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-[13px]', nav.view === 'overview' ? 'bg-ink-soft font-medium text-ink' : 'text-muted hover:bg-graphite-soft hover:text-text')}>
            <LayoutDashboard size={16} /> {t.app.overview}
          </button>
          <p className="mt-4 mb-1 hidden px-3 text-[11px] font-medium text-muted md:block">{t.app.flow}</p>
          <ol className="flex gap-1 md:block md:space-y-0.5">
            {STEPS.map((step, i) => {
              const active = nav.view === step
              const done = stepDone(project, step)
              const pending = pendingFor(project, step)
              return (
                <li key={step} className="relative shrink-0">
                  {i < STEPS.length - 1 && <span aria-hidden="true" className="absolute top-[30px] left-[25px] hidden h-[calc(100%-18px)] w-px bg-line md:block" />}
                  <button onClick={() => go({ view: step })} aria-current={active ? 'step' : undefined}
                    className={cx('relative flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px]', active ? 'bg-ink-soft font-medium text-ink' : 'text-text hover:bg-graphite-soft')}>
                    <span className={cx('flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums',
                      done ? 'bg-ink text-white' : active ? 'border-[1.5px] border-ink bg-white text-ink' : 'border border-line bg-white text-muted')}>
                      {done ? <Check size={12} /> : `0${i + 1}`}
                    </span>
                    <span className="whitespace-nowrap">{t.steps[step].label}</span>
                    {pending > 0 && (
                      <span title={t.app.drafts(pending)} className="ml-auto inline-flex items-center gap-0.5 rounded-full border border-dashed border-graphite/60 px-1.5 text-[11px] font-normal text-graphite">
                        <Pencil size={9} />{pending}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>
        <div className="mt-auto hidden border-t border-line p-4 text-xs leading-relaxed text-muted md:block">
          <div className="mb-2 flex items-center gap-2"><span className="pencil inline-block h-3 w-5 rounded-sm" /> {t.app.legendDraft}</div>
          <div className="flex items-center gap-2"><span className="ink inline-block h-3 w-5 rounded-sm" /> {t.app.legendInk}</div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b border-line bg-white px-6 py-3 print:hidden">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold">{project.name}</div>
            <div className="truncate text-xs text-muted">{project.question || t.app.noQuestion}</div>
          </div>
          {project.isDemo && <span className="rounded-full bg-warn-soft px-2.5 py-1 text-[11px] font-medium text-warn">{t.app.demoBadge}</span>}
          <Button variant="ghost" size="sm" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} aria-label={t.app.switchLangLabel} title={t.app.switchLangLabel}>
            <Languages size={14} /> {t.app.switchLang}
          </Button>
          {project.isDemo && <Button variant="ghost" size="sm" onClick={() => { if (confirm(t.app.resetConfirm)) loadDemo() }}><RotateCcw size={14} /> {t.app.reset}</Button>}
          <Button variant="outline" size="sm" onClick={() => setShowNew(true)}><FilePlus2 size={14} /> {t.app.newStudy}</Button>
          <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}><Cog size={14} /> {settings.apiKey ? t.app.aiConnected : t.app.connectAI}</Button>
          <Button variant="primary" size="sm" disabled={!!progress} onClick={ai.all}>
            {progress ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />} {t.app.run}
          </Button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className={cx('mx-auto px-6 py-7', nav.view === 'workspace' ? 'max-w-[1480px]' : 'max-w-[1200px]')}>
            {nav.view === 'overview' && <OverviewView />}
            {nav.view === 'sources' && <SourcesView ai={ai} />}
            {nav.view === 'evidence' && <EvidenceView />}
            {nav.view === 'themes' && <ThemesView ai={ai} />}
            {nav.view === 'workspace' && <WorkspaceView ai={ai} />}
            {nav.view === 'validate' && <ValidateView />}
            {nav.view === 'export' && <ExportView />}
          </div>
        </main>
      </div>

      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
      {showNew && <NewStudyDialog onClose={() => setShowNew(false)} />}
      <ProgressPanel />
      {notice && !progress && (
        <div role="status" className={cx('fixed right-4 bottom-4 z-[60] flex max-w-sm items-start gap-3 rounded-lg px-4 py-3 text-[13px] leading-snug shadow-lg print:hidden', notice.tone === 'error' ? 'bg-white text-text ring-1 ring-counter/40' : 'bg-ink text-white')}>
          <span className="flex-1">{notice.text}</span>
          {notice.action && <button onClick={() => { const a = notice.action!; notify(); a.run() }} className="shrink-0 font-semibold text-ink underline underline-offset-2">{notice.action.label}</button>}
          <button aria-label={t.app.dismiss} onClick={() => notify()} className="opacity-70 hover:opacity-100"><X size={14} /></button>
        </div>
      )}
    </div>
  )
}
