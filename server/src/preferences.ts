import { Router } from 'express'
import fs from 'fs'
import path from 'path'

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

  router.get('/', (_req, res) => {
    if (!fs.existsSync(prefsPath)) {
      return res.status(404).json({ error: 'preferences.md not found' })
    }
    const md = fs.readFileSync(prefsPath, 'utf8')
    res.json(parse(md))
  })

  return router
}
