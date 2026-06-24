import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCompanies, fetchPreferences, patchCompany, enqueueRun, distillPreferences } from '../api'
import type { Preferences } from '../api'
import { CompanyDetailPane } from '../CompanyDetailPane'
import { CommandPalette } from '../CommandPalette'
import { DiscoverQueuePane } from '../DiscoverQueuePane'
import type { Company, Vote } from '../types'
import { CompanyGrid } from './CompanyGrid'
import { SizeFilter } from './SizeFilter'
import { matchesSizeFilter } from './sizeBuckets'

export function Dashboard() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [preferences, setPreferences] = useState<Preferences | null>(null)
  const [selected, setSelected] = useState<Company | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [sizeKeys, setSizeKeys] = useState<Set<string>>(new Set())
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

  const filtered = companies.filter(c => matchesSizeFilter(c, sizeKeys))
  const loved = filtered.filter(c => c.vote === 'love' || c.vote === 'like')
  const disliked = filtered.filter(c => c.vote === 'dislike' || c.vote === 'neutral')
  const uncategorized = filtered.filter(c => !c.vote || c.vote === 'not_sure_yet')


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

        <div style={{ marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid #f3f4f6' }}>
          <SizeFilter companies={companies} active={sizeKeys} onChange={setSizeKeys} />
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
