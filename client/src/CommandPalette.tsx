import { useEffect, useRef } from 'react'
import type { Company } from './types'

export function CommandPalette({
  companies,
  query,
  onQueryChange,
  onSelect,
  onClose,
}: {
  companies: Company[]
  query: string
  onQueryChange: (q: string) => void
  onSelect: (c: Company) => void
  onClose: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results = companies.filter(c =>
    c.company.toLowerCase().includes(query.toLowerCase()) ||
    (c.ai_category ?? '').toLowerCase().includes(query.toLowerCase())
  )

  return (
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
      onClick={onClose}
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
          ref={inputRef}
          placeholder="Search companies…"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          style={{
            border: 'none',
            borderBottom: '1px solid #e5e7eb',
            padding: '14px 16px',
            fontSize: 16,
            outline: 'none',
          }}
        />
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, overflow: 'auto' }}>
          {results.map(c => (
            <li
              key={c.company}
              onClick={() => { onSelect(c); onClose() }}
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
          {results.length === 0 && (
            <li style={{ padding: '10px 16px', color: '#9ca3af' }}>No results</li>
          )}
        </ul>
      </div>
    </div>
  )
}
