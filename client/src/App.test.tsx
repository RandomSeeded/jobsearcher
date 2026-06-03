import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

const MOCK_COMPANIES = [
  {
    company: 'Ambrook',
    vote: 'neutral',
    stage: 'Rejected Offer',
    location: 'Unknown',
    employees: '~19-30',
    link: 'https://ambrook.com',
    ai_category: 'none',
    company_quality: 4,
    last_outreach: '2026-04-07',
    notes: 'Direct outreach from team member.',
  },
  {
    company: 'Arena',
    vote: 'love',
    stage: 'Applied',
    location: 'NYC',
    employees: '30-80',
    link: 'https://arena.io',
    ai_category: 'infra',
    company_quality: 5,
    last_outreach: '2026-05-01',
    notes: 'Great team.',
  },
]

function renderApp() {
  return render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_COMPANIES),
    })
  )
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Company browser', () => {
  it('renders company tiles after loading', async () => {
    renderApp()
    await waitFor(() => {
      expect(screen.getByText('Ambrook')).toBeInTheDocument()
      expect(screen.getByText('Arena')).toBeInTheDocument()
    })
  })

  it('opens drawer when tile is clicked', async () => {
    renderApp()
    await waitFor(() => screen.getByText('Ambrook'))
    await userEvent.click(screen.getByText('Ambrook'))
    expect(screen.getByText('Direct outreach from team member.')).toBeInTheDocument()
  })

  it('calls PATCH when vote button is clicked in drawer', async () => {
    const mockFetch = vi.fn()
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_COMPANIES) })
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ ...MOCK_COMPANIES[0], vote: 'love' }) })
    vi.stubGlobal('fetch', mockFetch)

    renderApp()
    await waitFor(() => screen.getByText('Ambrook'))
    await userEvent.click(screen.getByText('Ambrook'))
    await userEvent.click(screen.getByRole('button', { name: /love/i }))
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/companies/ambrook',
        expect.objectContaining({ method: 'PATCH' })
      )
    })
  })

  it('opens ⌘K palette on keyboard shortcut', async () => {
    renderApp()
    await waitFor(() => screen.getByText('Ambrook'))
    await userEvent.keyboard('{Meta>}k{/Meta}')
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('filters companies in palette by name', async () => {
    renderApp()
    await waitFor(() => screen.getByText('Ambrook'))
    await userEvent.keyboard('{Meta>}k{/Meta}')
    await userEvent.type(screen.getByPlaceholderText(/search/i), 'are')
    expect(screen.queryAllByText('Arena').length).toBeGreaterThan(0)
  })
})

describe('/triage route', () => {
  it('renders stub placeholder', () => {
    render(
      <MemoryRouter initialEntries={['/triage']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByText(/decision queue/i)).toBeInTheDocument()
  })
})
