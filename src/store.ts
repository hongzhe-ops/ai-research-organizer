import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { demoProject, emptyProject } from './demo'
import type { Evidence, Insight, LogEntry, Origin, Project, Settings, Source, Status, Theme, View } from './types'

export const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

interface Nav {
  view: View
  sourceId?: string
  focusEvidenceId?: string
  insightId?: string
}

interface State {
  project: Project
  settings: Settings
  nav: Nav
  /** Insights whose evidence the researcher has opened in this session. */
  reviewed: string[]
  busy?: string
  notice?: { text: string; tone: 'ok' | 'error' }

  go: (nav: Nav) => void
  setBusy: (msg?: string) => void
  notify: (text?: string, tone?: 'ok' | 'error') => void
  setSettings: (s: Partial<Settings>) => void
  loadDemo: () => void
  startEmpty: () => void
  renameProject: (name: string, question: string) => void
  log: (actor: Origin, text: string, target?: LogEntry['target']) => void

  addSource: (s: Omit<Source, 'id' | 'addedAt'>) => string
  deleteSource: (id: string) => void

  addEvidence: (e: Omit<Evidence, 'id'>) => string
  setEvidenceStatus: (id: string, status: Status) => void
  setEvidenceNote: (id: string, note: string) => void

  addTheme: (name: string) => string
  updateTheme: (id: string, patch: Partial<Pick<Theme, 'name' | 'description'>>) => void
  setThemeStatus: (id: string, status: Status) => void
  toggleLock: (id: string) => void
  moveEvidence: (evidenceId: string, fromThemeId: string | null, toThemeId: string | null) => void
  deleteTheme: (id: string) => void

  markReviewed: (insightId: string) => void
  setInsightStatus: (id: string, status: Status, note?: string) => void
  editInsight: (id: string, statement: string, reason: string) => void
  flipStance: (insightId: string, evidenceId: string) => void
  unlinkEvidence: (insightId: string, evidenceId: string) => void

  replaceAI: (patch: { evidence?: Evidence[]; themes?: Theme[]; insights?: Insight[] }) => void
}

