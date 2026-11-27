import { useStore } from '../store'
import { LLMError } from './llm'
import { clusterThemes, extractEvidence, synthesizeInsights } from './pipeline'

const msg = (e: unknown) => (e instanceof LLMError ? e.message : 'Something went wrong while running the AI. Try again.')

function guard(onNeedKey: () => void) {
  const s = useStore.getState()
  if (!s.settings.apiKey) {
    s.notify(s.project.isDemo
      ? 'The demo study already contains AI results. Connect your own API key to analyse new material.'
      : 'Connect an API key to run AI analysis. You can still add evidence by selecting text in a source.', 'error')
    onNeedKey()
    return false
  }
  return true
}

export async function runExtract(sourceId: string) {
  const s = useStore.getState()
  const source = s.project.sources.find((x) => x.id === sourceId)
  if (!source) return 0
  s.setBusy(`Reading ${source.title}…`)
  try {
    const { kept, discarded } = await extractEvidence(s.settings, useStore.getState().project, source)
    const st = useStore.getState()
    st.replaceAI({ evidence: [...st.project.evidence, ...kept] })
    st.log('ai', `Extracted ${kept.length} quotes from "${source.title}".${discarded ? ` ${discarded} proposed ${discarded === 1 ? 'quote was' : 'quotes were'} discarded because ${discarded === 1 ? 'it' : 'they'} did not match the source text.` : ''}`, { kind: 'source', id: source.id })
    return kept.length
  } finally {
    useStore.getState().setBusy()
  }
}

export async function runCluster() {
  const s = useStore.getState()
  s.setBusy('Grouping evidence…')
  try {
    const r = await clusterThemes(s.settings, s.project)
    const st = useStore.getState()
    st.replaceAI({ themes: r.themes })
    st.log('ai', `Proposed ${r.added} new themes. ${r.kept} themes you had confirmed, edited or locked were kept as they were.`)
  } finally {
    useStore.getState().setBusy()
  }
}

export async function runInsights() {
  const s = useStore.getState()
  s.setBusy('Drafting insights…')
  try {
    const r = await synthesizeInsights(s.settings, s.project)
    const st = useStore.getState()
    st.replaceAI({ insights: r.insights })
    st.log('ai', `Drafted ${r.added} insights with supporting and counter evidence.`)
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
    if (!useStore.getState().project.evidence.length) throw new LLMError('Import at least one source before running the analysis.')
    await runCluster()
    await runInsights()
    useStore.getState().go({ view: 'evidence' })
  }, 'Analysis finished. New AI drafts are marked in pencil, ready for your review.')
}
