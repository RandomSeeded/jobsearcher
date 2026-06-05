import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchCompanies, patchCompany } from './api'
import { stars } from './display-utils'
import type { Company, Vote } from './types'

const VOTES: { value: Vote; label: string; emoji: string }[] = [
  { value: 'love', label: 'love', emoji: '❤️' },
  { value: 'like', label: 'like', emoji: '👍' },
  { value: 'neutral', label: 'neutral', emoji: '😐' },
  { value: 'not_sure_yet', label: 'not sure yet', emoji: '🤔' },
  { value: 'dislike', label: 'dislike', emoji: '👎' },
]

const dtStyle: React.CSSProperties = { fontWeight: 600, color: '#6b7280', fontSize: 13 }
const ddStyle: React.CSSProperties = { marginLeft: 0, marginBottom: 4 }

function DetailPane({
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

const kbdStyle: React.CSSProperties = {
  background: '#f3f4f6',
  border: '1px solid #d1d5db',
  borderRadius: 4,
  padding: '1px 5px',
  fontSize: 11,
  fontFamily: 'monospace',
}

export function Triage() {
  const [queue, setQueue] = useState<Company[]>([])
  const [selected, setSelected] = useState<Company | null>(null)
  const [sessionTotal, setSessionTotal] = useState(0)
  const votingRef = useRef(false)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const filter = searchParams.get('companies')
    const names = filter ? new Set(filter.split(',').map(decodeURIComponent)) : null
    fetchCompanies().then(all => {
      const nyr = all.filter(c => names ? names.has(c.company) : !c.vote)
      setSessionTotal(0)
      setQueue(nyr)
      if (nyr.length > 0) setSelected(nyr[0])
    })
  }, [searchParams])

  const remaining = useMemo(() => queue.filter(c => !c.vote).length, [queue])

  const advanceToNextNYR = useCallback((justActedOn: string) => {
    setQueue(currentQueue => {
      const nextNYR = currentQueue.find(c => c.company !== justActedOn && !c.vote)
      if (nextNYR) setSelected(nextNYR)
      return currentQueue
    })
  }, [])

  const handleVote = useCallback(async (vote: Vote) => {
    if (!selected || votingRef.current) return
    votingRef.current = true
    const wasNYR = !selected.vote
    try {
      const updated = await patchCompany(selected.company, { vote })
      if (wasNYR) setSessionTotal(n => n + 1)
      setQueue(q => q.map(c => c.company === updated.company ? updated : c))
      if (wasNYR) {
        advanceToNextNYR(updated.company)
      } else {
        setSelected(updated)
      }
    } finally {
      votingRef.current = false
    }
  }, [selected, advanceToNextNYR])

  const handleSkip = useCallback(async () => {
    if (!selected || selected.vote) return
    const updated = await patchCompany(selected.company, { vote: 'not_sure_yet' })
    setSessionTotal(n => n + 1)
    setQueue(q => q.map(c => c.company === updated.company ? updated : c))
    advanceToNextNYR(updated.company)
  }, [selected, advanceToNextNYR])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!selected) return
      if (e.key === 's' || e.key === 'S') { handleSkip(); return }
      const idx = parseInt(e.key) - 1
      if (idx >= 0 && idx < VOTES.length) handleVote(VOTES[idx].value)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, handleVote, handleSkip])

  const isDone = remaining === 0 && sessionTotal > 0

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Left: list */}
      <div style={{
        width: 280,
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        background: '#fafafa',
      }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb' }}>
          <Link to="/" style={{ fontSize: 13, color: '#6b7280' }}>← Dashboard</Link>
          <h2 style={{ margin: '0.5rem 0 0', fontSize: 16 }}>Decision Queue</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
            {remaining} of {queue.length} remaining
          </p>
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, overflowY: 'auto', flex: 1 }}>
          {queue.map(c => {
            const isVoted = !!c.vote
            const isSelected = selected?.company === c.company
            return (
              <li
                key={c.company}
                onClick={() => setSelected(c)}
                style={{
                  padding: '10px 1.25rem',
                  cursor: 'pointer',
                  background: isSelected ? '#eff6ff' : 'transparent',
                  borderLeft: isSelected ? '3px solid #2563eb' : '3px solid transparent',
                  opacity: isVoted ? 0.5 : 1,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.company}</div>
                {c.ai_category && c.ai_category !== 'none' && (
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>{c.ai_category}</div>
                )}
              </li>
            )
          })}
          {queue.length === 0 && (
            <li style={{ padding: '1rem 1.25rem', color: '#9ca3af', fontSize: 14 }}>No companies to review.</li>
          )}
        </ul>
      </div>

      {/* Right: detail */}
      <DetailPane
        company={isDone ? null : selected}
        sessionTotal={sessionTotal}
        remaining={remaining}
        onVote={handleVote}
        onSkip={handleSkip}
      />
    </div>
  )
}
