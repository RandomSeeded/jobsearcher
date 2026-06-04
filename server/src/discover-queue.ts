import { Router } from 'express'
import { spawn } from 'child_process'
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'

export interface DiscoverRun {
  id: string
  prompt?: string
  count: number
  status: 'pending' | 'running' | 'done' | 'failed'
  created_at: string
  run_at: string | null
  output?: string
  output_summary?: string
}

function queuePath(dataDir: string) {
  return join(dataDir, '..', 'discover-queue.json')
}

function loadQueue(dataDir: string): DiscoverRun[] {
  const p = queuePath(dataDir)
  if (!existsSync(p)) return []
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return []
  }
}

function saveQueue(dataDir: string, queue: DiscoverRun[]) {
  writeFileSync(queuePath(dataDir), JSON.stringify(queue, null, 2))
}

function countYamlFiles(dataDir: string): number {
  if (!existsSync(dataDir)) return 0
  return readdirSync(dataDir).filter(f => f.endsWith('.yaml')).length
}

function buildPromptArg(run: DiscoverRun): string {
  const parts: string[] = []
  if (run.prompt) parts.push(run.prompt)
  parts.push(`find ${run.count} companies`)
  return parts.join(' — ')
}

let activeRunId: string | null = null

function executeRun(run: DiscoverRun, dataDir: string) {
  if (activeRunId) return
  activeRunId = run.id

  const queue = loadQueue(dataDir)
  const entry = queue.find(r => r.id === run.id)
  if (!entry) { activeRunId = null; return }

  entry.status = 'running'
  entry.run_at = new Date().toISOString()
  saveQueue(dataDir, queue)

  const beforeCount = countYamlFiles(dataDir)
  const promptArg = buildPromptArg(run)

  const proc = spawn('claude', [
    '-p', `/discover-jobs ${promptArg}`,
    '--model', 'claude-sonnet-4-6',
    '--allowedTools', 'Bash,Read,Write,WebSearch,WebFetch,Agent',
  ], { cwd: process.cwd() })

  let output = ''
  proc.stdout.on('data', (d: Buffer) => { output += d.toString() })
  proc.stderr.on('data', (d: Buffer) => { output += d.toString() })

  proc.on('close', (code: number | null) => {
    const q = loadQueue(dataDir)
    const e = q.find(r => r.id === run.id)
    if (e) {
      e.status = code === 0 ? 'done' : 'failed'
      e.output = output
      const afterCount = countYamlFiles(dataDir)
      const newCount = afterCount - beforeCount
      if (newCount > 0) {
        const newFiles = readdirSync(dataDir)
          .filter(f => f.endsWith('.yaml'))
          .slice(-newCount)
          .map(f => f.replace('.yaml', ''))
        e.output_summary = `${newCount} new ${newCount === 1 ? 'company' : 'companies'}: ${newFiles.join(', ')}`
      } else {
        e.output_summary = 'No new companies added'
      }
      saveQueue(dataDir, q)
    }
    activeRunId = null
    // drain next pending
    const pending = loadQueue(dataDir).find(r => r.status === 'pending')
    if (pending) executeRun(pending, dataDir)
  })
}

export function discoverQueueRouter(dataDir: string) {
  const router = Router()

  router.get('/', (_req, res) => {
    res.json(loadQueue(dataDir))
  })

  router.post('/', (req, res) => {
    const { prompt, count = 5 } = req.body as { prompt?: string; count?: number }
    const run: DiscoverRun = {
      id: randomUUID(),
      prompt: prompt || undefined,
      count: Math.min(Math.max(1, count), 20),
      status: 'pending',
      created_at: new Date().toISOString(),
      run_at: null,
    }
    const queue = loadQueue(dataDir)
    queue.push(run)
    saveQueue(dataDir, queue)
    res.status(201).json(run)
  })

  router.post('/:id/run', (req, res) => {
    const queue = loadQueue(dataDir)
    const run = queue.find(r => r.id === req.params.id)
    if (!run) return res.status(404).json({ error: 'not found' })
    if (run.status !== 'pending') return res.status(409).json({ error: 'not pending' })
    if (activeRunId) return res.status(409).json({ error: 'another run is active' })
    executeRun(run, dataDir)
    res.json(run)
  })

  router.delete('/:id', (req, res) => {
    const queue = loadQueue(dataDir)
    const idx = queue.findIndex(r => r.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'not found' })
    if (queue[idx].status === 'running') return res.status(409).json({ error: 'cannot delete running job' })
    queue.splice(idx, 1)
    saveQueue(dataDir, queue)
    res.status(204).end()
  })

  return router
}
