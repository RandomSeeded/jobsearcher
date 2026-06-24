import type { Company } from '../types'
import { STAGE_GROUP_MEMBERS, STAGE_GROUP_LABEL, STAGE_GROUP_COLOR, stageGroup, type StageGroup } from '../display-utils'

export interface Lane { stage: string; companies: Company[] }
export interface PhaseColumn { key: StageGroup; label: string; color: string; lanes: Lane[] }

export const PHASE_ORDER: StageGroup[] = ['outreach', 'cold_apply', 'in_progress', 'on_hold', 'successful', 'blocked', 'rejected', 'passed']

// Terminal phases — closed/dead deals. Collapsed on first visit to keep the live funnel wide.
export const DEFAULT_COLLAPSED_PHASES: StageGroup[] = ['blocked', 'rejected', 'passed']

// Move `dragged` to `target`'s position (insert-before). Used for column reordering.
export function reorderPhases(order: StageGroup[], dragged: StageGroup, target: StageGroup): StageGroup[] {
  if (dragged === target) return order
  const without = order.filter(p => p !== dragged)
  const at = without.indexOf(target)
  if (at < 0) return order
  return [...without.slice(0, at), dragged, ...without.slice(at)]
}

// Best companies first: quality desc, then name asc.
function byQualityThenName(a: Company, b: Company): number {
  return (b.company_quality ?? 0) - (a.company_quality ?? 0) || a.company.localeCompare(b.company)
}

// Companies actively in the pipeline, grouped Phase → Stage lane.
export function buildPipeline(companies: Company[]): PhaseColumn[] {
  const staged = companies.filter(c => stageGroup(c.stage))
  return PHASE_ORDER.map(key => ({
    key,
    label: STAGE_GROUP_LABEL[key],
    color: STAGE_GROUP_COLOR[key],
    // Every member stage is a lane (incl. empty) so cards can be dragged into it.
    lanes: STAGE_GROUP_MEMBERS[key]
      .map(stage => ({ stage, companies: staged.filter(c => c.stage === stage).sort(byQualityThenName) })),
  }))
}
