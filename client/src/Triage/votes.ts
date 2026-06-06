import type { Vote } from '../types'

export const VOTES: { value: Vote; label: string; emoji: string }[] = [
  { value: 'love', label: 'love', emoji: '❤️' },
  { value: 'like', label: 'like', emoji: '👍' },
  { value: 'neutral', label: 'neutral', emoji: '😐' },
  { value: 'not_sure_yet', label: 'not sure yet', emoji: '🤔' },
  { value: 'dislike', label: 'dislike', emoji: '👎' },
]
