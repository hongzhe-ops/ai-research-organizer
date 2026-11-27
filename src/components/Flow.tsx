import { ArrowRight, CheckCircle2, Pencil, Sparkle, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { STEPS, pendingFor, useStore, useT, type Step } from '../store'
import { Button } from './ui'

/** Header for each step: where you are, what to do now, what is left, and what comes next. */
export function StepGuide({ step, actions }: { step: Step; actions?: ReactNode }) {
  const { project, go } = useStore()
  const t = useT()
  const idx = STEPS.indexOf(step)
  const next = STEPS[idx + 1]
  const pending = pendingFor(project, step)
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <p className="mb-1 text-xs font-medium text-muted tabular-nums">0{idx + 1} / 06</p>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">{t.steps[step].label}</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{t.steps[step].guide}</p>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {(next || (step !== 'sources' && step !== 'export')) && <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line bg-white px-4 py-2.5 text-[13px]">
        {step !== 'sources' && step !== 'export' && (
          pending > 0
            ? <span className="inline-flex items-center gap-1.5 text-graphite"><Pencil size={13} />{t.guide.toReview(pending)}</span>
            : <span className="inline-flex items-center gap-1.5 text-ink"><CheckCircle2 size={14} />{t.guide.done}</span>
        )}
        {next && (
          <button onClick={() => go({ view: next })} className="ml-auto inline-flex items-center gap-1.5 font-medium text-ink hover:underline">
            <span className="font-normal text-muted">{t.guide.next}{t.common.colon}</span>0{idx + 2} {t.steps[next].label} <ArrowRight size={14} />
          </button>
        )}
      </div>}
    </header>
  )
}

/** Shows what an AI re-run changed, so decisions you already made are visibly untouched. */
export function RunBanner() {
  const { project, clearNew } = useStore()
  const t = useT()
  if (!project.lastRun) return null
  return (
    <div className="mb-5 flex gap-3 rounded-lg border border-dashed border-graphite/50 bg-white p-4">
      <Sparkle size={16} className="mt-0.5 shrink-0 text-graphite" />
      <div className="flex-1 text-[13px]">
        <p className="font-semibold">{t.run.title}</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted">
          {project.lastRun.lines.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      </div>
      <Button size="sm" variant="ghost" onClick={clearNew} aria-label={t.run.dismiss}><X size={14} />{t.run.dismiss}</Button>
    </div>
  )
}

export function NewBadge() {
  const t = useT()
  return <span className="rounded-full bg-mark px-1.5 py-px text-[10px] font-semibold text-[#5C4A00]">{t.common.newBadge}</span>
}
