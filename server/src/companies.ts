import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

type Company = Record<string, unknown> & { company: string }
type CompanyWithFile = Company & { _file: string }

function loadCompanies(dataDir: string): CompanyWithFile[] {
  return fs
    .readdirSync(dataDir)
    .filter(f => f.endsWith('.yaml'))
    .map(f => {
      const company = yaml.load(fs.readFileSync(path.join(dataDir, f), 'utf8')) as Company
      return { ...company, _file: f }
    })
}

function saveCompany(dataDir: string, company: CompanyWithFile): void {
  const { _file, ...rest } = company
  fs.writeFileSync(path.join(dataDir, _file), yaml.dump(rest), 'utf8')
}

export function companiesRouter(dataDir: string) {
  const router = Router()

  router.get('/', (_req, res) => {
    res.json(loadCompanies(dataDir).map(({ _file: _f, ...c }) => c))
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
    const { _file: _f, ...rest } = company
    res.json(rest)
  })

  return router
}
