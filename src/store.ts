import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { demoProject, emptyProject } from './demo'
import { defaultLang, dict, type Lang } from './i18n'
import type { Evidence, Insight, LogEntry, Origin, Project, RunSummary, Settings, Source, Status, Theme, View } from './types'

export const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export interface Nav {
  view: View
  sourceId?: string
  focusEvidenceId?: string
  insightId?: string
}

export interface Progress { stages: string[]; current: number }
export interface Notice { text: string; tone: 'ok' | 'error'; action?: { label: string; run: () => void } }

interface State {
  lang: Lang
  setLang: (l: Lang) => void
  project: Project
  settings: Settings
  nav: Nav
  /** Insights whose evidence the researcher has looked at in this session. */
  reviewed: string[]
  progress?: Progress
  notice?: Notice

  go: (nav: Nav) => void
  setProgress: (p?: Progress) => void
  notify: (text?: string, tone?: Notice['tone'], action?: Notice['action']) => void
  setSettings: (s: Partial<Settings>) => void
  loadDemo: () => void
  startEmpty: () => void
  renameProject: (name: string, question: string) => void
  log: (actor: Origin, text: string, target?: LogEntry['target']) => void

  addSource: (s: Omit<Source, 'id' | 'addedAt'>) => string
  deleteSource: (id: string) => void

  addEvidence: (e: Omit<Evidence, 'id'>) => string
  setEvidenceStatus: (id: string, status: Status) => void
  confirmAllInSource: (sourceId: string) => void
  setEvidenceNote: (id: string, note: string) => void

  addTheme: (name: string, evidenceIds?: string[]) => string
  updateTheme: (id: string, patch: Partial<Pick<Theme, 'name' | 'description'>>) => void
  setThemeStatus: (id: string, status: Status) => void
  toggleLock: (id: string) => void
  moveEvidence: (evidenceId: string, fromThemeId: string | null, toThemeId: string | null) => void
  mergeTheme: (fromId: string, intoId: string) => void
  splitTheme: (themeId: string, evidenceIds: string[], name: string) => void
  deleteTheme: (id: string) => void

  markReviewed: (insightId: string) => void
  setInsightStatus: (id: string, status: Status, note?: string) => void
  editInsight: (id: string, statement: string, reason?: string) => void
  flipStance: (insightId: string, evidenceId: string) => void
  unlinkEvidence: (insightId: string, evidenceId: string) => void

  clearNew: () => void
  setLastRun: (r?: RunSummary) => void
  replaceAI: (patch: Partial<Pick<Project, 'evidence' | 'themes' | 'insights' | 'intercepted'>>) => void
}