const quoteShort = (q: string) => (q.length > 60 ? `${q.slice(0, 57)}…` : q)

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const patch = (fn: (p: Project) => Partial<Project>) => set((s) => ({ project: { ...s.project, ...fn(s.project) } }))
      const log = (actor: Origin, text: string, target?: LogEntry['target']) =>
        patch((p) => ({ log: [{ id: uid('l'), at: Date.now(), actor, text, target }, ...p.log].slice(0, 400) }))

      return {
        project: demoProject(),
        settings: { provider: 'anthropic', apiKey: '', model: 'claude-sonnet-5-5' },
        nav: { view: 'overview' },
        reviewed: [],

        go: (nav) => set({ nav }),
        setBusy: (busy) => set({ busy }),
        notify: (text, tone = 'ok') => set({ notice: text ? { text, tone } : undefined }),
        setSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),
        loadDemo: () => set({ project: demoProject(), reviewed: [], nav: { view: 'overview' } }),
        startEmpty: () => set({ project: emptyProject(), reviewed: [], nav: { view: 'sources' } }),
        renameProject: (name, question) => patch(() => ({ name, question })),
        log,

        addSource: (s) => {
          const id = uid('s')
          patch((p) => ({ sources: [...p.sources, { ...s, id, addedAt: Date.now() }] }))
          log('researcher', `Imported source "${s.title}".`, { kind: 'source', id })
          return id
        },
        deleteSource: (id) => {
          const p = get().project
          const gone = new Set(p.evidence.filter((e) => e.sourceId === id).map((e) => e.id))
          const title = p.sources.find((s) => s.id === id)?.title
          patch((p) => ({
            sources: p.sources.filter((s) => s.id !== id),
            evidence: p.evidence.filter((e) => !gone.has(e.id)),
            themes: p.themes.map((t) => ({ ...t, evidenceIds: t.evidenceIds.filter((x) => !gone.has(x)) })),
            insights: p.insights.map((i) => ({ ...i, supporting: i.supporting.filter((x) => !gone.has(x)), counter: i.counter.filter((x) => !gone.has(x)) })),
          }))
          log('researcher', `Removed source "${title}" and ${gone.size} linked quotes.`)
        },

        addEvidence: (e) => {
          const id = uid('e')
          patch((p) => ({ evidence: [...p.evidence, { ...e, id }] }))
          if (e.origin === 'researcher') log('researcher', `Added evidence manually: "${quoteShort(e.quote)}"`, { kind: 'evidence', id })
          return id
        },
        setEvidenceStatus: (id, status) => {
          const e = get().project.evidence.find((x) => x.id === id)
          patch((p) => ({ evidence: p.evidence.map((x) => (x.id === id ? { ...x, status } : x)) }))
          const verb = status === 'confirmed' ? 'Confirmed' : status === 'rejected' ? 'Rejected' : 'Reopened'
          if (e) log('researcher', `${verb} evidence: "${quoteShort(e.quote)}"`, { kind: 'evidence', id })
        },
        setEvidenceNote: (id, note) => {
          patch((p) => ({ evidence: p.evidence.map((x) => (x.id === id ? { ...x, note, status: x.status === 'rejected' ? 'rejected' : 'edited' } : x)) }))
          log('researcher', 'Annotated evidence.', { kind: 'evidence', id })
        },

        addTheme: (name) => {
          const id = uid('t')
          patch((p) => ({ themes: [...p.themes, { id, name, evidenceIds: [], origin: 'researcher', status: 'confirmed', locked: false }] }))
          log('researcher', `Created theme "${name}".`, { kind: 'theme', id })
          return id
        },
        updateTheme: (id, ch) => {
          patch((p) => ({ themes: p.themes.map((t) => (t.id === id ? { ...t, ...ch, status: 'edited' } : t)) }))
          if (ch.name) log('researcher', `Renamed theme to "${ch.name}".`, { kind: 'theme', id })
        },
        setThemeStatus: (id, status) => {
          const t = get().project.themes.find((x) => x.id === id)
          patch((p) => ({ themes: p.themes.map((x) => (x.id === id ? { ...x, status } : x)) }))
          if (t) log('researcher', `${status === 'confirmed' ? 'Confirmed' : status === 'rejected' ? 'Rejected' : 'Reopened'} theme "${t.name}".`, { kind: 'theme', id })
        },
        toggleLock: (id) => {
          const t = get().project.themes.find((x) => x.id === id)
          patch((p) => ({ themes: p.themes.map((x) => (x.id === id ? { ...x, locked: !x.locked } : x)) }))
          if (t) log('researcher', `${t.locked ? 'Unlocked' : 'Locked'} theme "${t.name}".`, { kind: 'theme', id })
        },
        moveEvidence: (eid, from, to) => {
          if (from === to) return
          patch((p) => ({
            themes: p.themes.map((t) => {
              if (t.id === from) return { ...t, evidenceIds: t.evidenceIds.filter((x) => x !== eid), status: t.status === 'rejected' ? t.status : 'edited' }
              if (t.id === to && !t.evidenceIds.includes(eid)) return { ...t, evidenceIds: [...t.evidenceIds, eid], status: t.status === 'rejected' ? t.status : 'edited' }
              return t
            }),
          }))
          const th = get().project.themes
          const name = (id: string | null) => (id ? `"${th.find((t) => t.id === id)?.name}"` : 'Unsorted')
          log('researcher', `Moved a quote from ${name(from)} to ${name(to)}.`, { kind: 'evidence', id: eid })
        },
        deleteTheme: (id) => {
          const t = get().project.themes.find((x) => x.id === id)
          patch((p) => ({ themes: p.themes.filter((x) => x.id !== id), insights: p.insights.map((i) => ({ ...i, themeIds: i.themeIds.filter((x) => x !== id) })) }))
          if (t) log('researcher', `Deleted theme "${t.name}".`)
        },

        markReviewed: (id) => set((s) => (s.reviewed.includes(id) ? s : { reviewed: [...s.reviewed, id] })),
        setInsightStatus: (id, status, note) => {
          const i = get().project.insights.find((x) => x.id === id)
          patch((p) => ({ insights: p.insights.map((x) => (x.id === id ? { ...x, status, decisionNote: note ?? x.decisionNote } : x)) }))
          if (!i) return
          if (status === 'confirmed') log('researcher', `Confirmed insight after reviewing ${i.supporting.length} supporting and ${i.counter.length} counter quotes.`, { kind: 'insight', id })
          else if (status === 'rejected') log('researcher', `Rejected insight: "${quoteShort(i.statement)}"${note ? ` Reason: ${note}` : ''}`, { kind: 'insight', id })
          else log('researcher', `Reopened insight: "${quoteShort(i.statement)}"`, { kind: 'insight', id })
        },
        editInsight: (id, statement, reason) => {
          patch((p) => ({ insights: p.insights.map((x) => (x.id === id ? { ...x, statement, status: 'edited', decisionNote: reason || x.decisionNote } : x)) }))
          log('researcher', `Rewrote insight as "${quoteShort(statement)}"${reason ? `. Reason: ${reason}` : ''}`, { kind: 'insight', id })
        },
        flipStance: (iid, eid) => {
          patch((p) => ({
            insights: p.insights.map((i) => {
              if (i.id !== iid) return i
              return i.supporting.includes(eid)
                ? { ...i, supporting: i.supporting.filter((x) => x !== eid), counter: [...i.counter, eid] }
                : { ...i, counter: i.counter.filter((x) => x !== eid), supporting: [...i.supporting, eid] }
            }),
          }))
          log('researcher', 'Changed whether a quote supports or challenges an insight.', { kind: 'insight', id: iid })
        },
        unlinkEvidence: (iid, eid) => {
          patch((p) => ({ insights: p.insights.map((i) => (i.id === iid ? { ...i, supporting: i.supporting.filter((x) => x !== eid), counter: i.counter.filter((x) => x !== eid) } : i)) }))
          log('researcher', 'Removed a quote from an insight.', { kind: 'insight', id: iid })
        },

        replaceAI: (ch) => patch(() => ({ ...ch })),
      }
    },
    {
      name: 'aro-v1',
      partialize: (s) => ({ project: s.project, settings: s.settings }),
    },
  ),
)

/** Distinct participants and sources behind a set of evidence ids. */
export function coverage(p: Project, ids: string[]) {
  const ev = ids.map((id) => p.evidence.find((e) => e.id === id)).filter(Boolean) as Evidence[]
  const srcs = new Set(ev.map((e) => e.sourceId))
  const people = new Set(ev.map((e) => p.sources.find((s) => s.id === e.sourceId)?.participant).filter(Boolean))
  const totalPeople = new Set(p.sources.map((s) => s.participant).filter(Boolean)).size
  return { quotes: ev.length, sources: srcs.size, people: people.size, totalPeople }
}

/** Where a piece of evidence is used: the bidirectional half of the trace. */
export function usage(p: Project, evidenceId: string) {
  return {
    themes: p.themes.filter((t) => t.evidenceIds.includes(evidenceId)),
    supports: p.insights.filter((i) => i.supporting.includes(evidenceId)),
    challenges: p.insights.filter((i) => i.counter.includes(evidenceId)),
  }
}
