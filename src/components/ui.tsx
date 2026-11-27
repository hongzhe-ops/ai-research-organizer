import { Binoculars, BookOpen, Check, ClipboardList, FileText, Globe, MessageSquareQuote, Pencil, Signature, Star, Type, X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { useT } from '../store'
import type { Origin, SourceType, Status } from '../types'

export const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ')

/** The visual contract of the whole tool: AI drafts are pencil, researcher decisions are ink. */
export function cardClass(status: Status) {
  return status === 'suggested' ? 'pencil' : status === 'rejected' ? 'struck' : 'ink'
}

export function StatusChip({ status, origin }: { status: Status; origin?: Origin }) {
  const t = useT().status
  const map: Record<Status, { label: string; cls: string; icon: ReactNode }> = {
    suggested: { label: t.suggested, cls: 'border border-dashed border-graphite/60 text-graphite bg-white', icon: <Pencil size={12} /> },
    confirmed: { label: origin === 'researcher' ? t.added : t.confirmed, cls: 'bg-ink text-white', icon: <Check size={12} /> },
    edited: { label: t.edited, cls: 'bg-ink-soft text-ink', icon: <Signature size={12} /> },
    rejected: { label: t.rejected, cls: 'bg-graphite-soft text-muted line-through', icon: <X size={12} /> },
  }
  const m = map[status]
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap', m.cls)}>
      {m.icon}
      {m.label}
    </span>
  )
}

export function SourceIcon({ type, size = 14 }: { type: SourceType; size?: number }) {
  if (type === 'interview') return <MessageSquareQuote size={size} />
  if (type === 'observation') return <Binoculars size={size} />
  if (type === 'paper') return <BookOpen size={size} />
  if (type === 'survey') return <ClipboardList size={size} />
  if (type === 'review') return <Star size={size} />
  if (type === 'pdf') return <FileText size={size} />
  if (type === 'web') return <Globe size={size} />
  return <Type size={size} />
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'outline' | 'danger'; size?: 'sm' | 'md' }
export function Button({ variant = 'outline', size = 'md', className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45',
        size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-9 px-3.5 text-[13px]',
        variant === 'primary' && 'bg-ink text-white hover:bg-[#172E6E]',
        variant === 'outline' && 'border border-line bg-white text-text hover:border-[#C9CED8]',
        variant === 'ghost' && 'text-muted hover:bg-graphite-soft hover:text-text',
        variant === 'danger' && 'border border-line bg-white text-counter hover:border-counter/40',
        className,
      )}
    />
  )
}

export function Dialog({ title, onClose, children, width = 560 }: { title: string; onClose: () => void; children: ReactNode; width?: number }) {
  const t = useT()
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#1A1D23]/35 p-4 pt-[8vh]" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full rounded-xl bg-white shadow-[0_12px_40px_rgba(20,30,60,.18)]" style={{ maxWidth: width }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button aria-label={t.common.close} onClick={onClose} className="rounded p-1 text-muted hover:bg-graphite-soft"><X size={16} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-[13px] font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

/** A labelled group of buttons. Not a <label>, which would swallow the buttons' own names. */
export function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="mb-4">
      <legend className="mb-1.5 block text-[13px] font-medium">{label}</legend>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </fieldset>
  )
}

export const inputCls = 'w-full rounded-md border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-ink'

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="text-[15px] font-semibold">{title}</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
