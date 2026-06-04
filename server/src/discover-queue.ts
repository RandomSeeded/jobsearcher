import { Router } from 'express'
import { spawn } from 'child_process'
import { readFileSync, writeFileSync, existsSync, createWriteStream, mkdirSync, readdirSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import yaml from 'js-yaml'

export interface DiscoverRun {
  id: string
  prompt?: string
  count: number
  model: string
  status: 'pending' | 'running' | 'done' | 'failed'
  created_at: string
  run_at: string | null
  log_path?: string
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
  return [run.prompt, `count=${run.count}`].filter(Boolean).join(' ')
}

let activeRunId: string | null = null

function executeRun(run: DiscoverRun, dataDir: string) {
  const model = run.model ?? 'claude-haiku-4-5-20251001'
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

  const maxTurns = run.count * 40  // ~40 turns per agent (8 searches + overhead)
  const proc = spawn('claude', [
    '-p', `/discover-jobs ${promptArg}`,
    '--model', model,
    '--allowedTools', 'Bash,Read,Write,WebSearch,WebFetch,Agent',
    '--max-turns', String(maxTurns),
    '--verbose',
    '--output-format', 'json',
    '--strict-mcp-config',  // no MCP servers — reduces system prompt size ~30-40%
  ], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, CLAUDE_CODE_SUBAGENT_MODEL: model },
  })

  const TIMEOUT_MS = 30 * 60 * 1000 // 30 min
  const timeout = setTimeout(() => {
    log.write(`\n[${new Date().toISOString()}] timed out after 30 minutes — killing process\n`)
    proc.kill('SIGTERM')
  }, TIMEOUT_MS)

  let output = ''
  proc.stdout.on('data', (d: Buffer) => { output += d.toString(); log.write(d) })
  proc.stderr.on('data', (d: Buffer) => { log.write(d) })  // log stderr but don't mix into output (JSON parse)

  proc.on('close', (code: number | null) => {
    clearTimeout(timeout)
    log.write(`\n[${new Date().toISOString()}] exited with code ${code}\n`)

    // Parse modelUsage from JSON output and log it
    try {
      const events = JSON.parse(output) as Array<Record<string, unknown>>
      const result = events.find(e => e.type === 'result' && e.modelUsage)
      if (result?.modelUsage) {
        const usage = result.modelUsage as Record<string, { inputTokens: number; outputTokens: number; cacheReadInputTokens?: number; costUSD?: number }>
        log.write('\n[model usage]\n')
        for (const [m, u] of Object.entries(usage)) {
          log.write(`  ${m}: ${u.inputTokens} in / ${u.outputTokens} out / cache-read ${u.cacheReadInputTokens ?? 0} / $${(u.costUSD ?? 0).toFixed(4)}\n`)
        }
      }
    } catch { /* output may not be valid JSON if process crashed early */ }

    log.end()
    const q = loadQueue(dataDir)
    const e = q.find(r => r.id === run.id)
    if (e) {
      e.status = code === 0 ? 'done' : 'failed'
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
  })
}

export function discoverQueueRouter(dataDir: string) {
  const router = Router()

  router.get('/', (_req, res) => {
    res.json(loadQueue(dataDir))
  })

  router.post('/', (req, res) => {
    const { prompt, count = 5, model = 'claude-haiku-4-5-20251001' } = req.body as { prompt?: string; count?: number; model?: string }
    const run: DiscoverRun = {
      id: randomUUID(),
      prompt: prompt || undefined,
      count: Math.min(Math.max(1, count), 20),
      model,
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

  router.get('/:id/log', (req, res) => {
    const queue = loadQueue(dataDir)
    const run = queue.find(r => r.id === req.params.id)
    if (!run || !run.log_path) return res.status(404).json({ error: 'no log' })

    const parts: string[] = []

    // Outer orchestrator log
    try { parts.push(readFileSync(run.log_path, 'utf8')) } catch { /* no outer log yet */ }

    // Per-agent run.log files from data/run/{run_id}/*/run.log
    const runDir = join(dataDir, '..', 'run', run.id)
    try {
      for (const agent of readdirSync(runDir)) {
        const agentLog = join(runDir, agent, 'run.log')
        try { parts.push(readFileSync(agentLog, 'utf8')) } catch { /* agent not started yet */ }
      }
    } catch { /* run dir doesn't exist yet */ }

    if (parts.length === 0) return res.status(404).json({ error: 'no log data yet' })
    res.type('text/plain').send(parts.join('\n'))
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
