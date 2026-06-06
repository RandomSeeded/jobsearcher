import { Link } from 'react-router-dom'
import { stars } from '../display-utils'
import type { Company, Vote } from '../types'
import { VOTES } from './votes'

const dtStyle: React.CSSProperties = { fontWeight: 600, color: '#6b7280', fontSize: 13 }
const ddStyle: React.CSSProperties = { marginLeft: 0, marginBottom: 4 }
const kbdStyle: React.CSSProperties = {
  background: '#f3f4f6',
  border: '1px solid #d1d5db',
  borderRadius: 4,
  padding: '1px 5px',
  fontSize: 11,
  fontFamily: 'monospace',
}

export function DetailPane({
  company,
  sessionTotal,
  remaining,
  onVote,
  onSkip,
}: {
  company: Company | null
  sessionTotal: number
  remaining: number
  onVote: (v: Vote) => void
  onSkip: () => void
}) {
  if (!company) {
    return (
      <div style={{ flex: 1, padding: '2rem', color: '#9ca3af' }}>
        Select a company from the list.
      </div>
    )
  }

  if (remaining === 0 && sessionTotal > 0) {
    return (
      <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <div style={{ fontSize: 48 }}>✅</div>
        <h2 style={{ margin: 0 }}>All caught up.</h2>
        <p style={{ color: '#6b7280', margin: 0 }}>{sessionTotal} companies decided this session.</p>
        <Link to="/" style={{ color: '#2563eb' }}>← Back to browser</Link>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
      <h2 style={{ marginTop: 0 }}>{company.company}</h2>
      {company.link && (
        <a href={company.link} target="_blank" rel="noreferrer" style={{ display: 'block', marginBottom: '1rem' }}>
          {company.link}
        </a>
      )}
      <dl style={{ lineHeight: 2 }}>
        {company.location && <><dt style={dtStyle}>Location</dt><dd style={ddStyle}>{company.location}</dd></>}
        {company.employees && <><dt style={dtStyle}>Employees</dt><dd style={ddStyle}>{company.employees}</dd></>}
        {company.company_quality && <><dt style={dtStyle}>Quality</dt><dd style={ddStyle}>{stars(company.company_quality)}</dd></>}
        {company.stage && <><dt style={dtStyle}>Stage</dt><dd style={ddStyle}>{company.stage}</dd></>}
        {company.ai_category && <><dt style={dtStyle}>AI category</dt><dd style={ddStyle}>{company.ai_category}</dd></>}
        {company.recruiter_type && <><dt style={dtStyle}>Recruiter type</dt><dd style={ddStyle}>{company.recruiter_type}</dd></>}
        {company.contact && <><dt style={dtStyle}>Contact</dt><dd style={ddStyle}>{company.contact}</dd></>}
        {company.last_outreach && <><dt style={dtStyle}>Last outreach</dt><dd style={ddStyle}>{company.last_outreach}</dd></>}
        {company.compensation && <><dt style={dtStyle}>Compensation</dt><dd style={ddStyle}>{company.compensation}</dd></>}
        {company.notion_url && (
          <>
            <dt style={dtStyle}>Notion</dt>
            <dd style={ddStyle}>
              <a href={company.notion_url} target="_blank" rel="noreferrer">Open in Notion</a>
            </dd>
          </>
        )}
      </dl>
      {company.notes && (
        <div style={{ marginTop: '1.5rem' }}>
          <strong>Notes</strong>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: '#374151' }}>{company.notes}</p>
        </div>
      )}

      <div style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {VOTES.map((v, i) => (
          <button
            key={v.value}
            onClick={() => onVote(v.value)}
            style={{
              border: company.vote === v.value ? '2px solid #2563eb' : '1px solid #d1d5db',
              borderRadius: 8,
              padding: '8px 16px',
              cursor: 'pointer',
              background: company.vote === v.value ? '#eff6ff' : '#fff',
              fontWeight: company.vote === v.value ? 600 : 400,
              fontSize: 14,
            }}
          >
            {v.emoji} {v.label} {!company.vote && <kbd style={kbdStyle}>{i + 1}</kbd>}
          </button>
        ))}
        {!company.vote && (
          <button
            onClick={onSkip}
            style={{
              border: '1px solid #d1d5db',
              borderRadius: 8,
              padding: '8px 16px',
              cursor: 'pointer',
              background: '#fff',
              fontSize: 14,
              color: '#6b7280',
            }}
          >
            Skip <kbd style={kbdStyle}>S</kbd>
          </button>
        )}
      </div>
    </div>
  )
}
