import { useEffect, useRef, useState } from 'react'
import type { Company } from '../types'
import { STAGES, stageGroup, stageColor } from '../display-utils'
import { GROUP_PREFIX, META_FILTERS, type MetaFilter } from './stage-filter'

// Dropdown popover for filtering the Dashboard by stage (pipeline status).
export function StageFilter({
  companies,
  active,
  onChange,
}: {
  companies: Company[]
  active: Set<string>
  onChange: (next: Set<string>) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function toggle(key: string) {
    const next = new Set(active)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onChange(next)
  }

  const stageCount = (s: string) => companies.filter(c => c.stage === s).length
  const metaCount = (mf: MetaFilter) => {
    const g = stageGroup
    return companies.filter(c => { const grp = g(c.stage); return grp ? mf.groups.includes(grp) : false }).length
  }
  // Only show precise stages that actually occur, in canonical order.
  const presentStages = STAGES.filter(s => stageCount(s) > 0)

  const label = active.size === 0 ? 'Stage' : `Stage · ${active.size}`
  const dot = (color: string) => (
    <span style={{ width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0 }} />
  )
  const row: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
    borderRadius: 6, cursor: 'pointer', fontSize: 13,
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          fontSize: 13, padding: '6px 12px', borderRadius: 8,
          border: `1px solid ${active.size ? '#2563eb' : '#d1d5db'}`,
          background: active.size ? '#eff6ff' : '#fff',
          color: active.size ? '#2563eb' : '#374151',
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600,
        }}
      >
        📋 {label} <span style={{ fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 20,
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,.12)', padding: 6, minWidth: 220,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '4px 8px 2px' }}>Groups</div>
          {META_FILTERS.map(mf => {
            const key = GROUP_PREFIX + mf.key
            return (
              <label key={key} style={row}
                onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <input type="checkbox" checked={active.has(key)} onChange={() => toggle(key)} style={{ accentColor: '#2563eb' }} />
                {dot(mf.color)}
                <span style={{ flex: 1, fontWeight: 600 }}>{mf.label}</span>
                <span style={{ color: '#9ca3af', fontSize: 12 }}>{metaCount(mf)}</span>
              </label>
            )
          })}

          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '8px 8px 2px' }}>Stages</div>
          {presentStages.map(s => (
            <label key={s} style={row}
              onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <input type="checkbox" checked={active.has(s)} onChange={() => toggle(s)} style={{ accentColor: '#2563eb' }} />
              {dot(stageColor(s))}
              <span style={{ flex: 1 }}>{s}</span>
              <span style={{ color: '#9ca3af', fontSize: 12 }}>{stageCount(s)}</span>
            </label>
          ))}

          {active.size > 0 && (
            <button
              onClick={() => onChange(new Set())}
              style={{ width: '100%', marginTop: 4, fontSize: 12, padding: '6px', borderRadius: 6, border: 0, background: '#f3f4f6', color: '#6b7280', cursor: 'pointer' }}
            >
              Clear filter
            </button>
          )}
        </div>
      )}
    </div>
  )
}
