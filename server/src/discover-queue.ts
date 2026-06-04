import { Router } from 'express'
import { spawn } from 'child_process'
import { readFileSync, writeFileSync, existsSync, createWriteStream, mkdirSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import yaml from 'js-yaml'

export interface DiscoverRun {
  id: string
  prompt?: string
  count: number
  status: 'pending' | 'running' | 'done' | 'failed'
  created_at: string
  run_at: string | null
  log_path?: string
  output?: string
  output_summary?: string
  discovered_companies?: string[]
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

function manifestPath(dataDir: string) {
  return join(dataDir, '..', 'discover-manifest.json')
}

function readManifest(dataDir: string): { slugs: string[]; names: string[] } {
  const p = manifestPath(dataDir)
  if (!existsSync(p)) return { slugs: [], names: [] }
  try {
    const { promoted } = JSON.parse(readFileSync(p, 'utf8')) as { promoted?: string[] }
    const slugs = promoted ?? []
    const names = slugs.map(slug => {
      try {
        const doc = yaml.load(readFileSync(join(dataDir, `${slug}.yaml`), 'utf8')) as { company?: string }
        return doc?.company ?? slug
      } catch {
        return slug
      }
    })
    return { slugs, names }
  } catch {
    return { slugs: [], names: [] }
  }
}

function logPath(dataDir: string, id: string) {
  const logsDir = join(dataDir, '..', '..', 'logs')
  mkdirSync(logsDir, { recursive: true })
  return join(logsDir, `discover-queue-${id}.log`)
}

function buildPromptArg(run: DiscoverRun): string {
  const parts: string[] = []
  if (run.prompt) parts.push(run.prompt)
  parts.push(`find ${run.count} companies`)
  return parts.join(' — ')
}

let activeRunId: string | null = null

function executeRun(run: DiscoverRun, dataDir: string, model = 'claude-haiku-4-5-20251001') {
  if (activeRunId) return
  activeRunId = run.id

  const queue = loadQueue(dataDir)
  const entry = queue.find(r => r.id === run.id)
  if (!entry) { activeRunId = null; return }

  entry.status = 'running'
  entry.run_at = new Date().toISOString()
  entry.log_path = logPath(dataDir, run.id)
  saveQueue(dataDir, queue)

  const promptArg = buildPromptArg(run)
  const log = createWriteStream(logPath(dataDir, run.id), { flags: 'a' })
  log.write(`[${new Date().toISOString()}] starting run ${run.id}\nprompt: ${promptArg}\nmodel: ${model}\n\n`)

  const proc = spawn('claude', [
    '-p', `/discover-jobs ${promptArg}`,
    '--model', model,
    '--allowedTools', 'Bash,Read,Write,WebSearch,WebFetch,Agent',
    '--verbose',
  ], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] })

  const TIMEOUT_MS = 30 * 60 * 1000 // 30 min
  const timeout = setTimeout(() => {
    log.write(`\n[${new Date().toISOString()}] timed out after 30 minutes — killing process\n`)
    proc.kill('SIGTERM')
  }, TIMEOUT_MS)

  let output = ''
  proc.stdout.on('data', (d: Buffer) => { output += d.toString(); log.write(d) })
  proc.stderr.on('data', (d: Buffer) => { output += d.toString(); log.write(d) })

  proc.on('close', (code: number | null) => {
    clearTimeout(timeout)
    log.write(`\n[${new Date().toISOString()}] exited with code ${code}\n`)
    log.end()
    const q = loadQueue(dataDir)
    const e = q.find(r => r.id === run.id)
    if (e) {
      e.status = code === 0 ? 'done' : 'failed'
      e.output = output
      const { slugs, names } = readManifest(dataDir)
      if (slugs.length > 0) {
        e.discovered_companies = names
        e.output_summary = `${slugs.length} new ${slugs.length === 1 ? 'company' : 'companies'}: ${slugs.join(', ')}`
      } else {
        e.discovered_companies = []
        e.output_summary = 'No new companies added'
      }
      saveQueue(dataDir, q)
    }
    activeRunId = null
    // drain next pending
    const pending = loadQueue(dataDir).find(r => r.status === 'pending')
    if (pending) executeRun(pending, dataDir, model)
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
    const scheduled = req.query.source === 'scheduled'
    const model = scheduled ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001'
    executeRun(run, dataDir, model)
    res.json(run)
  })

  router.get('/:id/log', (req, res) => {
    const queue = loadQueue(dataDir)
    const run = queue.find(r => r.id === req.params.id)
    if (!run || !run.log_path) return res.status(404).json({ error: 'no log' })
    try {
      res.type('text/plain').send(readFileSync(run.log_path, 'utf8'))
    } catch {
      res.status(404).json({ error: 'log file not found' })
    }
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
