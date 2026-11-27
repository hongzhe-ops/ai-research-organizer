import { Check, GripVertical, Lock, LockOpen, Merge, Plus, Scissors, Trash2, Wand2, X } from 'lucide-react'
import { useState } from 'react'
import type { useAI } from '../ai/useAI'
import { EvidenceCard } from '../components/EvidenceCard'
import { NewBadge, RunBanner, StepGuide } from '../components/Flow'
import { Button, Empty, StatusChip, cardClass, cx, inputCls } from '../components/ui'
import { coverage, useStore, useT } from '../store'
import type { Evidence, Theme } from '../types'

type Drag = { eid: string; from: string | null }

function Column({ theme, items, drag, setDrag, others }: { theme: Theme | null; items: Evidence[]; drag: Drag | null; setDrag: (d: Drag | null) => void; others: Theme[] }) {
  const { project: p, moveEvidence, updateTheme, setThemeStatus, toggleLock, deleteTheme, mergeTheme, splitTheme } = useStore()
  const T = useT()
  const t = T.themes
  const [over, setOver] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(theme?.name || '')
  const [splitting, setSplitting] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const id = theme?.id ?? null
  const cov = theme ? coverage(p, theme.evidenceIds) : null
  const locked = !!theme?.locked

  const doSplit = () => {
    if (!theme || !picked.length) return
    const n = prompt(t.namePrompt)
    if (!n?.trim()) return
    splitTheme(theme.id, picked, n.trim())
    setSplitting(false)
    setPicked([])
  }

  return (
    <section
      aria-label={theme ? theme.name : t.unsortedLabel}
      onDragOver={(e) => { if (drag && drag.from !== id && !locked) { e.preventDefault(); setOver(true) } }}
      onDragLeave={() => setOver(false)}
      onDrop={() => { setOver(false); if (drag && !locked) moveEvidence(drag.eid, drag.from, id); setDrag(null) }}
      className={cx('flex w-[300px] shrink-0 flex-col rounded-xl transition-colors', theme ? cardClass(theme.status) : 'border border-line bg-graphite-soft/60', over && 'ring-2 ring-ink/50')}
    >
      <header className="border-b border-line/80 p-3.5">
        {theme ? (
          <>
            <div className="mb-2 flex items-center gap-1.5">
              <StatusChip status={theme.status} origin={theme.origin} />
              {theme.isNew && <NewBadge />}
              {locked && <span className="inline-flex items-center gap-1 text-[11px] text-ink"><Lock size={11} />{t.locked}</span>}
              <span className="ml-auto flex">
                <button aria-label={locked ? t.unlock : t.lock} title={locked ? t.unlockTip : t.lockTip} onClick={() => toggleLock(theme.id)} className="rounded p-1 text-muted hover:bg-graphite-soft hover:text-ink">
                  {locked ? <Lock size={14} /> : <LockOpen size={14} />}
                </button>
                {!locked && <button aria-label={t.split} title={t.split} onClick={() => { setSplitting(!splitting); setPicked([]) }} className={cx('rounded p-1 hover:bg-graphite-soft', splitting ? 'text-ink' : 'text-muted hover:text-ink')}><Scissors size={14} /></button>}
                {!locked && <button aria-label={t.del} onClick={() => { if (confirm(t.delConfirm(theme.name))) deleteTheme(theme.id) }} className="rounded p-1 text-muted hover:bg-graphite-soft hover:text-counter"><Trash2 size={14} /></button>}
              </span>
            </div>
            {editing ? (
              <input autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)}
                onBlur={() => { if (name.trim() && name !== theme.name) updateTheme(theme.id, { name: name.trim() }); setEditing(false) }}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setName(theme.name); setEditing(false) } }} />
            ) : (
              <h2 onClick={() => !locked && setEditing(true)} title={locked ? undefined : t.rename} className={cx('text-[14px] leading-snug font-semibold', !locked && 'cursor-text hover:text-ink')}>{theme.name}</h2>
            )}
            {theme.description && <p className="mt-1 text-xs leading-relaxed text-muted">{theme.description}</p>}
            {cov && <p className="mt-2 text-xs text-muted">{t.cov(cov.quotes, cov.people, cov.totalPeople)}</p>}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {theme.status === 'suggested' && <>
                <Button size="sm" variant="primary" onClick={() => setThemeStatus(theme.id, 'confirmed')}><Check size={13} />{T.common.confirm}</Button>
                <Button size="sm" variant="ghost" onClick={() => setThemeStatus(theme.id, 'rejected')}><X size={13} />{T.common.reject}</Button>
              </>}
              {!locked && others.length > 0 && (
                <label className="ml-auto inline-flex items-center gap-1 text-xs text-muted">
                  <Merge size={13} />
                  <select aria-label={t.merge} value="" onChange={(e) => { const to = others.find((o) => o.id === e.target.value); if (to && confirm(t.mergeConfirm(theme.name, to.name))) mergeTheme(theme.id, to.id) }}
                    className="max-w-[110px] rounded border border-line bg-white py-0.5 text-xs">
                    <option value="">{t.merge}</option>
                    {others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </label>
              )}
            </div>
            {splitting && (
              <div className="mt-3 rounded-md bg-ink-soft p-2.5 text-xs text-ink">
                <p className="mb-2">{t.splitHint}</p>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="primary" disabled={!picked.length} onClick={doSplit}>{t.splitCreate(picked.length)}</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setSplitting(false); setPicked([]) }}>{t.splitCancel}</Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <h2 className="text-[14px] font-semibold">{t.unsorted}</h2>
            <p className="mt-1 text-xs text-muted">{t.unsortedD}</p>
          </>
        )}
      </header>
      <div className="flex-1 space-y-2 p-2.5">
        {items.map((e) => (
          <div key={e.id} draggable={!locked && !splitting} onDragStart={() => setDrag({ eid: e.id, from: id })} onDragEnd={() => setDrag(null)}
            className={cx('group relative', !locked && !splitting && 'cursor-grab active:cursor-grabbing', drag?.eid === e.id && 'opacity-40')}>
            {splitting ? (
              <label className={cx('flex cursor-pointer gap-2 rounded-lg', picked.includes(e.id) && 'ring-2 ring-ink')}>
                <input type="checkbox" className="sr-only" checked={picked.includes(e.id)} onChange={() => setPicked((x) => (x.includes(e.id) ? x.filter((y) => y !== e.id) : [...x, e.id]))} />
                <div className="flex-1"><EvidenceCard e={e} compact /></div>
              </label>
            ) : (
              <>
                {!locked && <GripVertical size={14} className="absolute top-3 right-2 text-graphite opacity-0 group-hover:opacity-100" aria-hidden="true" />}
                <EvidenceCard e={e} compact />
              </>
            )}
          </div>
        ))}
        {!items.length && <p className="px-2 py-6 text-center text-xs text-muted">{theme ? t.dropHere : t.allSorted}</p>}
      </div>
    </section>
  )
}

