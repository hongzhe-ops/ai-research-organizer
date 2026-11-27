import { History, Layers, LayoutDashboard, Lightbulb, Loader2, Pencil, Quote, RotateCcw, Settings as Cog, Library } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SettingsDialog } from './components/SettingsDialog'
import { Button, cx } from './components/ui'
import { useStore } from './store'
import type { View } from './types'
import { ActivityView } from './views/ActivityView'
import { EvidenceView } from './views/EvidenceView'
import { InsightsView } from './views/InsightsView'
import { OverviewView } from './views/OverviewView'
import { SourcesView } from './views/SourcesView'
import { ThemesView } from './views/ThemesView'
import { useRunAll } from './ai/useAI'

const NAV: Array<{ view: View; label: string; icon: typeof Quote }> = [
  { view: 'overview', label: 'Overview', icon: LayoutDashboard },
  { view: 'sources', label: 'Sources', icon: Library },
  { view: 'evidence', label: 'Evidence', icon: Quote },
  { view: 'themes', label: 'Themes', icon: Layers },
  { view: 'insights', label: 'Insights', icon: Lightbulb },
  { view: 'activity', label: 'Activity', icon: History },
]

export default function App() {
  const { nav, go, project, settings, busy, loadDemo, notice, notify } = useStore()
  useEffect(() => { if (!notice) return; const t = setTimeout(() => notify(), 6000); return () => clearTimeout(t) }, [notice, notify])
  const [showSettings, setShowSettings] = useState(false)
  const runAll = useRunAll(() => setShowSettings(true))

  const pending = {
    evidence: project.evidence.filter((e) => e.status === 'suggested').length,
    themes: project.themes.filter((t) => t.status === 'suggested').length,
    insights: project.insights.filter((i) => i.status === 'suggested').length,
  } as Record<string, number>

  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col border-line bg-white md:w-[228px] md:border-r">
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="#1E3A8A" /><rect x="7" y="9" width="18" height="4" rx="1" fill="#FFE45C" /><rect x="7" y="16" width="12" height="2" rx="1" fill="#fff" /><rect x="7" y="21" width="15" height="2" rx="1" fill="#fff" /></svg>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold">Research Organizer</div>
            <div className="text-[11px] text-muted">Evidence-first synthesis</div>
          </div>
        </div>
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          {NAV.map(({ view, label, icon: Icon }) => (
            <button
              key={view}
              onClick={() => go({ view })}
              aria-current={nav.view === view ? 'page' : undefined}
              className={cx(
                'flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors',
                nav.view === view ? 'bg-ink-soft font-medium text-ink' : 'text-muted hover:bg-graphite-soft hover:text-text',
              )}
            >
              <Icon size={16} />
              <span>{label}</span>
              {pending[view] > 0 && (
                <span title={`${pending[view]} AI drafts to review`} className="ml-auto inline-flex items-center gap-0.5 rounded-full border border-dashed border-graphite/60 px-1.5 text-[11px] text-graphite">
                  <Pencil size={9} />{pending[view]}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-line p-4 text-xs leading-relaxed text-muted md:block">
          <div className="mb-2 flex items-center gap-2"><span className="inline-block h-3 w-5 rounded-sm pencil" /> AI draft, not yet reviewed</div>
          <div className="flex items-center gap-2"><span className="inline-block h-3 w-5 rounded-sm ink" /> Decided by you</div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-line bg-white px-6 py-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold">{project.name}</div>
            <div className="truncate text-xs text-muted">{project.question || 'No research question yet'}</div>
          </div>
          {project.isDemo && (
            <span className="rounded-full bg-warn-soft px-2.5 py-1 text-[11px] font-medium text-warn">Demo study · fictional data</span>
          )}
          <Button variant="ghost" size="sm" onClick={() => { if (confirm('Reset the demo study? Your changes in this browser will be lost.')) loadDemo() }} title="Reset demo study">
            <RotateCcw size={14} /> Reset
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
            <Cog size={14} /> {settings.apiKey ? 'AI connected' : 'Connect AI'}
          </Button>
          <Button variant="primary" size="sm" disabled={!!busy} onClick={runAll}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
            {busy ? busy : 'Run AI analysis'}
          </Button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1200px] px-6 py-7">
            {nav.view === 'overview' && <OverviewView />}
            {nav.view === 'sources' && <SourcesView onNeedKey={() => setShowSettings(true)} />}
            {nav.view === 'evidence' && <EvidenceView />}
            {nav.view === 'themes' && <ThemesView onNeedKey={() => setShowSettings(true)} />}
            {nav.view === 'insights' && <InsightsView onNeedKey={() => setShowSettings(true)} />}
            {nav.view === 'activity' && <ActivityView />}
          </div>
        </main>
      </div>
      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
      {notice && (
        <div role="status" className={cx('fixed right-4 bottom-4 z-[60] flex max-w-sm items-start gap-3 rounded-lg px-4 py-3 text-[13px] leading-snug shadow-lg', notice.tone === 'error' ? 'bg-white text-text ring-1 ring-counter/40' : 'bg-ink text-white')}>
          <span className="flex-1">{notice.text}</span>
          <button aria-label="Dismiss" onClick={() => notify()} className="opacity-70 hover:opacity-100">×</button>
        </div>
      )}
    </div>
  )
}
