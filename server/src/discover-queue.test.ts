import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { _readManifest } from './discover-queue.js'

// readManifest takes the opportunities dir; manifest lives at ../discover-manifest.json
let root: string
let oppDir: string

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'jobhunt-manifest-'))
  oppDir = path.join(root, 'opportunities')
  fs.mkdirSync(oppDir)
})

afterEach(() => fs.rmSync(root, { recursive: true, force: true }))

function writeManifest(promoted: string[]) {
  fs.writeFileSync(path.join(root, 'discover-manifest.json'), JSON.stringify({ promoted }))
}
function writeOpp(slug: string, body: string) {
  fs.writeFileSync(path.join(oppDir, `${slug}.yaml`), body)
}

describe('readManifest counts only companies that actually landed', () => {
  it('drops a slug claimed-promoted but whose file never landed (found==surfaced)', () => {
    // Reproduces the real bug: manifest says 3, but clickhouse.yaml was never moved.
    writeManifest(['clickhouse', 'glean', 'wonderful'])
    writeOpp('glean', 'company: Glean\n')
    writeOpp('wonderful', 'company: Wonderful\n')
    // clickhouse.yaml intentionally absent

    const { slugs, names } = _readManifest(oppDir)
    expect(slugs).toEqual(['glean', 'wonderful'])
    expect(names).toEqual(['Glean', 'Wonderful'])
  })

  it('resolves display name from company, then name, then slug', () => {
    writeManifest(['a', 'b', 'c'])
    writeOpp('a', 'company: Proper Co\n')
    writeOpp('b', 'name: Aliased Co\n')   // rogue schema, file present
    writeOpp('c', 'stage: Seed\n')         // no name at all, file present

    const { slugs, names } = _readManifest(oppDir)
    expect(slugs).toEqual(['a', 'b', 'c'])
    expect(names).toEqual(['Proper Co', 'Aliased Co', 'c'])
  })

  it('returns empty when no manifest exists', () => {
    expect(_readManifest(oppDir)).toEqual({ slugs: [], names: [] })
  })
})