export function ThemesView({ ai }: { ai: ReturnType<typeof useAI> }) {
  const { project: p, addTheme, progress } = useStore()
  const t = useT().themes
  const [drag, setDrag] = useState<Drag | null>(null)
  const live = p.evidence.filter((e) => e.status !== 'rejected')
  const byId = new Map(live.map((e) => [e.id, e]))
  const themes = p.themes.filter((x) => x.status !== 'rejected')
  const rejected = p.themes.filter((x) => x.status === 'rejected')
  const inTheme = new Set(themes.flatMap((x) => x.evidenceIds))
  const unsorted = live.filter((e) => !inTheme.has(e.id))

  return (
    <>
      <StepGuide step="themes" actions={<>
        <Button onClick={() => { const n = prompt(t.namePrompt); if (n?.trim()) addTheme(n.trim()) }}><Plus size={15} />{t.newTheme}</Button>
        <Button variant="primary" disabled={!!progress} onClick={ai.cluster}><Wand2 size={15} />{t.suggest}</Button>
      </>} />
      <RunBanner />
      {!live.length ? <Empty title={t.emptyT} body={t.emptyB} /> : (
        <div className="-mx-6 overflow-x-auto px-6 pb-4">
          <div className="flex items-start gap-3">
            <Column theme={null} items={unsorted} drag={drag} setDrag={setDrag} others={[]} />
            {themes.map((x) => (
              <Column key={x.id} theme={x} items={x.evidenceIds.map((id) => byId.get(id)).filter(Boolean) as Evidence[]} drag={drag} setDrag={setDrag} others={themes.filter((o) => o.id !== x.id)} />
            ))}
          </div>
        </div>
      )}
      {rejected.length > 0 && <p className="mt-4 text-xs text-muted">{t.rejectedList(rejected.map((x) => x.name).join(', '))}</p>}
    </>
  )
}
