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
export type StageGroup = 'successful' | 'in_progress' | 'outreach' | 'on_hold' | 'watch' | 'rejected' | 'passed'

export const STAGE_GROUP_MEMBERS: Record<StageGroup, string[]> = {
  successful: ['OFFER', 'Rejected Offer'],                       // an offer was extended
  in_progress: ['Recruiter Call', 'Hiring Manager Interview',   // genuinely active —
    'Technical Interview', 'System Design', 'Takehome', 'ONSITE'], // something scheduled
  outreach: ['Outreach'],                                        // inbound, not yet talked to
  on_hold: ['On Hold'],                                          // paused
  watch: ['BLOCKED ME', 'BLOCKED THEM'],                         // keep an eye on these
  rejected: ['Rejected me'],                                     // they passed on me
  passed: ['Rejected them'],                                     // I passed on them
}

export const STAGE_GROUP_LABEL: Record<StageGroup, string> = {
  successful: 'Successful',
  in_progress: 'In progress',
  outreach: 'Outreach',
  on_hold: 'On hold',
  watch: 'Blocked',
  rejected: 'Rejected',
  passed: 'Passed',
}

// Softened palette — muted tones, not vivid. One colour per semantic group.
export const STAGE_GROUP_COLOR: Record<StageGroup, string> = {
  successful: '#6fae8a', // soft green
  in_progress: '#7798d4', // soft blue — scheduled / active
  outreach: '#b1b6bd', // light gray — untouched inbound
  on_hold: '#cdad6e', // soft amber
  watch: '#dd9e64', // soft orange — blocked, keep an eye on
  rejected: '#db6b6b', // soft but clearly red
  passed: '#94a0ad', // soft slate
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
