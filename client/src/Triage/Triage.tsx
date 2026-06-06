import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchCompanies, patchCompany } from '../api'
import type { Company, Vote } from '../types'
import { DetailPane } from './DetailPane'
import { VOTES } from './votes'

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
