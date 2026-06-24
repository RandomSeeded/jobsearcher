import type { Company } from '../types'

// `employees` is free-text: "~100", "~50-100", "51-100", "<20", "~3000+", "~1,700",
// "Unknown", null. Pull a representative headcount, or undefined if unparseable.
export function parseEmployees(raw?: string): number | undefined {
  if (!raw) return undefined
  const nums = raw.replace(/,/g, '').match(/\d+/g)
  if (!nums || nums.length === 0) return undefined
  const vals = nums.map(Number)
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

export interface SizeBucket {
  key: string
  label: string
  min: number // inclusive
  max: number // exclusive
}

export const SIZE_BUCKETS: SizeBucket[] = [
  { key: 'xs', label: '<20', min: 0, max: 20 },
  { key: 'sm', label: '20–49', min: 20, max: 50 },
  { key: 'md', label: '50–199', min: 50, max: 200 },
  { key: 'lg', label: '200–999', min: 200, max: 1000 },
  { key: 'xl', label: '1000+', min: 1000, max: Infinity },
]

export const UNKNOWN_KEY = 'unknown'

export function bucketOf(n: number | undefined): SizeBucket | undefined {
  if (n === undefined) return undefined
  return SIZE_BUCKETS.find(b => n >= b.min && n < b.max)
}

// Active = set of bucket keys (incl. UNKNOWN_KEY). Empty set means no filter.
export function matchesSizeFilter(c: Company, active: Set<string>): boolean {
  if (active.size === 0) return true
  const b = bucketOf(parseEmployees(c.employees))
  return b ? active.has(b.key) : active.has(UNKNOWN_KEY)
}

export function bucketCounts(companies: Company[]): Record<string, number> {
  const counts: Record<string, number> = { [UNKNOWN_KEY]: 0 }
  for (const b of SIZE_BUCKETS) counts[b.key] = 0
  for (const c of companies) {
    const b = bucketOf(parseEmployees(c.employees))
    counts[b ? b.key : UNKNOWN_KEY]++
  }
  return counts
}
