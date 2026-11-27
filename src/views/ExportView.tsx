import { Copy, Crosshair, Download, Printer } from 'lucide-react'
import { StepGuide } from '../components/Flow'
import { Button, Empty, SourceIcon, cx } from '../components/ui'
import { locate } from '../lib/text'
import { coverage, sourceLabel, typeSummary, useStore, useT } from '../store'
import type { Evidence, Insight, Project, Source } from '../types'

type Hit = { e: Evidence; stance: 'support' | 'counter'; pos: number }

/** Every piece of evidence for an insight, with its stance and relative position in its source (0–1). */
function hitsFor(p: Project, i: Insight): Hit[] {
  const out: Hit[] = []
  for (const [ids, stance] of [[i.supporting, 'support'], [i.counter, 'counter']] as const) {
    for (const id of ids) {
      const e = p.evidence.find((x) => x.id === id)
      const s = e && p.sources.find((x) => x.id === e.sourceId)
      if (!e || !s) continue
      const at = locate(s.content, e.quote)?.start ?? 0
      out.push({ e, stance, pos: s.content.length ? at / s.content.length : 0 })
    }
  }
  return out
}

/** Findings × sources: how much support and challenge each source gives each finding. */
function EvidenceMatrix({ findings }: { findings: Insight[] }) {
  const { project: p, go } = useStore()
  const T = useT()
  const t = T.exporter
  const all = findings.map((i) => hitsFor(p, i))
  const used = p.sources.filter((s) => all.some((h) => h.some((x) => x.e.sourceId === s.id)))
  const jump = (i: Insight, hit?: Hit) => go({ view: 'workspace', insightId: i.id, sourceId: hit?.e.sourceId, focusEvidenceId: hit?.e.id })

  return (
    <section className="mb-6 rounded-xl border border-line bg-white p-5 print:hidden">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold">{t.mapT}</h2>
          <p className="mt-0.5 text-xs text-muted">{t.mapB}</p>
        </div>
        <div className="flex gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-mark" />{t.sup}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#F7D5DC] ring-1 ring-counter/40" />{t.con}</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-auto border-separate border-spacing-1 text-[13px]">
          <thead>
            <tr>
              <th className="w-[260px] min-w-[220px]" />
              {findings.map((i, k) => (
                <th key={i.id} scope="col" className="w-[84px] min-w-[72px] px-1 pb-1 text-center align-bottom font-medium">
                  <button onClick={() => jump(i, all[k][0])} title={i.statement} className="rounded px-1.5 py-0.5 text-ink tabular-nums hover:bg-ink-soft">{k + 1}</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {used.map((s) => (
              <tr key={s.id}>
                <th scope="row" className="pr-2 text-left font-normal">
                  <span className="flex items-center gap-1.5"><span className="text-muted"><SourceIcon type={s.type} size={12} /></span><span className="truncate" title={s.title}>{s.title}</span></span>
                </th>
                {findings.map((i, k) => {
                  const hs = all[k].filter((h) => h.e.sourceId === s.id)
                  const sup = hs.filter((h) => h.stance === 'support').length
                  const con = hs.length - sup
                  return (
                    <td key={i.id} className="p-0">
                      {hs.length ? (
                        <button onClick={() => jump(i, hs[0])} title={hs.map((h) => `“${h.e.quote}”`).join('\n')}
                          className="flex h-9 w-full items-center justify-center gap-1 rounded-md border border-line hover:border-ink">
                          {sup > 0 && <span className="rounded bg-mark px-1.5 text-[12px] font-semibold text-[#5C4A00] tabular-nums">{sup}</span>}
                          {con > 0 && <span className="rounded bg-[#F7D5DC] px-1.5 text-[12px] font-semibold text-counter tabular-nums">{con}</span>}
                        </button>
                      ) : <span className="block h-9 rounded-md bg-paper" title={t.none2} />}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ol className="mt-3 grid gap-x-6 gap-y-1 border-t border-line pt-3 text-xs text-muted md:grid-cols-2">
        {findings.map((i, k) => (
          <li key={i.id}><button onClick={() => document.getElementById(`finding-${i.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="text-left hover:text-ink">
            <span className="mr-1.5 font-medium text-ink tabular-nums">{k + 1}</span>{i.statement}</button></li>
        ))}
      </ol>
    </section>
  )
}

/** One finding: a strip per source showing where in the text each quote sits. */
function FindingStrips({ insight }: { insight: Insight }) {
  const { project: p, go } = useStore()
  const t = useT().exporter
  const hits = hitsFor(p, insight)
  const bySource = p.sources.map((s) => [s, hits.filter((h) => h.e.sourceId === s.id)] as [Source, Hit[]]).filter(([, h]) => h.length)
  return (
    <div className="mt-3 rounded-lg bg-paper p-3 print:hidden">
      <p className="mb-2 text-[11px] font-medium text-muted">{t.stripT}</p>
      <ul className="space-y-1.5">
        {bySource.map(([s, hs]) => (
          <li key={s.id} className="flex items-center gap-3">
            <span className="flex w-[150px] shrink-0 items-center gap-1.5 text-xs"><span className="text-muted"><SourceIcon type={s.type} size={11} /></span><span className="truncate" title={s.title}>{s.title}</span></span>
            <span className="relative h-4 flex-1 rounded-full bg-white ring-1 ring-line">
              {hs.map((h) => (
                <button key={h.e.id} onClick={() => go({ view: 'workspace', insightId: insight.id, sourceId: s.id, focusEvidenceId: h.e.id })}
                  title={`“${h.e.quote}”`} aria-label={h.e.quote}
                  className={cx('absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white transition-transform hover:scale-125', h.stance === 'support' ? 'bg-[#E0B800]' : 'bg-counter')}
                  style={{ left: `${Math.min(97, Math.max(3, h.pos * 100))}%` }} />
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ExportView() {
  const { project: p, notify, go } = useStore()
  const T = useT()
  const t = T.exporter
  const W = T.workspace
  const decided = p.insights.filter((i) => i.status === 'confirmed' || i.status === 'edited')
  const undecided = p.insights.filter((i) => i.status === 'suggested').length
  const ev = (ids: string[]) => ids.map((id) => p.evidence.find((e) => e.id === id)).filter(Boolean) as Evidence[]
  const who = (e: Evidence) => sourceLabel(p.sources.find((x) => x.id === e.sourceId))
  const people = new Set(p.sources.map((s) => s.participant).filter(Boolean)).size
  const usedQuotes = new Set(decided.flatMap((i) => [...i.supporting, ...i.counter])).size
  const decisions = p.log.filter((l) => l.actor === 'researcher').length
  const usedAI = p.evidence.some((e) => e.origin === 'ai') || p.themes.some((x) => x.origin === 'ai') || p.insights.some((i) => i.origin === 'ai')
  const note = usedAI ? t.aiNote : t.manualNote
  const today = new Intl.DateTimeFormat(T.date, { dateStyle: 'long' }).format(new Date())
  const allTypes = typeSummary(p, p.sources.map((s) => s.id), T)
  const method = t.methodBody(p.sources.length, people, usedQuotes, p.intercepted.length, decisions, allTypes)
  const covText = (ids: string[]) => {
    const c = coverage(p, ids)
    const people = c.totalPeople ? `${W.saidBy} ${W.participants(c.people, c.totalPeople)}${W.partWord ? ` ${W.partWord}` : ''} · ` : ''
    return `${people}${W.fromSources(c.sources, typeSummary(p, c.sourceIds, T))}`
  }

  const markdown = () => {
    const L: string[] = [`# ${p.name}`, '', `**${t.research}${T.common.colon}**${p.question}`, `*${t.generated}${T.common.colon}${today}*`, '', `## ${t.method}`, '', method, '', `> ${note}`, '', `## ${t.findings}`, '']
    decided.forEach((i, k) => {
      L.push(`### ${k + 1}. ${i.statement}`, '', `*${covText(i.supporting)}*`, '')
      if (i.decisionNote) L.push(`${W.decisionNote}${T.common.colon}${i.decisionNote}`, '')
      L.push(`**${t.support}**`, '', ...ev(i.supporting).map((e) => `- “${e.quote}” — ${who(e)}`), '')
      L.push(`**${t.counter}**`, '', ...(i.counter.length ? ev(i.counter).map((e) => `- “${e.quote}” — ${who(e)}`) : [`- ${t.none}`]), '')
    })
    return L.join('\n')
  }
  const download = () => {
    const blob = new Blob([markdown()], { type: 'text/markdown;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${p.name.replace(/[\\/:*?"<>|]+/g, '-')}.md`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const copy = async () => { try { await navigator.clipboard.writeText(markdown()); notify(t.copied) } catch { /* clipboard blocked */ } }

  return (
    <>
      <div className="print:hidden">
        <StepGuide step="export" actions={decided.length ? <>
          <Button onClick={copy}><Copy size={14} />{t.copy}</Button>
          <Button onClick={() => window.print()}><Printer size={14} />{t.print}</Button>
          <Button variant="primary" onClick={download}><Download size={14} />{t.md}</Button>
        </> : undefined} />
        {undecided > 0 && decided.length > 0 && (
          <p className="mb-4 rounded-lg border border-dashed border-graphite/50 bg-white px-4 py-2.5 text-[13px] text-muted">
            {t.excluded(undecided)} <button onClick={() => go({ view: 'validate' })} className="text-ink underline underline-offset-2">05 {T.steps.validate.label}</button>
          </p>
        )}
      </div>
      {!decided.length ? <Empty title={t.noneT} body={t.noneB} action={<Button variant="primary" onClick={() => go({ view: 'workspace' })}>04 {T.steps.workspace.label}</Button>} /> : (
        <>
          <EvidenceMatrix findings={decided} />
          <article className="mx-auto max-w-[820px] rounded-xl border border-line bg-white px-10 py-10 print:max-w-none print:border-0 print:p-0">
            <p className="text-xs text-muted">{t.generated}{T.common.colon}{today}</p>
            <h1 className="mt-2 text-[26px] leading-tight font-semibold tracking-[-0.01em]">{p.name}</h1>
            <p className="mt-2 text-[14px] text-muted">{t.research}{T.common.colon}{p.question}</p>

            <h2 className="mt-8 border-b border-line pb-2 text-[16px] font-semibold">{t.method}</h2>
            <p className="mt-3 text-[14px] leading-relaxed">{method}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">{note}</p>

            <h2 className="mt-8 border-b border-line pb-2 text-[16px] font-semibold">{t.findings}</h2>
            <ol className="mt-4 space-y-9">
              {decided.map((i, k) => (
                <li key={i.id} id={`finding-${i.id}`} className="break-inside-avoid">
                  <div className="flex items-start gap-3">
                    <h3 className="quote flex-1 text-[18px] leading-snug font-medium"><span className="mr-2 font-sans text-[14px] text-muted tabular-nums">{k + 1}</span>{i.statement}</h3>
                    <Button size="sm" variant="ghost" className="shrink-0 print:hidden" onClick={() => go({ view: 'workspace', insightId: i.id })}><Crosshair size={13} />{t.trace}</Button>
                  </div>
                  <p className="mt-1.5 text-xs text-muted">{covText(i.supporting)}</p>
                  {i.decisionNote && <p className="mt-1 text-xs text-ink">{W.decisionNote}{T.common.colon}{i.decisionNote}</p>}
                  <FindingStrips insight={i} />
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div>
                      <h4 className="mb-1.5 text-xs font-semibold text-ink">{t.support}</h4>
                      <ul className="space-y-1.5">{ev(i.supporting).map((e) => (
                        <li key={e.id}><button onClick={() => go({ view: 'workspace', insightId: i.id, sourceId: e.sourceId, focusEvidenceId: e.id })} className="block w-full border-l-2 border-ink pl-2.5 text-left text-[13px] leading-snug hover:bg-ink-soft/50">
                          <span className="quote">“{e.quote}”</span><span className="block text-[11px] text-muted">{who(e)}</span></button></li>
                      ))}</ul>
                    </div>
                    <div>
                      <h4 className="mb-1.5 text-xs font-semibold text-counter">{t.counter}</h4>
                      {i.counter.length ? <ul className="space-y-1.5">{ev(i.counter).map((e) => (
                        <li key={e.id}><button onClick={() => go({ view: 'workspace', insightId: i.id, sourceId: e.sourceId, focusEvidenceId: e.id })} className="block w-full border-l-2 border-counter pl-2.5 text-left text-[13px] leading-snug hover:bg-counter-soft/50">
                          <span className="quote">“{e.quote}”</span><span className="block text-[11px] text-muted">{who(e)}</span></button></li>
                      ))}</ul> : <p className="text-[13px] text-muted">{t.none}</p>}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </article>
        </>
      )}
    </>
  )
}
