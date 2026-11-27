import { Copy, Download, Printer } from 'lucide-react'
import { StepGuide } from '../components/Flow'
import { Button, Empty } from '../components/ui'
import { coverage, useStore, useT } from '../store'
import type { Evidence } from '../types'

export function ExportView() {
  const { project: p, notify, go } = useStore()
  const T = useT()
  const t = T.exporter
  const W = T.workspace
  const decided = p.insights.filter((i) => i.status === 'confirmed' || i.status === 'edited')
  const undecided = p.insights.filter((i) => i.status === 'suggested').length
  const ev = (ids: string[]) => ids.map((id) => p.evidence.find((e) => e.id === id)).filter(Boolean) as Evidence[]
  const who = (e: Evidence) => { const s = p.sources.find((x) => x.id === e.sourceId); return s?.participant || s?.title || '' }
  const people = new Set(p.sources.map((s) => s.participant).filter(Boolean)).size
  const usedQuotes = new Set(decided.flatMap((i) => [...i.supporting, ...i.counter])).size
  const decisions = p.log.filter((l) => l.actor === 'researcher').length
  const usedAI = p.evidence.some((e) => e.origin === 'ai') || p.themes.some((x) => x.origin === 'ai') || p.insights.some((i) => i.origin === 'ai')
  const note = usedAI ? t.aiNote : t.manualNote
  const today = new Intl.DateTimeFormat(T.date, { dateStyle: 'long' }).format(new Date())
  const covText = (ids: string[]) => { const c = coverage(p, ids); return `${W.saidBy} ${W.participants(c.people, c.totalPeople)}${W.partWord ? ` ${W.partWord}` : ''} · ${W.sources(c.sources)}` }

  const markdown = () => {
    const L: string[] = [`# ${p.name}`, '', `**${t.research}${T.common.colon}**${p.question}`, `*${t.generated}${T.common.colon}${today}*`, '', `## ${t.method}`, '',
      t.methodBody(p.sources.length, people, usedQuotes, p.intercepted.length, decisions), '', `> ${note}`, '', `## ${t.findings}`, '']
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
        <article className="mx-auto max-w-[780px] rounded-xl border border-line bg-white px-10 py-10 print:max-w-none print:border-0 print:p-0">
          <p className="text-xs text-muted">{t.generated}{T.common.colon}{today}</p>
          <h1 className="mt-2 text-[26px] leading-tight font-semibold tracking-[-0.01em]">{p.name}</h1>
          <p className="mt-2 text-[14px] text-muted">{t.research}{T.common.colon}{p.question}</p>

          <h2 className="mt-8 border-b border-line pb-2 text-[16px] font-semibold">{t.method}</h2>
          <p className="mt-3 text-[14px] leading-relaxed">{t.methodBody(p.sources.length, people, usedQuotes, p.intercepted.length, decisions)}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">{note}</p>

          <h2 className="mt-8 border-b border-line pb-2 text-[16px] font-semibold">{t.findings}</h2>
          <ol className="mt-4 space-y-8">
            {decided.map((i, k) => (
              <li key={i.id} className="break-inside-avoid">
                <h3 className="quote text-[18px] leading-snug font-medium"><span className="mr-2 font-sans text-[14px] text-muted tabular-nums">{k + 1}</span>{i.statement}</h3>
                <p className="mt-1.5 text-xs text-muted">{covText(i.supporting)}</p>
                {i.decisionNote && <p className="mt-1 text-xs text-ink">{W.decisionNote}{T.common.colon}{i.decisionNote}</p>}
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="mb-1.5 text-xs font-semibold text-ink">{t.support}</h4>
                    <ul className="space-y-1.5">{ev(i.supporting).map((e) => <li key={e.id} className="border-l-2 border-ink pl-2.5 text-[13px] leading-snug"><span className="quote">“{e.quote}”</span><span className="block text-[11px] text-muted">{who(e)}</span></li>)}</ul>
                  </div>
                  <div>
                    <h4 className="mb-1.5 text-xs font-semibold text-counter">{t.counter}</h4>
                    {i.counter.length ? <ul className="space-y-1.5">{ev(i.counter).map((e) => <li key={e.id} className="border-l-2 border-counter pl-2.5 text-[13px] leading-snug"><span className="quote">“{e.quote}”</span><span className="block text-[11px] text-muted">{who(e)}</span></li>)}</ul>
                      : <p className="text-[13px] text-muted">{t.none}</p>}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </article>
      )}
    </>
  )
}
