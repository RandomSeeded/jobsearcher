import { useEffect, useRef, useState } from 'react'
import type { Company } from '../types'
import { SIZE_BUCKETS, UNKNOWN_KEY, bucketCounts } from './sizeBuckets'

// Dropdown popover for filtering the Dashboard by employee count.
// Controlled: `active` is a set of bucket keys (incl. UNKNOWN_KEY); empty = no filter.
export function SizeFilter({
  companies,
  active,
  onChange,
}: {
  companies: Company[]
  active: Set<string>
  onChange: (next: Set<string>) => void
}) {
  const [open, setOpen] = useState(false)
  const counts = bucketCounts(companies)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function toggle(key: string) {
    const next = new Set(active)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onChange(next)
  }

  const options = [
    ...SIZE_BUCKETS.map(b => ({ key: b.key, label: `${b.label} employees` })),
    { key: UNKNOWN_KEY, label: 'Unknown size' },
  ]

  const label = active.size === 0 ? 'Company size' : `Company size · ${active.size}`

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          fontSize: 13, padding: '6px 12px', borderRadius: 8,
          border: `1px solid ${active.size ? '#2563eb' : '#d1d5db'}`,
          background: active.size ? '#eff6ff' : '#fff',
          color: active.size ? '#2563eb' : '#374151',
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600,
        }}
      >
        🏢 {label} <span style={{ fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 20,
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,.12)', padding: 6, minWidth: 200,
        }}>
          {options.map(o => (
            <label key={o.key} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
              borderRadius: 6, cursor: 'pointer', fontSize: 13,
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <input type="checkbox" checked={active.has(o.key)} onChange={() => toggle(o.key)} style={{ accentColor: '#2563eb' }} />
              <span style={{ flex: 1 }}>{o.label}</span>
              <span style={{ color: '#9ca3af', fontSize: 12 }}>{counts[o.key]}</span>
            </label>
          ))}
          {active.size > 0 && (
            <button
              onClick={() => onChange(new Set())}
              style={{ width: '100%', marginTop: 4, fontSize: 12, padding: '6px', borderRadius: 6, border: 0, background: '#f3f4f6', color: '#6b7280', cursor: 'pointer' }}
            >
              Clear filter
            </button>
          )}
        </div>
      )}
    </div>
  )
}
