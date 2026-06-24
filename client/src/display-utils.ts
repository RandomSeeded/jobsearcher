import type { Vote } from './types'

export const VOTE_EMOJI: Record<string, string> = {
  love: '❤️',
  like: '👍',
  neutral: '😐',
  not_sure_yet: '🤔',
  dislike: '👎',
}

export const VOTES: Vote[] = ['love', 'like', 'neutral', 'not_sure_yet', 'dislike']

export function toTitleCase(s: string) {
  return s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

export function stars(n?: number) {
  if (!n) return '—'
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}

// Application pipeline status (the `stage` field). The full vocabulary lives in
// CONTEXT.md → "Stage". Funding rounds belong in `fundraising`, not here.
export const STAGES = [
  'Outreach', 'Recruiter Call', 'Hiring Manager Interview', 'Technical Interview',
  'System Design', 'Takehome', 'ONSITE', 'OFFER', 'Rejected Offer', 'Rejected me',
  'Rejected them', 'On Hold', 'BLOCKED ME', 'BLOCKED THEM',
] as const

// Green = an offer was extended (company accepted you); red = company rejected you.
// "Rejected them" (you passed) and in-process stages stay neutral.
const GREEN_STAGES = new Set(['OFFER', 'Rejected Offer'])
const RED_STAGES = new Set(['Rejected me'])

export function stageAccent(stage?: string): string {
  if (stage && GREEN_STAGES.has(stage)) return '#22c55e'
  if (stage && RED_STAGES.has(stage)) return '#ef4444'
  return '#e5e7eb'
}

export const AI_LAYER_SHORT: Record<string, string> = {
  'ai application layer': 'app layer',
  'ai tooling layer': 'tooling',
  'ai data layer': 'data layer',
  'ai infrastructure': 'infra',
  'ai model companies': 'models',
}
