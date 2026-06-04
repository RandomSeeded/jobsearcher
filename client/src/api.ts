import type { Company } from './types'

export interface PreferenceItem { short: string; text: string; confidence: number }
export interface Preferences { likes: PreferenceItem[]; dislikes: PreferenceItem[]; generatedAt: string | null }

export async function fetchPreferences(): Promise<Preferences> {
  const res = await fetch('/api/preferences')
  if (!res.ok) throw new Error('Failed to fetch preferences')
  return res.json()
}

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
  model: string
  status: 'pending' | 'running' | 'done' | 'failed'
  created_at: string
  run_at: string | null
  log_path?: string
  output_summary?: string
  discovered_companies?: string[]
}

export async function fetchQueue(): Promise<DiscoverRun[]> {
  const res = await fetch('/api/discover-queue')
  if (!res.ok) throw new Error('Failed to fetch queue')
  return res.json()
}

export async function enqueueRun(prompt?: string, count = 5, model = 'claude-haiku-4-5-20251001'): Promise<DiscoverRun> {
  const res = await fetch('/api/discover-queue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, count, model }),
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

export async function fetchRunLog(id: string): Promise<string> {
  const res = await fetch(`/api/discover-queue/${id}/log`)
  if (!res.ok) throw new Error('no log')
  return res.text()
}
