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
