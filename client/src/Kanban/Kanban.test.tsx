import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'

const COMPANIES = [
  { company: 'Acme', stage: 'Outreach', company_quality: 5, ai_category: 'none', notes: 'Acme notes here' },
  { company: 'Beta', stage: 'Technical Interview', company_quality: 4, ai_category: 'none', notes: 'Beta notes' },
  { company: 'Stale', notes: 'never had a stage' }, // no stage → not in pipeline
]

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((url: string) =>
    url === '/api/companies'
      ? Promise.resolve({ ok: true, json: () => Promise.resolve(COMPANIES) })
      : Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
  ))
})
afterEach(() => vi.restoreAllMocks())

function renderKanban() {
  return render(<MemoryRouter initialEntries={['/kanban']}><App /></MemoryRouter>)
}

describe('Kanban pipeline board', () => {
  it('shows in-process companies and omits stageless ones', async () => {
    renderKanban()
    await waitFor(() => expect(screen.getByText('Acme')).toBeInTheDocument())
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.queryByText('Stale')).not.toBeInTheDocument()
  })

  it('opens the detail pane when a card is clicked', async () => {
    renderKanban()
    await waitFor(() => screen.getByText('Acme'))
    await userEvent.click(screen.getByText('Acme'))
    expect(screen.getByText('Acme notes here')).toBeInTheDocument()
  })
})
