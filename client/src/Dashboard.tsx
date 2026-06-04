import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCompanies, patchCompany, enqueueRun } from './api'
import { CompanyDetailPane } from './CompanyDetailPane'
import { CommandPalette } from './CommandPalette'
import { DiscoverQueuePane } from './DiscoverQueuePane'
import { VOTE_EMOJI, toTitleCase, stars, AI_LAYER_SHORT, Fact } from './display-utils'
import type { Company, Vote } from './types'

function computeGlanceTags(companies: Company[]) {
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

export function Dashboard() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selected, setSelected] = useState<Company | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

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
  const others = companies.filter(c => c.vote && c.vote !== 'love' && c.vote !== 'like')
  const uncategorized = companies.filter(c => !c.vote)
  const inPipeline = companies.filter(c => c.stage && !['', 'Unknown'].includes(c.stage)).length

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
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

      <div className="flex shrink-0 w-[580px] border-l border-gray-200 overflow-hidden h-screen">
        {selected ? (
          <CompanyDetailPane
            company={selected}
            onVote={v => handleVote(selected, v)}
            onClose={() => setSelected(null)}
            onFindMore={handleFindMore}
          />
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
                  {computeGlanceTags(companies).map(tag => (
                    <span key={tag} className="bg-blue-50 text-blue-700 text-xs rounded-full px-2.5 py-0.5">{tag}</span>
                  ))}
                  {computeGlanceTags(companies).length === 0 && (
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
