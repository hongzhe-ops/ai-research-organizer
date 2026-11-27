import { locate } from '../lib/text'
import { getT, uid } from '../store'
import type { Evidence, Insight, Intercepted, Project, Settings, Source, Theme } from '../types'
import { complete, parseJSON } from './llm'

const MAX_SOURCE_CHARS = 40_000
const langRule = () => `\nWrite every rationale, name, description and statement in ${getT().ai.outLang}. Quotes must stay exactly as written in the source, in its original language.`

/* ---------- 1. Evidence extraction ---------- */

const EXTRACT_SYSTEM = `You help a researcher find evidence in research material of any kind: interviews, observation notes, paper or report excerpts, survey answers, user reviews, articles or notes.
Return only quotes copied character-for-character from the source. Never paraphrase, merge or fix grammar.
For first-hand material, choose passages that reveal behaviour, needs, pain points, workarounds, attitudes or contradictions.
For papers, reports and articles, choose findings, claims, figures and limitations that bear on the research question.
Skip interviewer questions, headings, references and filler. Each quote should be one to three sentences.
Reply with JSON only: [{"quote": "...", "rationale": "why this matters, max 15 words"}]`

export async function extractEvidence(settings: Settings, project: Project, source: Source, signal?: AbortSignal) {
  const user = `Research question: ${project.question || 'not specified'}
Source: ${source.title} [type: ${source.type}]${source.participant ? ` (participant: ${source.participant})` : ''}${source.citation ? ` (${source.citation})` : ''}

<source>
${source.content.slice(0, MAX_SOURCE_CHARS)}
</source>

Extract 4 to 12 evidence quotes.`
  const raw = parseJSON<Array<{ quote: string; rationale?: string }>>(await complete(settings, EXTRACT_SYSTEM + langRule(), user, signal))
  const existing = new Set(project.evidence.filter((e) => e.sourceId === source.id).map((e) => e.quote))
  const kept: Evidence[] = []
  const blocked: Intercepted[] = []
  for (const r of Array.isArray(raw) ? raw : []) {
    if (!r?.quote) continue
    // Provenance check: a quote that is not in the source is never shown as evidence.
    const hit = locate(source.content, r.quote)
    if (!hit) { blocked.push({ id: uid('x'), sourceId: source.id, quote: r.quote, at: Date.now() }); continue }
    if (existing.has(hit.text)) continue
    existing.add(hit.text)
    kept.push({ id: uid('e'), sourceId: source.id, quote: hit.text, rationale: r.rationale, origin: 'ai', status: 'suggested' })
  }
  return { kept, blocked }
}

/* ---------- 2. Theme clustering ---------- */

const CLUSTER_SYSTEM = `You help a qualitative researcher group evidence into themes, like an affinity map.
A theme names a pattern in plain language (max 9 words) and is supported by at least two quotes where possible.
Some themes are fixed by the researcher: never rename, split or remove them, but you may suggest new quotes for them.
Only use evidence ids that are given to you. A quote may belong to more than one theme.
Reply with JSON only:
{"fixed": [{"id": "theme id", "add": ["evidence ids"]}], "new": [{"name": "...", "description": "one sentence", "evidenceIds": ["..."]}]}`

export async function clusterThemes(settings: Settings, project: Project, signal?: AbortSignal) {
  const ev = project.evidence.filter((e) => e.status !== 'rejected')
  const fixed = project.themes.filter((t) => t.locked || t.status === 'confirmed' || t.status === 'edited')
  const user = `Research question: ${project.question || 'not specified'}

Fixed themes:
${fixed.map((t) => `- ${t.id}: ${t.name} (has ${t.evidenceIds.join(', ') || 'no quotes'})`).join('\n') || 'none'}

Themes the researcher rejected (never propose these again):
${project.themes.filter((t) => t.status === 'rejected').map((t) => `- ${t.name}`).join('\n') || 'none'}

Evidence:
${ev.map((e) => `- ${e.id}: "${e.quote}"`).join('\n')}

Propose new themes for the evidence that is not covered by fixed themes.`
  const raw = parseJSON<{ fixed?: Array<{ id: string; add?: string[] }>; new?: Array<{ name: string; description?: string; evidenceIds?: string[] }> }>(
    await complete(settings, CLUSTER_SYSTEM + langRule(), user, signal),
  )
  const valid = new Set(ev.map((e) => e.id))
  const keep = (ids?: string[]) => [...new Set((ids || []).filter((x) => valid.has(x)))]

  const themes: Theme[] = project.themes
    .filter((t) => fixed.includes(t) || t.status === 'rejected')
    .map((t) => {
      // Locked themes are never touched. Other kept themes may receive suggestions.
      if (t.locked || t.status === 'rejected') return t
      const add = keep(raw.fixed?.find((f) => f.id === t.id)?.add).filter((x) => !t.evidenceIds.includes(x))
      return add.length ? { ...t, evidenceIds: [...t.evidenceIds, ...add] } : t
    })
  for (const n of raw.new || []) {
    const ids = keep(n.evidenceIds)
    if (!n.name || !ids.length) continue
    themes.push({ id: uid('t'), name: n.name, description: n.description, evidenceIds: ids, origin: 'ai', status: 'suggested', locked: false, isNew: true })
  }
  const added = themes.filter((t) => t.isNew).length
  const replaced = project.themes.filter((t) => t.status === 'suggested' && !fixed.includes(t)).length
  return { themes, added, kept: fixed.length, replaced }
}

