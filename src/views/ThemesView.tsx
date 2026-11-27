import { Check, GripVertical, Lock, LockOpen, Plus, Trash2, Wand2, X } from 'lucide-react'
import { useState } from 'react'
import { runCluster, useAIAction } from '../ai/useAI'
import { EvidenceCard } from '../components/EvidenceCard'
import { Button, Empty, PageHeader, StatusChip, cardClass, cx, inputCls } from '../components/ui'
import { coverage, useStore } from '../store'
import type { Evidence, Theme } from '../types'

type Drag = { eid: string; from: string | null }

function Column({ theme, items, drag, setDrag }: { theme: Theme | null; items: Evidence[]; drag: Drag | null; setDrag: (d: Drag | null) => void }) {
  const { project: p, moveEvidence, updateTheme, setThemeStatus, toggleLock, deleteTheme } = useStore()
  const [over, setOver] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(theme?.name || '')
  const id = theme?.id ?? null
  const cov = theme ? coverage(p, theme.evidenceIds) : null
  const locked = !!theme?.locked

  return (
    <section
      aria-label={theme ? theme.name : 'Unsorted quotes'}
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
              {locked && <span className="inline-flex items-center gap-1 text-[11px] text-ink"><Lock size={11} />Locked</span>}
              <span className="ml-auto flex">
                <button aria-label={locked ? 'Unlock theme' : 'Lock theme'} title={locked ? 'Unlock: AI may suggest changes again' : 'Lock: AI will never change this theme'} onClick={() => toggleLock(theme.id)} className="rounded p-1 text-muted hover:bg-graphite-soft hover:text-ink">
                  {locked ? <Lock size={14} /> : <LockOpen size={14} />}
                </button>
                {!locked && <button aria-label="Delete theme" onClick={() => { if (confirm(`Delete theme "${theme.name}"? The quotes stay in your evidence.`)) deleteTheme(theme.id) }} className="rounded p-1 text-muted hover:bg-graphite-soft hover:text-counter"><Trash2 size={14} /></button>}
              </span>
            </div>
            {editing ? (
              <input autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)}
                onBlur={() => { if (name.trim() && name !== theme.name) updateTheme(theme.id, { name: name.trim() }); setEditing(false) }}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setName(theme.name); setEditing(false) } }} />
            ) : (
              <h2 onClick={() => !locked && setEditing(true)} title={locked ? undefined : 'Click to rename'} className={cx('text-[14px] leading-snug font-semibold', !locked && 'cursor-text hover:text-ink')}>{theme.name}</h2>
            )}
            {theme.description && <p className="mt-1 text-xs leading-relaxed text-muted">{theme.description}</p>}
            {cov && <p className="mt-2 text-xs text-muted">{cov.quotes} quotes · {cov.people} of {cov.totalPeople} participants</p>}
            {theme.status === 'suggested' && (
              <div className="mt-2.5 flex gap-1.5">
                <Button size="sm" variant="primary" onClick={() => setThemeStatus(theme.id, 'confirmed')}><Check size={13} />Confirm</Button>
                <Button size="sm" variant="ghost" onClick={() => setThemeStatus(theme.id, 'rejected')}><X size={13} />Reject</Button>
              </div>
            )}
          </>
        ) : (
          <>
            <h2 className="text-[14px] font-semibold">Unsorted</h2>
            <p className="mt-1 text-xs text-muted">Quotes not in any theme. Drag them onto a theme.</p>
          </>
        )}
      </header>
      <div className="flex-1 space-y-2 p-2.5">
        {items.map((e) => (
          <div key={e.id} draggable={!locked} onDragStart={() => setDrag({ eid: e.id, from: id })} onDragEnd={() => setDrag(null)}
            className={cx('group relative', !locked && 'cursor-grab active:cursor-grabbing', drag?.eid === e.id && 'opacity-40')}>
            {!locked && <GripVertical size={14} className="absolute top-3 right-2 text-graphite opacity-0 group-hover:opacity-100" aria-hidden="true" />}
            <EvidenceCard e={e} compact />
          </div>
        ))}
        {!items.length && <p className="px-2 py-6 text-center text-xs text-muted">{theme ? 'Drop quotes here' : 'Every quote is in a theme.'}</p>}
      </div>
    </section>
  )
}

export function ThemesView({ onNeedKey }: { onNeedKey: () => void }) {
  const { project: p, addTheme, busy } = useStore()
  const [drag, setDrag] = useState<Drag | null>(null)
  const act = useAIAction(onNeedKey)
  const live = p.evidence.filter((e) => e.status !== 'rejected')
  const byId = new Map(live.map((e) => [e.id, e]))
  const themes = p.themes.filter((t) => t.status !== 'rejected')
  const rejected = p.themes.filter((t) => t.status === 'rejected')
  const inTheme = new Set(themes.flatMap((t) => t.evidenceIds))
  const unsorted = live.filter((e) => !inTheme.has(e.id))

  return (
    <>
      <PageHeader title="Themes" sub="AI groups quotes into themes as a first pass. Rename, regroup and confirm them. Lock a theme to stop the AI from ever changing it."
        actions={<>
          <Button onClick={() => { const n = prompt('Name the new theme'); if (n?.trim()) addTheme(n.trim()) }}><Plus size={15} />New theme</Button>
          <Button variant="primary" disabled={!!busy} onClick={() => act(runCluster, 'New theme suggestions added. Confirmed and locked themes were left untouched.')}><Wand2 size={15} />Suggest themes</Button>
        </>} />
      {!live.length ? (
        <Empty title="No evidence to group yet" body="Confirm some quotes in Evidence first. Themes are built from them." />
      ) : (
        <div className="-mx-6 overflow-x-auto px-6 pb-4">
          <div className="flex items-start gap-3">
            <Column theme={null} items={unsorted} drag={drag} setDrag={setDrag} />
            {themes.map((t) => (
              <Column key={t.id} theme={t} items={t.evidenceIds.map((x) => byId.get(x)).filter(Boolean) as Evidence[]} drag={drag} setDrag={setDrag} />
            ))}
          </div>
        </div>
      )}
      {rejected.length > 0 && (
        <p className="mt-4 text-xs text-muted">Rejected themes: {rejected.map((t) => t.name).join(', ')}. The AI won't suggest them again.</p>
      )}
    </>
  )
}
