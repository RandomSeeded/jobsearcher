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

export const AI_LAYER_SHORT: Record<string, string> = {
  'ai application layer': 'app layer',
  'ai tooling layer': 'tooling',
  'ai data layer': 'data layer',
  'ai infrastructure': 'infra',
  'ai model companies': 'models',
}
