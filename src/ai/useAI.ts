import { getT, useStore } from '../store'
import { LLMError } from './llm'
import { clusterThemes, extractEvidence, synthesizeInsights } from './pipeline'

const msg = (e: unknown) => (e instanceof LLMError ? e.message : getT().ai.failed)

function guard(onNeedKey: () => void) {
  const s = useStore.getState()
  if (!s.settings.apiKey) {
    s.notify(s.project.isDemo ? getT().ai.needKeyDemo : getT().ai.needKey, 'error')
    onNeedKey()
    return false
  }
  return true
}

export async function runExtract(sourceId: string) {
  const s = useStore.getState()
  const source = s.project.sources.find((x) => x.id === sourceId)
  if (!source) return 0
  s.setBusy(getT().ai.reading(source.title))
  try {
    const { kept, discarded } = await extractEvidence(s.settings, useStore.getState().project, source)
    const st = useStore.getState()
    st.replaceAI({ evidence: [...st.project.evidence, ...kept] })
    st.log('ai', getT().log.extracted(kept.length, source.title, discarded), { kind: 'source', id: source.id })
    return kept.length
  } finally {
    useStore.getState().setBusy()
  }
}

export async function runCluster() {
  const s = useStore.getState()
  s.setBusy(getT().ai.grouping)
  try {
    const r = await clusterThemes(s.settings, s.project)
    const st = useStore.getState()
    st.replaceAI({ themes: r.themes })
    st.log('ai', getT().log.clustered(r.added, r.kept))
  } finally {
    useStore.getState().setBusy()
  }
}

export async function runInsights() {
  const s = useStore.getState()
  s.setBusy(getT().ai.drafting)
  try {
    const r = await synthesizeInsights(s.settings, s.project)
    const st = useStore.getState()
    st.replaceAI({ insights: r.insights })
    st.log('ai', getT().log.synthesized(r.added))
  } finally {
    useStore.getState().setBusy()
  }
}

export function useAIAction(onNeedKey: () => void) {
  return async (fn: () => Promise<unknown>, done?: string) => {
    if (!guard(onNeedKey)) return
    try {
      await fn()
      if (done) useStore.getState().notify(done)
    } catch (e) {
      useStore.getState().notify(msg(e), 'error')
    }
  }
}

/** Full pass: extract from sources with no evidence yet, then re-cluster, then draft insights. */
export function useRunAll(onNeedKey: () => void) {
  const act = useAIAction(onNeedKey)
  return () => act(async () => {
    const p = useStore.getState().project
    const fresh = p.sources.filter((s) => !p.evidence.some((e) => e.sourceId === s.id))
    for (const s of fresh) await runExtract(s.id)
    if (!useStore.getState().project.evidence.length) throw new LLMError(getT().ai.noSources)
    await runCluster()
    await runInsights()
    useStore.getState().go({ view: 'evidence' })
  }, getT().ai.allDone)
}
