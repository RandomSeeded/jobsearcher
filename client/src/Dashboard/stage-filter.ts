import type { Company } from '../types'
import { stageGroup, STAGE_GROUP_COLOR, STAGE_GROUP_LABEL, type StageGroup } from '../display-utils'

// Meta-group filter keys are prefixed so they never collide with a stage name.
export const GROUP_PREFIX = 'g:'

// Meta-filters offered in addition to precise stages. A meta-filter can span
// several colour groups — "In progress" deliberately also matches Blocked, since
// those are still live threads worth tracking (Blocked keeps its own orange).
export type MetaFilter = { key: string; label: string; color: string; groups: StageGroup[] }
export const META_FILTERS: MetaFilter[] = [
  { key: 'successful', label: STAGE_GROUP_LABEL.successful, color: STAGE_GROUP_COLOR.successful, groups: ['successful'] },
  { key: 'in_progress', label: STAGE_GROUP_LABEL.in_progress, color: STAGE_GROUP_COLOR.in_progress, groups: ['in_progress', 'blocked'] },
]

// Active = set of stage names and/or meta-filter keys (`g:successful`). Empty = no filter.
export function matchesStageFilter(c: Company, active: Set<string>): boolean {
  if (active.size === 0) return true
  if (!c.stage) return false
  if (active.has(c.stage)) return true
  const g = stageGroup(c.stage)
  if (!g) return false
  return META_FILTERS.some(mf => active.has(GROUP_PREFIX + mf.key) && mf.groups.includes(g))
}
