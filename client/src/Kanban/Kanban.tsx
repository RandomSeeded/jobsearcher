import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchCompanies, patchCompany, enqueueRun } from '../api'
import type { Company, Vote } from '../types'
import { CompanyDetailPane } from '../CompanyDetailPane'
import { stars, AI_LAYER_SHORT, type StageGroup } from '../display-utils'
import { buildPipeline, DEFAULT_COLLAPSED_PHASES, PHASE_ORDER, reorderPhases, type Lane } from './pipeline'

const COLLAPSE_KEY = 'kanban.collapsedPhases'
const ORDER_KEY = 'kanban.phaseOrder'
const PHASE_MIME = 'application/x-phase'
const phaseTotal = (lanes: Lane[]) => lanes.reduce((n, l) => n + l.companies.length, 0)

function loadCollapsed(): Set<StageGroup> {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY)
    if (raw) return new Set(JSON.parse(raw) as StageGroup[])
  } catch { /* ignore */ }
  return new Set(DEFAULT_COLLAPSED_PHASES)
}

// Saved order, reconciled with the canonical list (drop stale keys, append new ones).
function loadOrder(): StageGroup[] {
  try {
    const raw = localStorage.getItem(ORDER_KEY)
    if (raw) {
      const saved = (JSON.parse(raw) as StageGroup[]).filter(k => PHASE_ORDER.includes(k))
      return [...saved, ...PHASE_ORDER.filter(k => !saved.includes(k))]
    }
  } catch { /* ignore */ }
  return PHASE_ORDER
}

const aiShort = (c: Company) =>
  c.ai_category && c.ai_category !== 'none' ? (AI_LAYER_SHORT[c.ai_category] ?? c.ai_category) : null

export function Kanban() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selected, setSelected] = useState<Company | null>(null)
  const [collapsed, setCollapsed] = useState<Set<StageGroup>>(loadCollapsed)
  const [order, setOrder] = useState<StageGroup[]>(loadOrder)
  const [dropStage, setDropStage] = useState<string | null>(null)
  const [dropPhase, setDropPhase] = useState<StageGroup | null>(null)

  useEffect(() => { fetchCompanies().then(setCompanies) }, [])
  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...collapsed])) } catch { /* ignore */ }
  }, [collapsed])
  useEffect(() => {
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(order)) } catch { /* ignore */ }
  }, [order])

  const byKey = useMemo(() => new Map(buildPipeline(companies).map(c => [c.key, c])), [companies])
  const columns = useMemo(() => order.map(k => byKey.get(k)!), [order, byKey])
  const inProcess = useMemo(() => columns.reduce((n, c) => n + phaseTotal(c.lanes), 0), [columns])

  function toggle(key: StageGroup) {
    setCollapsed(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next })
  }

  // Column reorder (drag a phase header onto another column).
  const onPhaseDragStart = (key: StageGroup) => (e: React.DragEvent) => { e.dataTransfer.setData(PHASE_MIME, key); e.dataTransfer.effectAllowed = 'move' }
  const onPhaseDragOver = (key: StageGroup) => (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(PHASE_MIME)) return
    e.preventDefault(); setDropPhase(key)
  }
  const onPhaseDrop = (key: StageGroup) => (e: React.DragEvent) => {
    const dragged = e.dataTransfer.getData(PHASE_MIME) as StageGroup
    setDropPhase(null)
    if (dragged) setOrder(o => reorderPhases(o, dragged, key))
  }

  // Optimistic move; revert the whole list if the patch fails.
  async function moveToStage(company: string, stage: string) {
    const before = companies
    setCompanies(cs => cs.map(c => c.company === company ? { ...c, stage } : c))
    setSelected(s => s && s.company === company ? { ...s, stage } : s)
    try {
      const updated = await patchCompany(company, { stage })
      setCompanies(cs => cs.map(c => c.company === updated.company ? updated : c))
    } catch {
      setCompanies(before)
      alert(`Couldn't move ${company} to ${stage}.`)
    }
  }

  async function handleVote(company: Company, vote: Vote) {
    const updated = await patchCompany(company.company, { vote })
    setCompanies(cs => cs.map(c => c.company === updated.company ? updated : c))
    setSelected(updated)
  }
  async function handleStageChange(company: Company, stage: string | null) {
    const updated = await patchCompany(company.company, { stage })
    setCompanies(cs => cs.map(c => c.company === updated.company ? updated : c))
    setSelected(updated)
  }
  async function handleFindMore(company: Company) {
    await enqueueRun(`find more companies like ${company.company} — ${company.ai_category ?? 'AI'}, ~${company.employees ?? 'unknown'} employees, ${company.location ?? 'any location'}`, 5)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ flexShrink: 0, padding: '1.25rem 1.5rem 0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <Link to="/" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}>← Dashboard</Link>
          <h1 style={{ margin: 0, fontSize: 20 }}>Application pipeline</h1>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>{inProcess} companies in process</span>
        </div>
      </div>

      {/* board: own scroll region so the horizontal scrollbar sits at the bottom of the viewport */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '0 1.5rem 1rem', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {columns.map(col => collapsed.has(col.key)
          ? <CollapsedColumn key={col.key} label={col.label} color={col.color} count={phaseTotal(col.lanes)}
              dropping={dropPhase === col.key} onExpand={() => toggle(col.key)}
              onDragStart={onPhaseDragStart(col.key)} onDragOver={onPhaseDragOver(col.key)}
              onDragLeave={() => setDropPhase(p => p === col.key ? null : p)} onDrop={onPhaseDrop(col.key)} />
          : (
            <div key={col.key}
              onDragOver={onPhaseDragOver(col.key)}
              onDragLeave={() => setDropPhase(p => p === col.key ? null : p)}
              onDrop={onPhaseDrop(col.key)}
              style={{ width: 230, flexShrink: 0, background: '#f9fafb', borderRadius: 10, padding: 8, borderTop: `3px solid ${col.color}`, outline: dropPhase === col.key ? '2px dashed #94a3b8' : 'none', outlineOffset: 2 }}>
              <div draggable onDragStart={onPhaseDragStart(col.key)} title="Drag to reorder"
                style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, cursor: 'grab' }}>
                <span style={{ color: '#cbd5e1', fontSize: 12 }}>⠿</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{col.label}</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{phaseTotal(col.lanes)}</span>
                <button onClick={() => toggle(col.key)} title="Collapse"
                  style={{ marginLeft: 'auto', border: 0, background: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14, lineHeight: 1, padding: 0 }}>⟨</button>
              </div>
              {col.lanes.map(lane => (
                <LaneView key={lane.stage} lane={lane} color={col.color} multi={col.lanes.length > 1}
                  highlighted={dropStage === lane.stage}
                  onSelect={setSelected}
                  onDragOverLane={() => setDropStage(lane.stage)}
                  onDragLeaveLane={() => setDropStage(s => s === lane.stage ? null : s)}
                  onDropLane={name => { setDropStage(null); if (name) moveToStage(name, lane.stage) }}
                />
              ))}
            </div>
          ))}
      </div>

      {selected && (
        <div style={{ position: 'fixed', top: 0, right: 0, height: '100vh', width: 480, borderLeft: '1px solid #e5e7eb', background: '#fff', boxShadow: '-8px 0 24px rgba(0,0,0,.08)', zIndex: 30, display: 'flex' }}>
          <CompanyDetailPane
            company={selected}
            onVote={v => handleVote(selected, v)}
            onStageChange={s => handleStageChange(selected, s)}
            onClose={() => setSelected(null)}
            onFindMore={handleFindMore}
          />
        </div>
      )}
    </div>
  )
}

