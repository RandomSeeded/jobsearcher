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
  {
    company: 'Acme',
    vote: 'not_sure_yet',
    stage: 'Outreach',
    location: 'SF',
    employees: '50-100',
    link: 'https://acme.com',
    ai_category: 'infra',
    company_quality: 3,
    last_outreach: '2026-05-10',
    notes: 'Not sure about this one.',
  },
]

const MOCK_PREFS = { likes: [], dislikes: [], generatedAt: null, distilling: false }

function makeFetchMock(patchOverride?: (url: string) => ReturnType<typeof Promise.resolve>) {
  return vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (patchOverride && opts?.method === 'PATCH') return patchOverride(url)
    if (url === '/api/preferences') return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_PREFS) })
    if (url === '/api/discover-queue') return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_COMPANIES) })
  })
}

function mockFetchResponses() {
  vi.stubGlobal('fetch', makeFetchMock())
}

function renderApp() {
  return render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  )
}

beforeEach(() => {
  mockFetchResponses()
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

  it('shows not_sure_yet companies in the dashboard', async () => {
    renderApp()
    await waitFor(() => {
      expect(screen.getByText('Acme')).toBeInTheDocument()
    })
  })

  it('opens drawer when tile is clicked', async () => {
    renderApp()
    await waitFor(() => screen.getByText('Ambrook'))
    await userEvent.click(screen.getByText('Ambrook'))
    expect(screen.getByText('Direct outreach from team member.')).toBeInTheDocument()
  })

  it('calls PATCH when vote button is clicked in drawer', async () => {
    const mockFetch = makeFetchMock(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ ...MOCK_COMPANIES[0], vote: 'love' }) })
    )
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

describe('Triage', () => {
  function renderTriage() {
    return render(
      <MemoryRouter initialEntries={['/triage']}>
        <App />
      </MemoryRouter>
    )
  }

  it('renders decision queue heading', () => {
    renderTriage()
    expect(screen.getByText(/decision queue/i)).toBeInTheDocument()
  })

  it('shows vote buttons on an already-voted company (revote)', async () => {
    // Ambrook has vote='neutral'. Triage with ?companies=Ambrook forces it into
    // the queue regardless of vote status. Vote buttons must be present so the
    // user can change their mind.
    render(
      <MemoryRouter initialEntries={['/triage?companies=Ambrook']}>
        <App />
      </MemoryRouter>
    )
    // All five vote buttons should be visible even though Ambrook already has a vote
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /love/i })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /dislike/i })).toBeInTheDocument()
    expect(screen.getAllByRole('button').map(b => b.textContent)).toEqual(
      expect.arrayContaining([expect.stringMatching(/love/i), expect.stringMatching(/dislike/i)])
    )
  })
})
