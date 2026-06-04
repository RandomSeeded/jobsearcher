import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { buildApp } from './index.js'

const CONTENDERS = path.resolve('..', 'data', 'contenders')

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
