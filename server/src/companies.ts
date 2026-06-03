import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

type Company = Record<string, unknown> & { company: string }

function loadCompanies(dataDir: string): Company[] {
  return fs
    .readdirSync(dataDir)
    .filter(f => f.endsWith('.yaml'))
    .map(f => yaml.load(fs.readFileSync(path.join(dataDir, f), 'utf8')) as Company)
}

function saveCompany(dataDir: string, company: Company): void {
  const file = path.join(dataDir, `${company.company.toLowerCase()}.yaml`)
  fs.writeFileSync(file, yaml.dump(company), 'utf8')
}

export function companiesRouter(dataDir: string) {
  const router = Router()

  router.get('/', (_req, res) => {
    res.json(loadCompanies(dataDir))
  })

  router.patch('/:name', (req, res) => {
    const companies = loadCompanies(dataDir)
    const company = companies.find(
      c => c.company.toLowerCase() === req.params.name.toLowerCase()
    )
    if (!company) {
      res.status(404).json({ error: 'not found' })
      return
    }
    Object.assign(company, req.body)
    saveCompany(dataDir, company)
    res.json(company)
  })

  return router
}
