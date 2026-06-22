import { Router } from 'express'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

let distilling = false

type DistillRun = {
  startedAt: string
  finishedAt: string | null
  exitCode: number | null
  error: string | null
  logFile: string
}
let lastRun: DistillRun | null = null

type PreferenceItem = { short: string; text: string; confidence: number }
type Preferences = { likes: PreferenceItem[]; dislikes: PreferenceItem[]; generatedAt: string | null }

function parse(md: string): Preferences {
  const likes: PreferenceItem[] = []
  const dislikes: PreferenceItem[] = []

  const generatedMatch = md.match(/_Generated ([^_]+)_/)
  const generatedAt = generatedMatch ? generatedMatch[1] : null

  let section: 'likes' | 'dislikes' | null = null
  for (const line of md.split('\n')) {
    if (/^## Likes/.test(line)) { section = 'likes'; continue }
    if (/^## Dislikes/.test(line)) { section = 'dislikes'; continue }
    if (!section) continue

    // New format: - **short label**: full text (confidence: x)
    const newFmt = line.match(/^- \*\*(.+?)\*\*: (.+?) \(confidence: ([\d.]+)\)$/)
    if (newFmt) {
      const item = { short: newFmt[1], text: newFmt[2], confidence: parseFloat(newFmt[3]) }
      if (section === 'likes') likes.push(item)
      else dislikes.push(item)
      continue
    }

    // Old format: - full text (confidence: x)
    const oldFmt = line.match(/^- (.+?) \(confidence: ([\d.]+)\)$/)
    if (oldFmt) {
      const item = { short: oldFmt[1], text: oldFmt[1], confidence: parseFloat(oldFmt[2]) }
      if (section === 'likes') likes.push(item)
      else dislikes.push(item)
    }
  }

  return { likes, dislikes, generatedAt }
}

export function preferencesRouter(dataDir: string) {
  const router = Router()
  const prefsPath = path.join(dataDir, '..', 'preferences.md')
  const logsDir = path.join(dataDir, '..', '..', 'logs')

  router.get('/', (_req, res) => {
    if (!fs.existsSync(prefsPath)) {
      return res.status(404).json({ error: 'preferences.md not found' })
    }
    const md = fs.readFileSync(prefsPath, 'utf8')
    res.json({ ...parse(md), distilling, lastRun })
  })

  router.post('/distill', (_req, res) => {
    if (distilling) return res.status(409).json({ error: 'already running' })
    distilling = true

    fs.mkdirSync(logsDir, { recursive: true })
    const startedAt = new Date().toISOString()
    const logFile = path.join(logsDir, `distill-${startedAt.replace(/[:.]/g, '-')}.log`)
    lastRun = { startedAt, finishedAt: null, exitCode: null, error: null, logFile }

    const out = fs.openSync(logFile, 'a')
    res.status(202).json({ distilling: true, logFile })

    const proc = spawn('claude', [
      '-p', '/distill-preferences',
      '--model', 'claude-sonnet-4-6',
      '--allowedTools', 'Bash,Read,Write',
      '--max-turns', '20',
      '--strict-mcp-config',
    ], { cwd: process.cwd(), stdio: ['ignore', out, out] })

    proc.on('close', (code) => {
      distilling = false
      try { fs.closeSync(out) } catch { /* already closed */ }
      if (lastRun) {
        lastRun.finishedAt = new Date().toISOString()
        lastRun.exitCode = code
      }
    })
    proc.on('error', (err) => {
      distilling = false
      try { fs.closeSync(out) } catch { /* already closed */ }
      if (lastRun) {
        lastRun.finishedAt = new Date().toISOString()
        lastRun.error = err.message
      }
    })
  })

  return router
}
