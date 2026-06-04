import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCompanies, patchCompany, enqueueRun } from './api'
import { DiscoverQueuePane } from './DiscoverQueuePane'
import type { Company, Vote } from './types'

const VOTE_EMOJI: Record<string, string> = {
  love: '❤️',
  like: '👍',
  neutral: '😐',
  not_sure_yet: '🤔',
  dislike: '👎',
}

const VOTES: Vote[] = ['love', 'like', 'neutral', 'not_sure_yet', 'dislike']

function toTitleCase(s: string) {
  return s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

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
  const others = companies.filter(c => c.vote && c.vote !== 'love' && c.vote !== 'like')
  const uncategorized = companies.filter(c => !c.vote)

  const paletteResults = paletteOpen
    ? companies.filter(c =>
        c.company.toLowerCase().includes(query.toLowerCase()) ||
        (c.ai_category ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : []

  const inPipeline = companies.filter(c => c.stage && !['', 'Unknown'].includes(c.stage)).length

  async function handleFindMoreLike(company: Company) {
    const prompt = `find more companies like ${company.company} — ${company.ai_category ?? 'AI'}, ~${company.employees ?? 'unknown'} employees, ${company.location ?? 'any location'}`
    await enqueueRun(prompt, 5)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Main area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
        <h1 style={{ marginTop: 0 }}>Job Search</h1>

        {loved.length > 0 && (
          <>
            <h2>Love &amp; Like</h2>
            <CompanyGrid companies={loved} onSelect={setSelected} />
          </>
        )}

        {others.length > 0 && (
          <>
            <h2>Others</h2>
            <CompanyGrid companies={others} onSelect={setSelected} />
          </>
        )}

        {uncategorized.length > 0 && (
          <>
            <h2>Uncategorized</h2>
            <CompanyGrid companies={uncategorized} onSelect={setSelected} />
          </>
        )}
      </div>

      {/* Right panel — detail view or insights+queue */}
      <div className="flex shrink-0 w-[580px] border-l border-gray-200 overflow-hidden h-screen">
      {selected ? (
        <div
          role="dialog"
          aria-label={selected.company}
          className="flex flex-col flex-1 overflow-hidden bg-white"
        >
          <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>{selected.company}</h2>
                {selected.terse && <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>{selected.terse}</p>}
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18, lineHeight: 1, padding: 0 }}
              >✕</button>
            </div>

            {selected.link && (
              <a href={selected.link} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#2563eb', display: 'block', marginBottom: '1.25rem' }}>
                {selected.link}
              </a>
            )}

            {/* Facts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginBottom: '1.25rem' }}>
              <Fact label="Location" value={selected.location ?? '—'} dim={!selected.location} />
              <Fact label="Employees" value={selected.employees ?? '—'} dim={!selected.employees} />
              <Fact label="Stage" value={selected.stage ? toTitleCase(selected.stage) : '—'} dim={!selected.stage} />
              <Fact label="Funding" value={selected.fundraising ?? '—'} dim={!selected.fundraising} />
              <Fact label="Quality" value={stars(selected.company_quality) ?? '—'} dim={!selected.company_quality} />
              {selected.ai_category && selected.ai_category !== 'none' && (
                <Fact label="AI layer" value={AI_LAYER_SHORT[selected.ai_category] ?? selected.ai_category} />
              )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '0 0 1.25rem' }} />

            {/* Notes */}
            <p style={{ fontSize: 13, lineHeight: 1.7, color: '#374151', whiteSpace: 'pre-wrap', margin: '0 0 1.25rem' }}>
              {selected.notes}
            </p>

            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '0 0 1.25rem' }} />

            {/* Vote */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
              {VOTES.map(v => (
                <button
                  key={v}
                  aria-label={v}
                  onClick={() => handleVote(selected, v)}
                  style={{
                    border: selected.vote === v ? '2px solid #2563eb' : '1px solid #d1d5db',
                    borderRadius: 8,
                    padding: '5px 11px',
                    cursor: 'pointer',
                    background: selected.vote === v ? '#eff6ff' : '#fff',
                    fontWeight: selected.vote === v ? 600 : 400,
                    fontSize: 13,
                  }}
                >
                  {VOTE_EMOJI[v]} {v}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleFindMoreLike(selected)}
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
      ) : (
        <>
          <aside className="w-[280px] flex flex-col gap-6 p-6 bg-gray-50 border-r border-gray-200 overflow-y-auto">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">At a glance</p>
              <div className="space-y-2">
                {[
                  ['Total tracked', companies.length],
                  ['Love + like',   loved.length],
                  ['Others',        others.length],
                  ['Uncategorized', uncategorized.length],
                  ['In pipeline',   inPipeline],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between items-baseline">
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className="text-sm font-semibold text-gray-800 tabular-nums">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">You favor</p>
              <div className="flex flex-wrap gap-1.5">
                {preferenceProfile(companies).map(tag => (
                  <span key={tag} className="bg-blue-50 text-blue-700 text-xs rounded-full px-2.5 py-0.5">{tag}</span>
                ))}
                {preferenceProfile(companies).length === 0 && (
                  <span className="text-xs text-gray-400">Vote on companies to see preferences</span>
                )}
              </div>
            </div>

            <button
              onClick={() => navigate('/triage')}
              className="mt-auto bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg px-4 py-2.5 cursor-pointer border-0"
            >
              Start triage
            </button>
          </aside>
          <DiscoverQueuePane />
        </>
      )}
      </div>

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

const OFFER_STAGES = new Set(['OFFER', 'Rejected Offer'])
const REJECTION_STAGES = new Set(['Rejected me'])

function stageAccent(stage?: string): string {
  if (!stage) return '#e5e7eb'
  if (OFFER_STAGES.has(stage)) return '#22c55e'
  if (REJECTION_STAGES.has(stage)) return '#ef4444'
  return '#e5e7eb'
}

const AI_LAYER_SHORT: Record<string, string> = {
  'ai application layer': 'app layer',
  'ai tooling layer': 'tooling',
  'ai data layer': 'data layer',
  'ai infrastructure': 'infra',
  'ai model companies': 'models',
}

function CompanyGrid({ companies, onSelect }: { companies: Company[]; onSelect: (c: Company) => void }) {
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

function Fact({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div>
      <div style={{ color: '#9ca3af', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ color: dim ? '#d1d5db' : '#374151', fontWeight: 500 }}>{value}</div>
    </div>
  )
}
