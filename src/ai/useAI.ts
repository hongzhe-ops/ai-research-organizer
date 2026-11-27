import { getT, useStore } from '../store'
import { LLMError } from './llm'
import { clusterThemes, extractEvidence, synthesizeInsights } from './pipeline'

/*
 * Every AI action runs as a list of stages with visible progress.
 * Stages commit their results as soon as they finish, so cancelling or a failure
 * part-way never loses work that is already done.
 */

let controller: AbortController | null = null

export function cancelRun() {
  controller?.abort()
}

type Stage = { label: string; run: (signal: AbortSignal, lines: string[]) => Promise<void> }

const st = () => useStore.getState()

function extractStage(sourceId: string): Stage {
  const source = st().project.sources.find((s) => s.id === sourceId)!
  return {
    label: getT().ai.reading(source.participant || source.title),
    run: async (signal, lines) => {
      const { kept, blocked } = await extractEvidence(st().settings, st().project, source, signal)
      const p = st().project
      st().replaceAI({ evidence: [...p.evidence, ...kept], intercepted: [...p.intercepted, ...blocked] })
      st().log('ai', getT().log.extracted(kept.length, source.title, blocked.length), { kind: 'source', id: source.id })
      lines.push(getT().runLines.extracted(kept.length, source.participant || source.title))
      if (blocked.length) lines.push(getT().runLines.blocked(blocked.length))
    },
  }
}

const clusterStage = (): Stage => ({
  label: getT().ai.grouping,
  run: async (signal, lines) => {
    const r = await clusterThemes(st().settings, st().project, signal)
    st().replaceAI({ themes: r.themes })
    st().log('ai', getT().log.clustered(r.added, r.kept))
    const L = getT().runLines
    lines.push(L.themesNew(r.added))
    if (r.kept) lines.push(L.themesKept(r.kept))
    if (r.replaced) lines.push(L.themesReplaced(r.replaced))
  },
})

const insightStage = (): Stage => ({
  label: getT().ai.drafting,
  run: async (signal, lines) => {
    const r = await synthesizeInsights(st().settings, st().project, signal)
    st().replaceAI({ insights: r.insights })
    st().log('ai', getT().log.synthesized(r.added))
    const L = getT().runLines
    lines.push(L.insNew(r.added))
    if (r.kept) lines.push(L.insKept(r.kept))
    if (r.replaced) lines.push(L.insReplaced(r.replaced))
  },
})

function needKey(onNeedKey: () => void) {
  if (st().settings.apiKey) return false
  st().notify(st().project.isDemo ? getT().ai.needKeyDemo : getT().ai.needKey, 'error')
  onNeedKey()
  return true
}

async function runStages(build: () => Stage[], done: string, retry: () => void) {
  const stages = build()
  if (!stages.length) return
  controller = new AbortController()
  const lines: string[] = []
  st().notify()
  try {
    for (let i = 0; i < stages.length; i++) {
      st().setProgress({ stages: stages.map((s) => s.label), current: i })
      await stages[i].run(controller.signal, lines)
    }
    st().setLastRun({ at: Date.now(), lines })
    st().notify(done)
  } catch (e) {
    if (lines.length) st().setLastRun({ at: Date.now(), lines })
    if (e instanceof LLMError && e.cancelled) st().notify(getT().progress.cancelled)
    else st().notify(e instanceof LLMError ? `${e.message} ${getT().ai.failed}` : getT().ai.failed, 'error', { label: getT().app.retry, run: retry })
  } finally {
    controller = null
    st().setProgress()
  }
}

export function useAI(onNeedKey: () => void) {
  const extract = (sourceId: string) => {
    if (needKey(onNeedKey)) return
    runStages(() => [extractStage(sourceId)], getT().sources.extractDone, () => extract(sourceId))
  }
  const cluster = () => {
    if (needKey(onNeedKey)) return
    runStages(() => [clusterStage()], getT().themes.suggestDone, cluster)
  }
  const insights = () => {
    if (needKey(onNeedKey)) return
    runStages(() => [insightStage()], getT().workspace.draftDone, insights)
  }
  /** Full pass: read new sources, then re-group, then draft insights. */
  const all = () => {
    if (needKey(onNeedKey)) return
    const p = st().project
    if (!p.sources.length) return st().notify(getT().ai.noSources, 'error')
    runStages(() => {
      const p = st().project
      const fresh = p.sources.filter((s) => !p.evidence.some((e) => e.sourceId === s.id) && !p.intercepted.some((x) => x.sourceId === s.id))
      return [...fresh.map((s) => extractStage(s.id)), clusterStage(), insightStage()]
    }, getT().ai.allDone, all)
  }
  return { extract, cluster, insights, all }
}
