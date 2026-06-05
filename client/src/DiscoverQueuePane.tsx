import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchQueue, enqueueRun, triggerRun, deleteRun, fetchRunLog, type DiscoverRun } from './api'

const STATUS_COLOR: Record<DiscoverRun['status'], string> = {
  pending: '#6b7280',
  running: '#2563eb',
  done: '#16a34a',
  failed: '#dc2626',
}

export function DiscoverQueuePane() {
  const [runs, setRuns] = useState<DiscoverRun[]>([])
  const [prompt, setPrompt] = useState('')
  const [count, setCount] = useState(5)
  const [model, setModel] = useState('claude-haiku-4-5-20251001')
  const [liveLog, setLiveLog] = useState<string>('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const logIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const logEndRef = useRef<HTMLPreElement | null>(null)
  const navigate = useNavigate()

  const isRunning = runs.some(r => r.status === 'running')
  const runningRun = runs.find(r => r.status === 'running')
  const displayLog = runningRun ? liveLog : ''

  useEffect(() => {
    fetchQueue().then(setRuns)
  }, [])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    const delay = isRunning ? 5000 : 30000
    intervalRef.current = setInterval(async () => {
      const fresh = await fetchQueue()
      setRuns(fresh)
    }, delay)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning])

  useEffect(() => {
    if (logIntervalRef.current) clearInterval(logIntervalRef.current)
    if (!runningRun) return
    const poll = () => fetchRunLog(runningRun.id).then(setLiveLog).catch(() => {})
    poll()
    logIntervalRef.current = setInterval(poll, 2000)
    return () => { if (logIntervalRef.current) clearInterval(logIntervalRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runningRun?.id])

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [liveLog])

  async function handleEnqueue() {
    const run = await enqueueRun(prompt.trim() || undefined, count, model)
    setRuns(r => [run, ...r])
    setPrompt('')
  }

  async function handleRun(id: string) {
    await triggerRun(id)
    const fresh = await fetchQueue()
    setRuns(fresh)
  }

  async function handleDelete(id: string) {
    await deleteRun(id)
    setRuns(r => r.filter(x => x.id !== id))
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      fontSize: 13,
    }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Discover Queue</div>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Optional prompt (e.g. AI infra, SF only)"
          rows={2}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            resize: 'vertical',
            fontSize: 12,
            border: '1px solid #d1d5db',
            borderRadius: 6,
            padding: '6px 8px',
            marginBottom: 6,
          }}
        />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
          <label style={{ color: '#6b7280' }}>Find</label>
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={e => setCount(Number(e.target.value))}
            style={{ width: 48, border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 6px', fontSize: 12 }}
          />
          <label style={{ color: '#6b7280' }}>companies</label>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
          <label style={{ color: '#6b7280' }}>Model</label>
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            style={{ flex: 1, border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 6px', fontSize: 12, background: '#fff' }}
          >
            <option value="claude-haiku-4-5-20251001">Haiku</option>
            <option value="claude-sonnet-4-6">Sonnet</option>
            <option value="claude-opus-4-8">Opus</option>
          </select>
        </div>
        <button
          onClick={handleEnqueue}
          style={{
            width: '100%',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '7px 0',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          + Add to queue
        </button>
      </div>

      <div style={{ height: '14rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {runs.length === 0 && (
          <div style={{ padding: '1rem', color: '#9ca3af' }}>Queue empty</div>
        )}
        {[...runs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10).map(run => (
          <div key={run.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ color: STATUS_COLOR[run.status], fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>
                  {run.status === 'running' ? '⟳ running' : run.status}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {run.status === 'pending' && (
                    <button
                      disabled={isRunning}
                      onClick={e => { e.stopPropagation(); handleRun(run.id) }}
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 4,
                        border: '1px solid #2563eb',
                        background: isRunning ? '#e5e7eb' : '#eff6ff',
                        color: isRunning ? '#9ca3af' : '#2563eb',
                        cursor: isRunning ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Run now
                    </button>
                  )}
                  {run.status === 'pending' && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(run.id) }}
                      style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#6b7280' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <div style={{ color: '#374151', fontSize: 12 }}>
                {run.prompt ? run.prompt : <span style={{ color: '#9ca3af' }}>no prompt</span>}
              </div>
              <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>
                find {run.count} · {(['haiku', 'sonnet', 'opus'] as const).find(k => run.model?.includes(k)) ?? run.model} · {new Date(run.created_at).toLocaleTimeString()}
              </div>
              {run.discovered_companies && run.discovered_companies.length > 0 && (
                <button
                  onClick={e => {
                    e.stopPropagation()
                    navigate(`/triage?companies=${run.discovered_companies!.map(encodeURIComponent).join(',')}`)
                  }}
                  style={{
                    marginTop: 6,
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    background: '#f0fdf4',
                    color: '#16a34a',
                    border: '1px solid #bbf7d0',
                    borderRadius: 5,
                    padding: '4px 8px',
                    fontSize: 11,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  View {run.discovered_companies.length} {run.discovered_companies.length === 1 ? 'company' : 'companies'} →
                </button>
              )}
              {run.output_summary && (!run.discovered_companies || run.discovered_companies.length === 0) && (
                <div style={{ marginTop: 4, color: '#9ca3af', fontSize: 11 }}>{run.output_summary}</div>
              )}
            </div>

            {run.status === 'running' && displayLog && (
              <pre style={{
                margin: 0,
                padding: '8px 12px',
                background: '#1f2937',
                color: '#d1fae5',
                fontSize: 10,
                overflowX: 'auto',
                maxHeight: 200,
                overflowY: 'auto',
                borderTop: '1px solid #374151',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}>
                {displayLog}
                <span ref={logEndRef} />
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
