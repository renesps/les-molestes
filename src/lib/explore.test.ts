import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { clubStats, filtersFromParams, playerStats, scopeMatches, type Fact } from './explore'
import type { MatchSummary, Player, Stats } from './types'

const read = <T>(f: string): T => JSON.parse(readFileSync(`public/data/${f}`, 'utf8'))
const matches = read<MatchSummary[]>('matches.json')
const facts = new Map(read<Fact[]>('facts.json').map((f) => [f.id, f]))
const stats = read<Stats>('stats.json')
const players = read<Player[]>('players.json')

describe('estadísticas del club (sin filtros) = las del build', () => {
  const c = clubStats(matches, facts)
  it('récord', () => expect(c.record).toEqual(stats.overall))
  it('794 goles detallados, 14 sin autor, 3 en contra, 105 con video', () => {
    expect(c.goalsDetailed).toBe(794)
    expect(c.goalsWithoutAuthor).toBe(14)
    expect(c.ownGoals).toBe(3)
    expect(c.videoGoals).toBe(105)
  })
  it('goleadores', () => {
    expect(c.scorers.map((r) => [r.id, r.value])).toEqual(
      expect.arrayContaining(stats.rankings.scorers.map((r) => [r.playerId, r.value])),
    )
    expect(c.scorers.length).toBe(stats.rankings.scorers.length)
  })
  it('presencias = partidos de cada jugador', () => {
    const apps = new Map(c.appearances.map((r) => [r.id, r.value]))
    for (const p of players) expect(apps.get(p.id) ?? 0).toBe(p.matches)
  })
  it('rachas', () => {
    expect(c.winStreak.length).toBe(12)
    expect(c.unbeatenStreak.length).toBe(14)
  })
  it('el desglose por año suma todos los partidos', () => {
    expect(c.byYear.reduce((s, b) => s + b.record.played, 0)).toBe(243)
  })
})

describe('jugador', () => {
  it('Manuel Echegaray: 268 goles, 209 partidos, 43 asistencias', () => {
    const s = playerStats(8, matches, facts)
    expect(s.goals.length).toBe(268)
    expect(s.matches.length).toBe(209)
    expect(s.assistsGiven.length).toBe(43)
    expect(s.byYear.reduce((n, b) => n + b.goals, 0)).toBe(268)
  })
  it('coincide con players.json para todos', () => {
    for (const p of players) {
      const s = playerStats(p.id, matches, facts)
      expect([s.matches.length, s.goals.length, s.assistsGiven.length, s.yellow.length, s.red.length]).toEqual([
        p.matches, p.goals, p.assists, p.yellowCards, p.redCards,
      ])
    }
  })
})

describe('filtros', () => {
  it('por circuito coincide con el build', () => {
    for (const [cid, rec] of Object.entries(stats.byCircuit)) {
      expect(clubStats(scopeMatches(matches, facts, { circuit: Number(cid) }), facts).record).toEqual(rec)
    }
  })
  it('se combinan (circuito + año)', () => {
    const ms = scopeMatches(matches, facts, { circuit: 1, year: 2018 })
    expect(ms.every((m) => m.circuitId === 1 && m.year === 2018)).toBe(true)
    expect(ms.length).toBeGreaterThan(0)
  })
  it('lee la dirección', () => {
    expect(filtersFromParams(new URLSearchParams('j=8&t=9&y=2018&x=1'))).toEqual({ player: 8, tournament: 9, year: 2018 })
  })
})
