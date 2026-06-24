import type { Company, Vote } from './types'
import { VOTE_EMOJI, VOTES, AI_LAYER_SHORT, stars, STAGES, stageColor } from './display-utils'
import { Fact } from './Fact'

export function CompanyDetailPane({
  company,
  onVote,
  onStageChange,
  onClose,
  onFindMore,
}: {
  company: Company
  onVote: (v: Vote) => void
  onStageChange: (stage: string | null) => void
  onClose: () => void
  onFindMore: (c: Company) => void
}) {
  return (
    <div
      role="dialog"
      aria-label={company.company}
      className="flex flex-col flex-1 overflow-hidden bg-white"
    >
      <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>{company.company}</h2>
            {company.terse && <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>{company.terse}</p>}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18, lineHeight: 1, padding: 0 }}
          >✕</button>
        </div>

        {company.link && (
          <a href={company.link} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#2563eb', display: 'block', marginBottom: '1.25rem' }}>
            {company.link}
          </a>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginBottom: '1.25rem' }}>
          <Fact label="Location" value={company.location ?? '—'} dim={!company.location} />
          <Fact label="Employees" value={company.employees ?? '—'} dim={!company.employees} />
          <Fact label="Funding" value={company.fundraising ?? '—'} dim={!company.fundraising} />
          <Fact label="Quality" value={stars(company.company_quality) ?? '—'} dim={!company.company_quality} />
          {company.ai_category && company.ai_category !== 'none' && (
            <Fact label="AI layer" value={AI_LAYER_SHORT[company.ai_category] ?? company.ai_category} />
          )}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Stage</span>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: stageColor(company.stage), flexShrink: 0 }} />
          <select
            value={company.stage ?? ''}
            onChange={e => onStageChange(e.target.value || null)}
            style={{
              flex: 1, fontSize: 13, padding: '5px 8px', borderRadius: 8,
              border: '1px solid #d1d5db', background: '#fff', color: company.stage ? '#111827' : '#9ca3af', cursor: 'pointer',
            }}
          >
            <option value="">— none —</option>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>

        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '0 0 1.25rem' }} />

        <p style={{ fontSize: 13, lineHeight: 1.7, color: '#374151', whiteSpace: 'pre-wrap', margin: '0 0 1.25rem' }}>
          {company.notes}
        </p>

        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '0 0 1.25rem' }} />

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
          {VOTES.map(v => (
            <button
              key={v}
              aria-label={v}
              onClick={() => onVote(v)}
              style={{
                border: company.vote === v ? '2px solid #2563eb' : '1px solid #d1d5db',
                borderRadius: 8,
                padding: '5px 11px',
                cursor: 'pointer',
                background: company.vote === v ? '#eff6ff' : '#fff',
                fontWeight: company.vote === v ? 600 : 400,
                fontSize: 13,
              }}
            >
              {VOTE_EMOJI[v]} {v}
            </button>
          ))}
        </div>

        <button
          onClick={() => onFindMore(company)}
          style={{
            width: '100%',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            padding: '8px 12px',
            cursor: 'pointer',
            background: '#f9fafb',
            fontSize: 13,
            color: '#374151',
          }}
        >
          🔍 Find more like this
        </button>
      </div>
    </div>
  )
}
