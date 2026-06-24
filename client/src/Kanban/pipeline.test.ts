import { describe, it, expect } from 'vitest'
import { buildPipeline, DEFAULT_COLLAPSED_PHASES, reorderPhases } from './pipeline'
import { STAGE_GROUP_MEMBERS } from '../display-utils'
import type { Company } from '../types'

const co = (company: string, over: Partial<Company> = {}): Company => ({ company, ...over })

function names(cols: ReturnType<typeof buildPipeline>): string[] {
  return cols.flatMap(c => c.lanes.flatMap(l => l.companies.map(x => x.company)))
}

describe('buildPipeline', () => {
  it('excludes companies with no stage (not in the pipeline)', () => {
    const cols = buildPipeline([co('Stageless'), co('Active', { stage: 'Outreach' })])
    expect(names(cols)).toEqual(['Active'])
  })

  it('orders companies within a lane by quality desc, then name', () => {
    const cols = buildPipeline([
      co('Bravo', { stage: 'Outreach', company_quality: 4 }),
      co('Charlie', { stage: 'Outreach', company_quality: 5 }),
      co('Alpha', { stage: 'Outreach', company_quality: 5 }),
    ])
    const lane = cols.find(c => c.key === 'outreach')!.lanes.find(l => l.stage === 'Outreach')!
    expect(lane.companies.map(c => c.company)).toEqual(['Alpha', 'Charlie', 'Bravo'])
  })

  it('keeps a drop-lane for every member stage, even when empty, in canonical order', () => {
    const cols = buildPipeline([co('Acme', { stage: 'ONSITE' })])
    const inProgress = cols.find(c => c.key === 'in_progress')!
    expect(inProgress.lanes.map(l => l.stage)).toEqual(STAGE_GROUP_MEMBERS.in_progress)
  })

  it('collapses the terminal phases (blocked, rejected, passed) by default', () => {
    expect([...DEFAULT_COLLAPSED_PHASES].sort()).toEqual(['blocked', 'passed', 'rejected'])
  })
})

describe('reorderPhases', () => {
  it('moves the dragged phase to the dropped-on phase position (insert before)', () => {
    expect(reorderPhases(['outreach', 'cold_apply', 'in_progress', 'on_hold'], 'on_hold', 'cold_apply'))
      .toEqual(['outreach', 'on_hold', 'cold_apply', 'in_progress'])
  })

  it('returns the order unchanged when dragged onto itself', () => {
    expect(reorderPhases(['outreach', 'cold_apply', 'in_progress'], 'cold_apply', 'cold_apply'))
      .toEqual(['outreach', 'cold_apply', 'in_progress'])
  })
})
