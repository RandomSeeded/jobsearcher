import express from 'express'
import { companiesRouter } from './companies.js'

export function buildApp(dataDir: string) {
  const app = express()
  app.use(express.json())
  app.use('/api/companies', companiesRouter(dataDir))
  return app
}

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT ?? 3001
  const DATA_DIR = process.env.DATA_DIR ?? '../data/contenders'
  buildApp(DATA_DIR).listen(PORT, () => {
    console.log(`server listening on :${PORT}`)
  })
}
