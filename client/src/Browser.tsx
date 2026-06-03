import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCompanies, patchCompany } from './api'
import type { Company, Vote } from './types'

const VOTE_EMOJI: Record<string, string> = {
  love: '❤️',
  like: '👍',
  neutral: '😐',
  not_sure_yet: '🤔',
  dislike: '👎',
}

const VOTES: Vote[] = ['love', 'like', 'neutral', 'not_sure_yet', 'dislike']

function stars(n?: number) {
  if (!n) return '—'
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}

function preferenceProfile(companies: Company[]) {
  const catScore: Record<string, number> = {}
  const locScore: Record<string, number> = {}

  for (const c of companies) {
    if (c.vote !== 'love' && c.vote !== 'like') continue
    const w = c.vote === 'love' ? 2 : 1
    if (c.ai_category && c.ai_category !== 'none') {
      catScore[c.ai_category] = (catScore[c.ai_category] ?? 0) + w
    }
    if (c.location && c.location !== 'Unknown') {
      locScore[c.location] = (locScore[c.location] ?? 0) + w
    }
  }

  const topCats = Object.entries(catScore).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k)
  const topLocs = Object.entries(locScore).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k)
  return [...topCats, ...topLocs]
}

export function Browser() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selected, setSelected] = useState<Company | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchCompanies().then(setCompanies)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(p => !p)
        setQuery('')
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false)
        setSelected(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (paletteOpen) searchRef.current?.focus()
  }, [paletteOpen])

  async function handleVote(company: Company, vote: Vote) {
    const updated = await patchCompany(company.company, { vote })
    setCompanies(cs => cs.map(c => c.company === updated.company ? updated : c))
    setSelected(updated)
  }

  const loved = companies.filter(c => c.vote === 'love' || c.vote === 'like')
  const others = companies.filter(c => c.vote !== 'love' && c.vote !== 'like')

  const paletteResults = paletteOpen
    ? companies.filter(c =>
        c.company.toLowerCase().includes(query.toLowerCase()) ||
        (c.ai_category ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : []

  const inPipeline = companies.filter(c => c.stage && !['', 'Unknown'].includes(c.stage)).length

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Main area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
        <h1 style={{ marginTop: 0 }}>Company Browser</h1>

        {loved.length > 0 && (
          <>
            <h2>Love &amp; Like</h2>
            <CompanyGrid companies={loved} onSelect={setSelected} />
          </>
        )}

        <h2>Others</h2>
        <CompanyGrid companies={others} onSelect={setSelected} />
      </div>

      {/* Insights sidebar */}
      <aside style={{
        width: 280,
        borderLeft: '1px solid #e5e7eb',
        padding: '1.5rem',
        background: '#fafafa',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}>
        <div>
          <h3 style={{ marginTop: 0 }}>At a glance</h3>
          <p>Total tracked: <strong>{companies.length}</strong></p>
          <p>Love + like: <strong>{loved.length}</strong></p>
          <p>In pipeline: <strong>{inPipeline}</strong></p>
        </div>
        <div>
          <h3>You favor</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {preferenceProfile(companies).map(tag => (
              <span key={tag} style={{
                background: '#dbeafe',
                color: '#1d4ed8',
                borderRadius: 12,
                padding: '2px 10px',
                fontSize: 13,
              }}>{tag}</span>
            ))}
            {preferenceProfile(companies).length === 0 && <span style={{ color: '#9ca3af' }}>Vote on companies to see preferences</span>}
          </div>
        </div>
        <button
          onClick={() => navigate('/triage')}
          style={{
            marginTop: 'auto',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Start triage
        </button>
      </aside>

      {/* Drawer */}
      {selected && (
        <div
          role="dialog"
          aria-label={selected.company}
          style={{
            position: 'fixed',
            right: 280,
            top: 0,
            width: 420,
            height: '100vh',
            background: '#fff',
            borderLeft: '1px solid #e5e7eb',
            boxShadow: '-4px 0 24px rgba(0,0,0,.1)',
            padding: '1.5rem',
            overflow: 'auto',
            zIndex: 10,
          }}
        >
          <button onClick={() => setSelected(null)} style={{ float: 'right', cursor: 'pointer' }}>✕ Close</button>
          <h2 style={{ marginTop: 0 }}>{selected.company}</h2>
          {selected.link && <a href={selected.link} target="_blank" rel="noreferrer">{selected.link}</a>}
          <dl style={{ lineHeight: 2 }}>
            <dt>Location</dt><dd>{selected.location ?? '—'}</dd>
            <dt>Employees</dt><dd>{selected.employees ?? '—'}</dd>
            <dt>Quality</dt><dd>{stars(selected.company_quality)}</dd>
            <dt>Stage</dt><dd>{selected.stage ?? '—'}</dd>
            <dt>AI category</dt><dd>{selected.ai_category ?? '—'}</dd>
          </dl>
          <p style={{ whiteSpace: 'pre-wrap' }}>{selected.notes}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: '1rem' }}>
            {VOTES.map(v => (
              <button
                key={v}
                aria-label={v}
                onClick={() => handleVote(selected, v)}
                style={{
                  border: selected.vote === v ? '2px solid #2563eb' : '1px solid #d1d5db',
                  borderRadius: 8,
                  padding: '6px 12px',
                  cursor: 'pointer',
                  background: selected.vote === v ? '#eff6ff' : '#fff',
                  fontWeight: selected.vote === v ? 700 : 400,
                }}
              >
                {VOTE_EMOJI[v]} {v}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ⌘K palette */}
      {paletteOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.4)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '10vh',
            zIndex: 20,
          }}
          onClick={() => setPaletteOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 12,
              width: 480,
              maxHeight: '60vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,.2)',
            }}
          >
            <input
              ref={searchRef}
              placeholder="Search companies…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                border: 'none',
                borderBottom: '1px solid #e5e7eb',
                padding: '14px 16px',
                fontSize: 16,
                outline: 'none',
              }}
            />
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, overflow: 'auto' }}>
              {paletteResults.map(c => (
                <li
                  key={c.company}
                  onClick={() => { setSelected(c); setPaletteOpen(false) }}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <span>{c.company}</span>
                  <span style={{ color: '#6b7280', fontSize: 13 }}>{c.ai_category}</span>
                </li>
              ))}
              {paletteResults.length === 0 && (
                <li style={{ padding: '10px 16px', color: '#9ca3af' }}>No results</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

function CompanyGrid({ companies, onSelect }: { companies: Company[]; onSelect: (c: Company) => void }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: '1rem',
      marginBottom: '2rem',
    }}>
      {companies.map(c => (
        <button
          key={c.company}
          onClick={() => onSelect(c)}
          style={{
            textAlign: 'left',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: '1rem',
            background: '#fff',
            cursor: 'pointer',
            transition: 'box-shadow .15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.08)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}
        >
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{c.company}</div>
          <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 6 }}>
            {c.vote ? VOTE_EMOJI[c.vote] : '○'} {c.ai_category}
          </div>
          <div style={{ color: '#f59e0b', fontSize: 12 }}>{stars(c.company_quality)}</div>
        </button>
      ))}
    </div>
  )
}
