import { ArrowRight, ChevronDown, Copy, Crosshair, Download, Printer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { StepGuide } from '../components/Flow'
import { Button, Empty, cx } from '../components/ui'
import { locate } from '../lib/text'
import { coverage, sourceLabel, typeSummary, useStore, useT } from '../store'
import type { Evidence } from '../types'

/** A quote that opens its surrounding passage in place, with the quote highlighted. */
function QuoteInContext({ e, stance, insightId }: { e: Evidence; stance: 'support' | 'counter'; insightId: string }) {
  const { project: p, go } = useStore()
  const t = useT().exporter
  const [open, setOpen] = useState(false)
  const src = p.sources.find((x) => x.id === e.sourceId)
  const ctx = useMemo(() => {
    if (!src) return null
    const hit = locate(src.content, e.quote)
    if (!hit) return null
    const c = src.content
    // One line before and after the quote, trimmed to a readable length.
    let start = c.lastIndexOf('\n', hit.start - 1)
    start = start <= 0 ? 0 : c.lastIndexOf('\n', start - 1) + 1
    let end = c.indexOf('\n', hit.end)
    end = end < 0 ? c.length : (c.indexOf('\n', end + 1) < 0 ? c.length : c.indexOf('\n', end + 1))
    start = Math.max(start, hit.start - 240)
    end = Math.min(end, hit.end + 240)
    return { before: (start > 0 ? '…' : '') + c.slice(start, hit.start), quote: c.slice(hit.start, hit.end), after: c.slice(hit.end, end) + (end < c.length ? '…' : '') }
  }, [src, e.quote])
  const tone = stance === 'support' ? 'border-ink' : 'border-counter'
  return (
    <li>
      <button onClick={() => setOpen(!open)} aria-expanded={open}
        className={cx('flex w-full items-start gap-2 border-l-2 pl-2.5 text-left text-[13px] leading-snug', tone, stance === 'support' ? 'hover:bg-ink-soft/50' : 'hover:bg-counter-soft/50')}>
        <span className="flex-1">
          <span className="quote">“{e.quote}”</span>
          <span className="block text-[11px] text-muted">{sourceLabel(src)}</span>
        </span>
        <ChevronDown size={14} className={cx('mt-0.5 shrink-0 text-muted transition-transform print:hidden', open && 'rotate-180')} />
      </button>
      {open && ctx && src && (
        <div className="mt-1.5 ml-3 rounded-md border border-line bg-paper p-3 print:hidden">
          <p className="mb-1.5 text-[11px] text-muted">{src.title}</p>
          <p className="quote text-[13.5px] leading-relaxed whitespace-pre-wrap text-muted">
            {ctx.before}<mark className={stance === 'support' ? 'hl-support text-text' : 'hl-counter text-text'}>{ctx.quote}</mark>{ctx.after}
          </p>
          <button onClick={() => go({ view: 'workspace', insightId, sourceId: src.id, focusEvidenceId: e.id })} className="mt-2 inline-flex items-center gap-1 text-xs text-ink hover:underline">
            {t.fullSource} <ArrowRight size={12} />
          </button>
        </div>
      )}
    </li>
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
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div>
                      <h4 className="mb-1.5 text-xs font-semibold text-ink">{t.support}</h4>
                      <ul className="space-y-1.5">{ev(i.supporting).map((e) => <QuoteInContext key={e.id} e={e} stance="support" insightId={i.id} />)}</ul>
                    </div>
                    <div>
                      <h4 className="mb-1.5 text-xs font-semibold text-counter">{t.counter}</h4>
                      {i.counter.length ? <ul className="space-y-1.5">{ev(i.counter).map((e) => <QuoteInContext key={e.id} e={e} stance="counter" insightId={i.id} />)}</ul> : <p className="text-[13px] text-muted">{t.none}</p>}
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
