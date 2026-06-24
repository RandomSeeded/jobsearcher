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

// Stages collapse into a few semantic groups. Each group has one colour, and
// two of them ("successful" / "in_progress") double as the meta-filter options.
export type StageGroup = 'successful' | 'in_progress' | 'on_hold' | 'rejected' | 'passed'

export const STAGE_GROUP_MEMBERS: Record<StageGroup, string[]> = {
  successful: ['OFFER', 'Rejected Offer'],                       // an offer was extended
  in_progress: ['Outreach', 'Recruiter Call', 'Hiring Manager Interview',
    'Technical Interview', 'System Design', 'Takehome', 'ONSITE'], // active pipeline
  on_hold: ['On Hold'],                                          // paused
  rejected: ['Rejected me', 'BLOCKED ME'],                       // they ended it
  passed: ['Rejected them', 'BLOCKED THEM'],                     // you walked away
}

export const STAGE_GROUP_LABEL: Record<StageGroup, string> = {
  successful: 'Successful',
  in_progress: 'In progress',
  on_hold: 'On hold',
  rejected: 'Rejected',
  passed: 'Passed',
}

// First-pass palette — a few semantic colours, not one per stage.
export const STAGE_GROUP_COLOR: Record<StageGroup, string> = {
  successful: '#16a34a', // green
  in_progress: '#2563eb', // blue
  on_hold: '#d97706', // amber
  rejected: '#dc2626', // red
  passed: '#64748b', // slate
}

const STAGE_TO_GROUP: Record<string, StageGroup> = Object.fromEntries(
  (Object.entries(STAGE_GROUP_MEMBERS) as [StageGroup, string[]][])
    .flatMap(([g, members]) => members.map(m => [m, g] as const)),
)

export function stageGroup(stage?: string): StageGroup | undefined {
  return stage ? STAGE_TO_GROUP[stage] : undefined
}

const NEUTRAL_STAGE = '#e5e7eb'
export function stageColor(stage?: string): string {
  const g = stageGroup(stage)
  return g ? STAGE_GROUP_COLOR[g] : NEUTRAL_STAGE
}

export const AI_LAYER_SHORT: Record<string, string> = {
  'ai application layer': 'app layer',
  'ai tooling layer': 'tooling',
  'ai data layer': 'data layer',
  'ai infrastructure': 'infra',
  'ai model companies': 'models',
}