/* ---------- 3. Insight synthesis ---------- */

const INSIGHT_SYSTEM = `You help a qualitative researcher draft insights from themed evidence.
An insight is a single, specific, falsifiable statement about people (max 25 words), not a restated theme.
For every insight list the evidence that supports it AND any evidence that challenges, limits or contradicts it.
Actively look for counter-evidence. Do not overstate: if only one participant or one source says something, say so in the wording.\nEach quote is labelled with its source type. Distinguish first-hand evidence (interviews, observation, surveys, reviews) from secondary evidence (papers, articles), and do not present a single paper's claim as what users do.
Only use ids that are given to you. Reply with JSON only:
[{"statement": "...", "themeIds": ["..."], "supporting": ["evidence ids"], "counter": ["evidence ids"]}]`

export async function synthesizeInsights(settings: Settings, project: Project, signal?: AbortSignal) {
  const ev = project.evidence.filter((e) => e.status !== 'rejected')
  const themes = project.themes.filter((t) => t.status !== 'rejected')
  const kept = project.insights.filter((i) => i.status !== 'suggested')
  const who = (e: Evidence) => { const s = project.sources.find((x) => x.id === e.sourceId); return s ? `${s.type}: ${s.participant || s.citation || s.title}` : '' }
  const user = `Research question: ${project.question || 'not specified'}

Themes:
${themes.map((t) => `- ${t.id}: ${t.name} -> ${t.evidenceIds.join(', ')}`).join('\n')}

Evidence:
${ev.map((e) => `- ${e.id} [${who(e)}]: "${e.quote}"`).join('\n')}

Insights the researcher already decided on (do not repeat these):
${kept.map((i) => `- ${i.statement}`).join('\n') || 'none'}

Draft 3 to 6 new insights.`
  const raw = parseJSON<Array<{ statement: string; themeIds?: string[]; supporting?: string[]; counter?: string[] }>>(
    await complete(settings, INSIGHT_SYSTEM + langRule(), user, signal),
  )
  const validE = new Set(ev.map((e) => e.id))
  const validT = new Set(themes.map((t) => t.id))
  const fresh: Insight[] = []
  for (const r of Array.isArray(raw) ? raw : []) {
    const supporting = [...new Set((r.supporting || []).filter((x) => validE.has(x)))]
    // An insight with no evidence behind it is dropped, never shown.
    if (!r.statement || !supporting.length) continue
    const counter = [...new Set((r.counter || []).filter((x) => validE.has(x) && !supporting.includes(x)))]
    fresh.push({ id: uid('i'), statement: r.statement, themeIds: (r.themeIds || []).filter((x) => validT.has(x)), supporting, counter, origin: 'ai', status: 'suggested', isNew: true })
  }
  const replaced = project.insights.filter((i) => i.status === 'suggested').length
  return { insights: [...kept, ...fresh], added: fresh.length, kept: kept.filter((i) => i.status !== 'rejected').length, replaced }
}

/** Guard against drawing insights from too little evidence. */
export function evidenceSufficiency(project: Project) {
  const ev = project.evidence.filter((e) => e.status === 'confirmed' || e.status === 'edited')
  const people = new Set(ev.map((e) => project.sources.find((s) => s.id === e.sourceId)?.participant || e.sourceId))
  return { quotes: ev.length, people: people.size, enough: ev.length >= 6 && people.size >= 2 }
}
