import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

type Company = Record<string, unknown> & { company: string }

function makeStore(dataDir: string) {
  function fileFor(name: string): string | undefined {
    return fs.readdirSync(dataDir)
      .filter(f => f.endsWith('.yaml'))
      .find(f => {
        const doc = yaml.load(fs.readFileSync(path.join(dataDir, f), 'utf8')) as Company
        return doc.company.toLowerCase() === name.toLowerCase()
      })
  }

  return {
    list(): Company[] {
      return fs.readdirSync(dataDir)
        .filter(f => f.endsWith('.yaml'))
        .map(f => yaml.load(fs.readFileSync(path.join(dataDir, f), 'utf8')) as Company)
    },

    patch(name: string, delta: Partial<Company>): Company | null {
      const file = fileFor(name)
      if (!file) return null
      const company = yaml.load(fs.readFileSync(path.join(dataDir, file), 'utf8')) as Company
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
