/** Búsqueda global: jugadores, rivales, torneos, circuitos, años, canchas y camisetas. */
import type { Base } from './data'
import type { FilterKey } from './explore'
import type { MatchSummary } from './types'

export type Kind = 'player' | 'rival' | 'tournament' | 'circuit' | 'year' | 'court' | 'shirt'

export interface Hit {
  kind: Kind
  id: number
  name: string
  score: number // 3 exacto · 2 empieza igual · 1 contiene
}

export const KIND_LABEL: { [k in Kind]: string } = {
  player: 'Jugadores',
  rival: 'Rivales',
  tournament: 'Torneos',
  circuit: 'Circuitos',
  year: 'Años',
  court: 'Canchas',
  shirt: 'Camisetas',
}

export const KIND_SINGULAR: { [k in Kind]: string } = {
  player: 'Jugador',
  rival: 'Rival',
  tournament: 'Torneo',
  circuit: 'Circuito',
  year: 'Año',
  court: 'Cancha',
  shirt: 'Camiseta',
}

/** Qué filtro de Estadísticas corresponde a cada tipo de resultado. */
export const KIND_FILTER: { [k in Kind]: FilterKey } = {
  player: 'player',
  rival: 'rival',
  tournament: 'tournament',
  circuit: 'circuit',
  year: 'year',
  court: 'court',
  shirt: 'shirt',
}

export function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Puntaje de un texto contra la búsqueda (0 = no coincide). Todas las palabras tienen que aparecer. */
export function scoreText(text: string, query: string): number {
  const t = norm(text)
  const q = norm(query)
  if (!q) return 0
  if (t === q) return 3
  const words = q.split(/\s+/)
  if (!words.every((w) => t.includes(w))) return 0
  const tWords = t.split(/[\s·\-()]+/)
  if (t.startsWith(q) || words.every((w) => tWords.some((tw) => tw.startsWith(w)))) return 2
  return 1
}

export function search(query: string, base: Base, matches: MatchSummary[]): Hit[] {
  const hits: Hit[] = []
  const add = (kind: Kind, id: number, name: string, ...alt: string[]) => {
    const score = Math.max(...[name, ...alt].map((t) => scoreText(t, query)))
    if (score) hits.push({ kind, id, name, score })
  }
  for (const p of base.players.values()) add('player', p.id, p.name)
  for (const t of base.teams.values()) if (t.matchIds.length) add('rival', t.id, t.name)
  for (const t of base.tournaments.values()) {
    if (!t.matchIds.length && !t.unloadedMatchFolders.length) continue
    const c = base.circuits.get(t.circuitId)
    add('tournament', t.id, t.name, t.code, `${c?.short ?? ''} ${t.year} ${t.edition}`, `${c?.name ?? ''} ${t.year}`)
  }
  for (const c of base.circuits.values()) add('circuit', c.id, c.name, c.short)
  for (const y of new Set(matches.map((m) => m.year))) add('year', y, String(y))
  for (const c of base.courts.values()) add('court', c.id, c.name)
  for (const s of base.shirts.values()) add('shirt', s.id, s.name, `camiseta ${s.name}`)
  const order: Kind[] = ['player', 'rival', 'tournament', 'circuit', 'year', 'court', 'shirt']
  return hits.sort((a, b) => b.score - a.score || order.indexOf(a.kind) - order.indexOf(b.kind) || a.name.localeCompare(b.name, 'es'))
}

/** El resultado a mostrar desplegado: uno exacto, o el único que hay, o uno que gana claramente. */
export function featured(hits: Hit[]): Hit | undefined {
  if (!hits.length) return undefined
  if (hits.length === 1) return hits[0]
  const [a, b] = hits
  if (a.score === 3 && b.score < 3) return a
  if (a.score > b.score && hits.filter((h) => h.score === a.score).length === 1) return a
  return undefined
}
