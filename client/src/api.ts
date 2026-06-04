import type { Company } from './types'

export async function fetchCompanies(): Promise<Company[]> {
  const res = await fetch('/api/companies')
  if (!res.ok) throw new Error('Failed to fetch companies')
  return res.json()
}

export async function patchCompany(name: string, patch: Partial<Company>): Promise<Company> {
  const res = await fetch(`/api/companies/${name.toLowerCase()}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error('Failed to update company')
  return res.json()
}

export interface DiscoverRun {
  id: string
  prompt?: string
  count: number
  status: 'pending' | 'running' | 'done' | 'failed'
  created_at: string
  run_at: string | null
  output?: string
  output_summary?: string
}

export async function fetchQueue(): Promise<DiscoverRun[]> {
  const res = await fetch('/api/discover-queue')
  if (!res.ok) throw new Error('Failed to fetch queue')
  return res.json()
}

export async function enqueueRun(prompt?: string, count = 5): Promise<DiscoverRun> {
  const res = await fetch('/api/discover-queue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, count }),
  })
  if (!res.ok) throw new Error('Failed to enqueue')
  return res.json()
}

export async function triggerRun(id: string): Promise<DiscoverRun> {
  const res = await fetch(`/api/discover-queue/${id}/run`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to trigger run')
  return res.json()
}

export async function deleteRun(id: string): Promise<void> {
  await fetch(`/api/discover-queue/${id}`, { method: 'DELETE' })
}