function CollapsedColumn({ label, color, count, dropping, onExpand, onDragStart, onDragOver, onDragLeave, onDrop }: {
  label: string; color: string; count: number; dropping: boolean; onExpand: () => void
  onDragStart: (e: React.DragEvent) => void; onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void; onDrop: (e: React.DragEvent) => void
}) {
  return (
    <button onClick={onExpand} title={`Expand ${label} (drag to reorder)`}
      draggable onDragStart={onDragStart} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      style={{ width: 36, flexShrink: 0, alignSelf: 'stretch', minHeight: 120, background: '#f9fafb', borderRadius: 10, border: 0, borderTop: `3px solid ${color}`, cursor: 'grab', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '8px 0', outline: dropping ? '2px dashed #94a3b8' : 'none', outlineOffset: 2 }}>
      <span style={{ fontSize: 11, color: '#9ca3af' }}>{count}</span>
      <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 12, fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  )
}

function LaneView({ lane, color, multi, highlighted, onSelect, onDragOverLane, onDragLeaveLane, onDropLane }: {
  lane: Lane; color: string; multi: boolean; highlighted: boolean
  onSelect: (c: Company) => void
  onDragOverLane: () => void; onDragLeaveLane: () => void; onDropLane: (company: string) => void
}) {
  return (
    <div style={{ marginBottom: multi ? 10 : 0 }}>
      {multi && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: color }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{lane.stage}</span>
          <span style={{ fontSize: 10, color: '#cbd5e1' }}>{lane.companies.length || ''}</span>
        </div>
      )}
      <div
        onDragOver={e => { if (!e.dataTransfer.types.includes('text/company')) return; e.preventDefault(); onDragOverLane() }}
        onDragLeave={onDragLeaveLane}
        onDrop={e => onDropLane(e.dataTransfer.getData('text/company'))}
        style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 28, borderRadius: 6, padding: 2, background: highlighted ? '#eef2ff' : 'transparent', outline: highlighted ? '1px dashed #a5b4fc' : 'none' }}
      >
        {lane.companies.length === 0 && <span style={{ color: '#d1d5db', fontSize: 11, padding: '4px 2px' }}>—</span>}
        {lane.companies.map(c => (
          <div key={c.company}
            draggable
            onDragStart={e => e.dataTransfer.setData('text/company', c.company)}
            onClick={() => onSelect(c)}
            style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: `3px solid ${color}`, borderRadius: 6, padding: '6px 8px', fontSize: 12, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,.04)' }}
          >
            <div style={{ fontWeight: 600, color: '#111827' }}>{c.company}</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2, fontSize: 10 }}>
              {c.company_quality ? <span style={{ color: '#f59e0b' }}>{stars(c.company_quality)}</span> : null}
              {aiShort(c) ? <span style={{ color: '#9ca3af' }}>{aiShort(c)}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
