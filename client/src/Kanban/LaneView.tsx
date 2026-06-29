import type { Company } from '../types'
import { stars, AI_LAYER_SHORT } from '../display-utils'
import type { Lane } from './pipeline'

const aiShort = (c: Company) =>
  c.ai_category && c.ai_category !== 'none' ? (AI_LAYER_SHORT[c.ai_category] ?? c.ai_category) : null

// One stage's column of company cards within a pipeline phase.
export function LaneView({ lane, color, multi, highlighted, onSelect, onDragOverLane, onDragLeaveLane, onDropLane }: {
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