const short = (q: string) => (q.length > 60 ? `${q.slice(0, 57)}…` : q)

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const patch = (fn: (p: Project) => Partial<Project>) => set((s) => ({ project: { ...s.project, ...fn(s.project) } }))
      const T = () => dict[get().lang].log
      const log = (actor: Origin, text: string, target?: LogEntry['target']) =>
        patch((p) => ({ log: [{ id: uid('l'), at: Date.now(), actor, text, target }, ...p.log].slice(0, 500) }))
      const q = () => (get().lang === 'zh' ? ['“', '”'] : ['"', '"'])

      return {
        lang: defaultLang(),
        setLang: (lang) => set((s) => ({ lang, project: s.project.isDemo ? demoProject(lang) : s.project, reviewed: s.project.isDemo ? [] : s.reviewed })),
        project: demoProject(defaultLang()),
        settings: { provider: 'anthropic', apiKey: '', model: 'claude-sonnet-5-5' },
        nav: { view: 'overview' },
        reviewed: [],

        go: (nav) => set({ nav }),
        setProgress: (progress) => set({ progress }),
        notify: (text, tone = 'ok', action) => set({ notice: text ? { text, tone, action } : undefined }),
        setSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),
        loadDemo: () => set((s) => ({ project: demoProject(s.lang), reviewed: [], nav: { view: 'overview' } })),
        startEmpty: () => set((s) => ({ project: emptyProject(s.lang), reviewed: [], nav: { view: 'sources' } })),
        renameProject: (name, question) => patch(() => ({ name, question })),
        log,

        addSource: (s) => {
          const id = uid('s')
          patch((p) => ({ sources: [...p.sources, { ...s, id, addedAt: Date.now() }] }))
          log('researcher', T().imported(s.title), { kind: 'source', id })
          return id
        },
        deleteSource: (id) => {
          const p = get().project
          const src = p.sources.find((s) => s.id === id)
          const gone = new Set(p.evidence.filter((e) => e.sourceId === id).map((e) => e.id))
          const hit = (i: Insight) => i.supporting.some((x) => gone.has(x)) || i.counter.some((x) => gone.has(x))
          const affected = p.insights.filter((i) => i.status !== 'rejected' && hit(i)).length
          patch((p) => ({
            sources: p.sources.filter((s) => s.id !== id),
            evidence: p.evidence.filter((e) => !gone.has(e.id)),
            intercepted: p.intercepted.filter((x) => x.sourceId !== id),
            themes: p.themes.map((t) => ({ ...t, evidenceIds: t.evidenceIds.filter((x) => !gone.has(x)) })),
            insights: p.insights.map((i) => hit(i)
              ? { ...i, supporting: i.supporting.filter((x) => !gone.has(x)), counter: i.counter.filter((x) => !gone.has(x)), needsReview: i.status === 'rejected' ? undefined : T().affected(src?.title || '') }
              : i),
          }))
          log('researcher', T().removedSource(src?.title || '', gone.size, affected))
        },

        addEvidence: (e) => {
          const id = uid('e')
          patch((p) => ({ evidence: [...p.evidence, { ...e, id }] }))
          if (e.origin === 'researcher') log('researcher', T().addedEv(short(e.quote)), { kind: 'evidence', id })
          return id
        },
        setEvidenceStatus: (id, status) => {
          const e = get().project.evidence.find((x) => x.id === id)
          patch((p) => ({ evidence: p.evidence.map((x) => (x.id === id ? { ...x, status } : x)) }))
          const f = status === 'confirmed' ? T().confirmedEv : status === 'rejected' ? T().rejectedEv : T().reopenedEv
          if (e) log('researcher', f(short(e.quote)), { kind: 'evidence', id })
        },
        confirmAllInSource: (sourceId) => {
          const p = get().project
          const ids = new Set(p.evidence.filter((e) => e.sourceId === sourceId && e.status === 'suggested').map((e) => e.id))
          if (!ids.size) return
          patch((p) => ({ evidence: p.evidence.map((e) => (ids.has(e.id) ? { ...e, status: 'confirmed' } : e)) }))
          const s = p.sources.find((x) => x.id === sourceId)
          log('researcher', T().bulkEv(ids.size, s?.participant || s?.title || ''), { kind: 'source', id: sourceId })
        },
        setEvidenceNote: (id, note) => {
          patch((p) => ({ evidence: p.evidence.map((x) => (x.id === id ? { ...x, note, status: x.status === 'rejected' ? 'rejected' : 'edited' } : x)) }))
          log('researcher', T().annotated, { kind: 'evidence', id })
        },

        addTheme: (name, evidenceIds = []) => {
          const id = uid('t')
          patch((p) => ({ themes: [...p.themes, { id, name, evidenceIds, origin: 'researcher', status: 'confirmed', locked: false }] }))
          log('researcher', T().createdTheme(name), { kind: 'theme', id })
          return id
        },
        updateTheme: (id, ch) => {
          patch((p) => ({ themes: p.themes.map((t) => (t.id === id ? { ...t, ...ch, status: 'edited' } : t)) }))
          if (ch.name) log('researcher', T().renamedTheme(ch.name), { kind: 'theme', id })
        },
        setThemeStatus: (id, status) => {
          const t = get().project.themes.find((x) => x.id === id)
          patch((p) => ({ themes: p.themes.map((x) => (x.id === id ? { ...x, status } : x)) }))
          if (t) log('researcher', (status === 'confirmed' ? T().confirmedTheme : status === 'rejected' ? T().rejectedTheme : T().reopenedTheme)(t.name), { kind: 'theme', id })
        },
        toggleLock: (id) => {
          const t = get().project.themes.find((x) => x.id === id)
          patch((p) => ({ themes: p.themes.map((x) => (x.id === id ? { ...x, locked: !x.locked } : x)) }))
          if (t) log('researcher', (t.locked ? T().unlocked : T().locked)(t.name), { kind: 'theme', id })
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
          const [a, b] = q()
          const name = (id: string | null) => (id ? `${a}${th.find((t) => t.id === id)?.name}${b}` : T().unsorted)
          log('researcher', T().moved(name(from), name(to)), { kind: 'evidence', id: eid })
        },
        mergeTheme: (fromId, intoId) => {
          const th = get().project.themes
          const from = th.find((t) => t.id === fromId)
          const into = th.find((t) => t.id === intoId)
          if (!from || !into) return
          patch((p) => ({
            themes: p.themes.filter((t) => t.id !== fromId).map((t) => (t.id === intoId ? { ...t, evidenceIds: [...new Set([...t.evidenceIds, ...from.evidenceIds])], status: 'edited' } : t)),
            insights: p.insights.map((i) => (i.themeIds.includes(fromId) ? { ...i, themeIds: [...new Set(i.themeIds.map((x) => (x === fromId ? intoId : x)))] } : i)),
          }))
          log('researcher', T().merged(from.name, into.name), { kind: 'theme', id: intoId })
        },
        splitTheme: (themeId, ids, name) => {
          const id = uid('t')
          patch((p) => ({
            themes: [
              ...p.themes.map((t) => (t.id === themeId ? { ...t, evidenceIds: t.evidenceIds.filter((x) => !ids.includes(x)), status: 'edited' as Status } : t)),
              { id, name, evidenceIds: ids, origin: 'researcher', status: 'confirmed', locked: false },
            ],
          }))
          log('researcher', T().split(ids.length, name), { kind: 'theme', id })
        },
        deleteTheme: (id) => {
          const t = get().project.themes.find((x) => x.id === id)
          patch((p) => ({ themes: p.themes.filter((x) => x.id !== id), insights: p.insights.map((i) => ({ ...i, themeIds: i.themeIds.filter((x) => x !== id) })) }))
          if (t) log('researcher', T().deletedTheme(t.name))
        },

        markReviewed: (id) => set((s) => (s.reviewed.includes(id) ? s : { reviewed: [...s.reviewed, id] })),
        setInsightStatus: (id, status, note) => {
          const i = get().project.insights.find((x) => x.id === id)
          patch((p) => ({ insights: p.insights.map((x) => (x.id === id ? { ...x, status, decisionNote: note ?? x.decisionNote, needsReview: status === 'suggested' ? x.needsReview : undefined } : x)) }))
          if (!i) return
          if (status === 'confirmed') log('researcher', T().confirmedIn(i.supporting.length, i.counter.length), { kind: 'insight', id })
          else if (status === 'rejected') log('researcher', T().rejectedIn(short(i.statement), note), { kind: 'insight', id })
          else log('researcher', T().reopenedIn(short(i.statement)), { kind: 'insight', id })
        },
        editInsight: (id, statement, reason) => {
          patch((p) => ({
            insights: p.insights.map((x) => {
              if (x.id !== id) return x
              const prevActor: Origin = x.versions?.length || x.status === 'edited' ? 'researcher' : x.origin
              const versions = [...(x.versions || []), { statement: x.statement, at: Date.now(), actor: prevActor }]
              return { ...x, statement, status: 'edited', decisionNote: reason || x.decisionNote, versions, needsReview: undefined }
            }),
          }))
          log('researcher', T().rewrote(short(statement), reason), { kind: 'insight', id })
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
          log('researcher', T().flipped, { kind: 'insight', id: iid })
        },
        unlinkEvidence: (iid, eid) => {
          patch((p) => ({ insights: p.insights.map((i) => (i.id === iid ? { ...i, supporting: i.supporting.filter((x) => x !== eid), counter: i.counter.filter((x) => x !== eid) } : i)) }))
          log('researcher', T().unlinked, { kind: 'insight', id: iid })
        },

        clearNew: () => patch((p) => ({ themes: p.themes.map((t) => (t.isNew ? { ...t, isNew: false } : t)), insights: p.insights.map((i) => (i.isNew ? { ...i, isNew: false } : i)), lastRun: undefined })),
        setLastRun: (lastRun) => patch(() => ({ lastRun })),
        replaceAI: (ch) => patch(() => ({ ...ch })),
      }
    },
    {
      name: 'aro-v1',
      version: 3,
      partialize: (s) => ({ project: s.project, settings: s.settings, lang: s.lang }),
      migrate: (old, version) => {
        const st = old as { project: Project; settings: Settings; lang?: Lang }
        const lang = st.lang || defaultLang()
        if (version < 3) {
          const project = st.project?.isDemo ? demoProject(lang) : { ...st.project, intercepted: st.project?.intercepted || [] }
          return { ...st, lang, project }
        }
        return st
      },
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

/** Flags that call for human attention on an insight. */
export function flags(p: Project, i: Insight) {
  const sup = coverage(p, i.supporting)
  const con = coverage(p, i.counter)
  return {
    single: sup.totalPeople > 1 && sup.people <= 1,
    disagreement: i.counter.length > 0 && (con.people >= 2 || i.counter.length >= i.supporting.length),
    needsReview: !!i.needsReview,
  }
}

/** Where a piece of evidence is used: the bidirectional half of the trace. */
export function usage(p: Project, evidenceId: string) {
  return {
    themes: p.themes.filter((t) => t.evidenceIds.includes(evidenceId)),
    supports: p.insights.filter((i) => i.supporting.includes(evidenceId)),
    challenges: p.insights.filter((i) => i.counter.includes(evidenceId)),
  }
}

/** Current UI strings. */
export const useT = () => dict[useStore((s) => s.lang)]
export const getT = () => dict[useStore.getState().lang]

/** The six-step flow and how much is left to review in each step. */
export const STEPS = ['sources', 'evidence', 'themes', 'workspace', 'validate', 'export'] as const
export type Step = (typeof STEPS)[number]

export function pendingFor(p: Project, step: Step) {
  switch (step) {
    case 'sources': return 0
    case 'evidence': return p.evidence.filter((e) => e.status === 'suggested').length
    case 'themes': return p.themes.filter((t) => t.status === 'suggested').length
    case 'workspace': return p.insights.filter((i) => i.status === 'suggested').length
    case 'validate': return p.insights.filter((i) => i.status !== 'rejected' && (i.status === 'suggested' || i.needsReview)).length
    case 'export': return 0
  }
}

export function stepDone(p: Project, step: Step) {
  switch (step) {
    case 'sources': return p.sources.length > 0
    case 'evidence': return p.evidence.length > 0 && pendingFor(p, 'evidence') === 0
    case 'themes': return p.themes.length > 0 && pendingFor(p, 'themes') === 0
    case 'workspace': return p.insights.length > 0 && pendingFor(p, 'workspace') === 0
    case 'validate': return p.insights.some((i) => i.status === 'confirmed' || i.status === 'edited') && pendingFor(p, 'validate') === 0
    case 'export': return false
  }
}
