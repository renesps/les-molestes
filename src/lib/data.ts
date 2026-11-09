import { useEffect, useState } from 'react'
import type { Fact } from './explore'
import type { Circuit, Lookups, MatchDetail, MatchSummary, Meta, Player, Stats, Team, Title, Tournament } from './types'

// Rutas relativas: funcionan en GitHub Pages (subcarpeta) y dentro de Capacitor.
const BASE = `${import.meta.env.BASE_URL}data/`

const cache = new Map<string, Promise<unknown>>()

export function loadJson<T>(path: string): Promise<T> {
  let p = cache.get(path)
  if (!p) {
    p = fetch(BASE + path).then((res) => {
      if (!res.ok) throw new Error(`No se pudo cargar ${path} (${res.status})`)
      return res.json()
    })
    p.catch(() => cache.delete(path)) // si falla, se puede reintentar
    cache.set(path, p)
  }
  return p as Promise<T>
}

export const api = {
  meta: () => loadJson<Meta>('meta.json'),
  matches: () => loadJson<MatchSummary[]>('matches.json'),
  match: (id: number) => loadJson<MatchDetail>(`matches/${id}.json`),
  players: () => loadJson<Player[]>('players.json'),
  teams: () => loadJson<Team[]>('teams.json'),
  tournaments: () => loadJson<{ circuits: Circuit[]; tournaments: Tournament[] }>('tournaments.json'),
  titles: () => loadJson<Title[]>('titles.json'),
  stats: () => loadJson<Stats>('stats.json'),
  lookups: () => loadJson<Lookups>('lookups.json'),
  facts: () => loadJson<Fact[]>('facts.json').then((fs) => new Map(fs.map((f) => [f.id, f]))),
}

/** Datos chicos que casi todas las pantallas necesitan, ya indexados por id. */
export interface Base {
  teams: Map<number, Team>
  players: Map<number, Player>
  tournaments: Map<number, Tournament>
  circuits: Map<number, Circuit>
  courts: Map<number, Lookups['courts'][number]>
  shirts: Map<number, Lookups['shirts'][number]>
}

let basePromise: Promise<Base> | null = null
export function loadBase(): Promise<Base> {
  if (!basePromise) {
    basePromise = Promise.all([api.teams(), api.players(), api.tournaments(), api.lookups()]).then(
      ([teams, players, tours, lookups]) => ({
        teams: new Map(teams.map((t) => [t.id, t])),
        players: new Map(players.map((p) => [p.id, p])),
        tournaments: new Map(tours.tournaments.map((t) => [t.id, t])),
        circuits: new Map(tours.circuits.map((c) => [c.id, c])),
        courts: new Map(lookups.courts.map((c) => [c.id, c])),
        shirts: new Map(lookups.shirts.map((s) => [s.id, s])),
      }),
    )
    basePromise.catch(() => (basePromise = null))
  }
  return basePromise
}

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: Error; retry: () => void }
  | { status: 'ready'; data: T }

/** Hook para cargar datos: useData(() => api.stats(), []) */
export function useData<T>(loader: () => Promise<T>, deps: unknown[]): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let alive = true
    setState({ status: 'loading' })
    loader().then(
      (data) => alive && setState({ status: 'ready', data }),
      (error: Error) => alive && setState({ status: 'error', error, retry: () => setAttempt((a) => a + 1) }),
    )
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt])
  return state
}
