import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCompanies, fetchPreferences, patchCompany, enqueueRun, distillPreferences } from './api'
import type { Preferences } from './api'
import { CompanyDetailPane } from './CompanyDetailPane'
import { CommandPalette } from './CommandPalette'
import { DiscoverQueuePane } from './DiscoverQueuePane'
import { VOTE_EMOJI, toTitleCase, stars, AI_LAYER_SHORT, Fact } from './display-utils'
import type { Company, Vote } from './types'

export function Dashboard() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [preferences, setPreferences] = useState<Preferences | null>(null)
  const [selected, setSelected] = useState<Company | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchCompanies().then(setCompanies)
    fetchPreferences().then(setPreferences).catch(() => {})
  }, [])

  useEffect(() => {
    if (!preferences?.distilling) return
    const id = setInterval(() => {
      fetchPreferences().then(p => {
        setPreferences(p)
        if (!p.distilling) clearInterval(id)
      }).catch(() => {})
    }, 4000)
    return () => clearInterval(id)
  }, [preferences?.distilling])

  async function handleDistill() {
    await distillPreferences()
    setPreferences(p => p ? { ...p, distilling: true } : p)
  }

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

  async function handleVote(company: Company, vote: Vote) {
    const updated = await patchCompany(company.company, { vote })
    setCompanies(cs => cs.map(c => c.company === updated.company ? updated : c))
    setSelected(updated)
  }

  async function handleFindMore(company: Company) {
    const prompt = `find more companies like ${company.company} — ${company.ai_category ?? 'AI'}, ~${company.employees ?? 'unknown'} employees, ${company.location ?? 'any location'}`
    await enqueueRun(prompt, 5)
  }

  const loved = companies.filter(c => c.vote === 'love' || c.vote === 'like')
  const disliked = companies.filter(c => c.vote === 'dislike' || c.vote === 'neutral')
  const uncategorized = companies.filter(c => !c.vote || c.vote === 'not_sure_yet')


  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h1 style={{ marginTop: 0, marginBottom: 0 }}>Job Search</h1>
          <button
            onClick={() => navigate('/triage')}
            className="text-blue-600 hover:text-blue-800 text-sm cursor-pointer bg-transparent border-0 p-0"
          >
            Start triage →
          </button>
        </div>

        {loved.length > 0 && (
          <>
            <h2>Love &amp; Like</h2>
            <CompanyGrid companies={loved} onSelect={setSelected} />
          </>
        )}

        {disliked.length > 0 && (
          <>
            <h2>Disliked</h2>
            <CompanyGrid companies={disliked} onSelect={setSelected} />
          </>
        )}

        {uncategorized.length > 0 && (
          <>
            <h2>Uncategorized</h2>
            <CompanyGrid companies={uncategorized} onSelect={setSelected} />
          </>
        )}
      </div>

      <div className="flex shrink-0 w-[480px] border-l border-gray-200 overflow-hidden h-screen">
        {selected ? (
          <CompanyDetailPane
            company={selected}
            onVote={v => handleVote(selected, v)}
            onClose={() => setSelected(null)}
            onFindMore={handleFindMore}
          />
        ) : (
          <aside className="w-full flex flex-col gap-6 px-6 pt-3 pb-6 bg-gray-50 overflow-hidden h-full">
            <DiscoverQueuePane />
            <div className="flex flex-col min-h-0 flex-1">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Learned preferences</span>
                <button
                  onClick={handleDistill}
                  disabled={preferences?.distilling}
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 4,
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    color: preferences?.distilling ? '#9ca3af' : '#374151',
                    cursor: preferences?.distilling ? 'not-allowed' : 'pointer',
                  }}
                >
                  {preferences?.distilling ? '⟳ running' : 'Re-distill'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1 overflow-y-auto min-h-0 flex-1">
                {preferences && [
                  ...preferences.likes.map(p => ({ ...p, kind: 'like' as const })),
                  ...preferences.dislikes.map(p => ({ ...p, kind: 'dislike' as const })),
                ].sort((a, b) => b.confidence - a.confidence).map(p => (
                  <span
                    key={p.text}
                    title={p.text}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${p.kind === 'like' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}
                    style={{ fontSize: '10px' }}
                  >
                    {p.short}
                    <span className="opacity-50">{Math.round(p.confidence * 100)}%</span>
                  </span>
                ))}
                {!preferences && (
                  <span className="text-gray-400" style={{ fontSize: '10px' }}>Run /distill-preferences to generate</span>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {paletteOpen && (
        <CommandPalette
          companies={companies}
          query={query}
          onQueryChange={setQuery}
          onSelect={setSelected}
          onClose={() => { setPaletteOpen(false); setQuery('') }}
        />
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
