import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { computeRecord, withRanks } from './stats'
import type { MatchSummary, Stats, Team } from './types'

const read = <T>(f: string): T => JSON.parse(readFileSync(`public/data/${f}`, 'utf8'))
const matches = read<MatchSummary[]>('matches.json')
const stats = read<Stats>('stats.json')

describe('computeRecord', () => {
  it('el récord calculado en la app coincide con el del build', () => {
    expect(computeRecord(matches)).toEqual(stats.overall)
  })

  it('récord histórico: 243 PJ = 148 G + 31 E + 64 P', () => {
    const r = computeRecord(matches)
    expect(r).toMatchObject({ played: 243, won: 148, drawn: 31, lost: 64, unknown: 0 })
  })

  it('cuenta "sin dato" y no suma goles nulos', () => {
    const r = computeRecord([
      { outcome: 'V', goalsFor: 3, goalsAgainst: 1 },
      { outcome: null, goalsFor: null, goalsAgainst: null },
      { outcome: 'D', goalsFor: 1, goalsAgainst: null },
    ])
    expect(r).toEqual({ played: 3, won: 1, drawn: 0, lost: 1, unknown: 1, goalsFor: 4, goalsAgainst: 1 })
  })

  it('por circuito coincide con el build', () => {
    for (const [cid, rec] of Object.entries(stats.byCircuit)) {
      expect(computeRecord(matches.filter((m) => m.circuitId === Number(cid)))).toEqual(rec)
    }
  })

  it('el historial de cada rival coincide con sus partidos', () => {
    const teams = read<Team[]>('teams.json')
    const byId = new Map(matches.map((m) => [m.id, m]))
    for (const t of teams) {
      expect(computeRecord(t.matchIds.map((id) => byId.get(id)!))).toEqual(t.record)
    }
  })
})

describe('rankings', () => {
  it('goleadores ordenados de mayor a menor y sin "En Contra"', () => {
    const s = stats.rankings.scorers
    expect(s.every((r, i) => i === 0 || s[i - 1].value >= r.value)).toBe(true)
    expect(s.some((r) => r.playerId === 32)).toBe(false)
  })

  it('withRanks comparte el puesto en empates', () => {
    const ranked = withRanks([10, 8, 8, 5], (x) => x).map((r) => r.rank)
    expect(ranked).toEqual([1, 2, 2, 4])
  })
})
