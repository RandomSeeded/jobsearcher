import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

type Company = Record<string, unknown> & { company: string }

function makeStore(dataDir: string) {
  // Load a YAML file, tolerating malformed agent output: a doc missing the
  // `company` field (e.g. an agent that wrote `name:` instead) falls back to
  // `name` and then the filename slug, so one bad file never crashes a lookup
  // or disappears from the list.
  function loadDoc(file: string): Company {
    const doc = (yaml.load(fs.readFileSync(path.join(dataDir, file), 'utf8')) ?? {}) as Record<string, unknown>
    if (typeof doc.company !== 'string' || doc.company.trim() === '') {
      doc.company = typeof doc.name === 'string' && doc.name.trim() !== ''
        ? doc.name
        : file.replace(/\.yaml$/, '')
    }
    return doc as Company
  }

  function files(): string[] {
    return fs.readdirSync(dataDir).filter(f => f.endsWith('.yaml'))
  }

  function fileFor(name: string): string | undefined {
    return files().find(f => loadDoc(f).company.toLowerCase() === name.toLowerCase())
  }

  return {
    list(): Company[] {
      return files().map(loadDoc)
    },

    patch(name: string, delta: Partial<Company>): Company | null {
      const file = fileFor(name)
      if (!file) return null
      const company = loadDoc(file)
      Object.assign(company, delta)
      fs.writeFileSync(path.join(dataDir, file), yaml.dump(company), 'utf8')
      return company
    },
  }
}

export function companiesRouter(dataDir: string) {
  const store = makeStore(dataDir)
  const router = Router()

  router.get('/', (_req, res) => {
    res.json(store.list())
  })

  router.patch('/:name', (req, res) => {
    const company = store.patch(req.params.name, req.body)
    if (!company) {
      res.status(404).json({ error: 'not found' })
      return
    }
    res.json(company)
  })

  return router
}
