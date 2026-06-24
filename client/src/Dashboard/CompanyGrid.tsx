import { Fact } from '../Fact'
import { VOTE_EMOJI, toTitleCase, stars, AI_LAYER_SHORT, stageAccent } from '../display-utils'
import type { Company } from '../types'

export function CompanyGrid({ companies, onSelect }: { companies: Company[]; onSelect: (c: Company) => void }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
      gap: '1rem',
      marginBottom: '2rem',
    }}>
      {companies.map(c => {
        const accent = stageAccent(c.stage)
        const aiShort = c.ai_category && c.ai_category !== 'none' ? (AI_LAYER_SHORT[c.ai_category] ?? c.ai_category) : null
        const qualityStr = c.company_quality ? stars(c.company_quality)! : null
        return (
          <button
            key={c.company}
            onClick={() => onSelect(c)}
            style={{
              textAlign: 'left',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              overflow: 'hidden',
              background: '#fff',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.1)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}
          >
            <div style={{ height: 4, background: accent }} />
            <div style={{ padding: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>{c.company}</div>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{c.vote ? VOTE_EMOJI[c.vote] : '○'}</span>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10, lineHeight: 1.4, minHeight: '1.4em' }}>
                {c.terse ?? <span style={{ color: '#d1d5db' }}>—</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', fontSize: 11 }}>
                <Fact label="People" value={c.employees ?? '--'} dim={!c.employees} />
                <Fact label="Funding" value={c.fundraising ?? '--'} dim={!c.fundraising} />
                <Fact label="AI layer" value={aiShort ?? '--'} dim={!aiShort} />
                <Fact label="Quality" value={qualityStr ?? '--'} dim={!qualityStr} />
              </div>
            </div>
            <div style={{ marginTop: 'auto', borderTop: '1px solid #f3f4f6', padding: '6px 0', textAlign: 'center', fontSize: 11, color: '#9ca3af' }}>
              {c.stage ? toTitleCase(c.stage) : '—'}
            </div>
          </button>
        )
      })}
    </div>
  )
}
