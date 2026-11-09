import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Base } from './data'
import { featured, scoreText, search } from './search'
import type { Circuit, Lookups, MatchSummary, Player, Team, Tournament } from './types'

const read = <T>(f: string): T => JSON.parse(readFileSync(`public/data/${f}`, 'utf8'))
const lk = read<Lookups>('lookups.json')
const tours = read<{ circuits: Circuit[]; tournaments: Tournament[] }>('tournaments.json')
const base: Base = {
  teams: new Map(read<Team[]>('teams.json').map((t) => [t.id, t])),
  players: new Map(read<Player[]>('players.json').map((p) => [p.id, p])),
  tournaments: new Map(tours.tournaments.map((t) => [t.id, t])),
  circuits: new Map(tours.circuits.map((c) => [c.id, c])),
  courts: new Map(lk.courts.map((c) => [c.id, c])),
  shirts: new Map(lk.shirts.map((s) => [s.id, s])),
}
const matches = read<MatchSummary[]>('matches.json')

describe('búsqueda', () => {
  it('sin tildes ni mayúsculas', () => {
    expect(scoreText('Máximo Duranti', 'maximo')).toBe(2)
    expect(scoreText('Quilmes', 'QUILMES')).toBe(3)
    expect(scoreText('Quilmes', 'xyz')).toBe(0)
  })
  it('un rival exacto queda destacado', () => {
    const top = featured(search('Quilmes', base, matches))
    expect(top).toMatchObject({ kind: 'rival', name: 'Quilmes' })
  })
  it('un año', () => {
    expect(featured(search('2018', base, matches))).toMatchObject({ kind: 'year', id: 2018 })
  })
  it('un torneo por nombre o código', () => {
    expect(search('Rock and Gol 2021', base, matches).some((h) => h.kind === 'tournament')).toBe(true)
    expect(featured(search('RnG-2018-03', base, matches))).toMatchObject({ kind: 'tournament', id: 9 })
  })
  it('apellido compartido: muestra a los dos sin elegir', () => {
    const hits = search('Echegaray', base, matches).filter((h) => h.kind === 'player')
    expect(hits.length).toBe(2)
    expect(featured(search('Echegaray', base, matches))).toBeUndefined()
  })
  it('nombre completo de jugador queda destacado', () => {
    expect(featured(search('Manuel Echegaray', base, matches))).toMatchObject({ kind: 'player', id: 8 })
  })
  it('"En Contra" no aparece como jugador', () => {
    expect(search('En Contra', base, matches).some((h) => h.kind === 'player')).toBe(false)
  })
})
