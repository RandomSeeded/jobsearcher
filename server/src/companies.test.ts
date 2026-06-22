import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { buildApp } from './index.js'

const CONTENDERS = path.resolve('..', 'data', 'opportunities')

let tmpDir: string

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jobhunt-test-'))
  for (const f of fs.readdirSync(CONTENDERS)) {
    fs.copyFileSync(path.join(CONTENDERS, f), path.join(tmpDir, f))
  }
})

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('GET /api/companies', () => {
  it('returns all companies parsed from YAML', async () => {
    const app = buildApp(tmpDir)
    const res = await request(app).get('/api/companies')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    expect(res.body[0]).toHaveProperty('company')
  })
})

describe('PATCH /api/companies/:name', () => {
  it('updates vote and returns updated company', async () => {
    const app = buildApp(tmpDir)
    const res = await request(app).patch('/api/companies/ambrook').send({ vote: 'love' })
    expect(res.status).toBe(200)
    expect(res.body.vote).toBe('love')
    expect(res.body.company).toBe('Ambrook')
  })

  it('returns 404 for unknown company', async () => {
    const app = buildApp(tmpDir)
    const res = await request(app).patch('/api/companies/doesnotexist').send({ vote: 'love' })
    expect(res.status).toBe(404)
  })
})

describe('malformed agent YAML (missing company field)', () => {
  beforeAll(() => {
    // An agent that wrote `name:` instead of the canonical `company:` field.
    fs.writeFileSync(
      path.join(tmpDir, 'rogue-co.yaml'),
      'name: Rogue Co\nurl: https://rogue.example\nsummary: did not follow the schema\n',
    )
  })

  it('still lists the company, deriving the name from `name`', async () => {
    const app = buildApp(tmpDir)
    const res = await request(app).get('/api/companies')
    expect(res.status).toBe(200)
    expect(res.body.every((c: { company: unknown }) => typeof c.company === 'string')).toBe(true)
    expect(res.body.some((c: { company: string }) => c.company === 'Rogue Co')).toBe(true)
  })

  it('does not break voting on other companies', async () => {
    const app = buildApp(tmpDir)
    const res = await request(app).patch('/api/companies/ambrook').send({ vote: 'like' })
    expect(res.status).toBe(200)
    expect(res.body.company).toBe('Ambrook')
  })
})
