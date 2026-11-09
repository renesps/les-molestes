/**
 * Estadísticas filtrables: club o jugador, cruzado con torneo, año, circuito,
 * cancha, rival y camiseta. Trabaja sobre matches.json + facts.json.
 * Mismos criterios que scripts/build_data.py (los tests lo comparan).
 */
import { computeRecord } from './stats'
import type { MatchSummary, Record } from './types'

/** [goalId, autor (0 = en contra del rival), asistencia (0 = sin dato), penal, tiro libre, video] */
export type GoalFact = [number, number, number, number, number, number]

export interface Fact {
  id: number
  court: number | null
  shirt: number | null
  gk: number | null
  st: number[]
  bn: number[]
  g: GoalFact[]
  y: number[]
  r: number[]
}

export interface Filters {
  player?: number
  circuit?: number
  tournament?: number
  year?: number
  court?: number
  rival?: number
  shirt?: number
}

export type FilterKey = keyof Filters

export const FILTER_PARAM: { [k in FilterKey]: string } = {
  player: 'j',
  circuit: 'c',
  tournament: 't',
  year: 'y',
  court: 'k',
  rival: 'r',
  shirt: 's',
}

export function filtersFromParams(p: URLSearchParams): Filters {
  const f: Filters = {}
  for (const [k, short] of Object.entries(FILTER_PARAM) as [FilterKey, string][]) {
    const v = Number(p.get(short))
    if (v) f[k] = v
  }
  return f
}

/** Jugadores que "participaron" de un partido: titulares, suplentes, arquero y goleadores (igual que el build). */
export function participants(f: Fact): Set<number> {
  const s = new Set<number>([...f.st, ...f.bn])
  if (f.gk) s.add(f.gk)
  for (const g of f.g) if (g[1]) s.add(g[1])
  return s
}

/** Partidos que cumplen los filtros de ámbito (sin contar el jugador). */
export function scopeMatches(matches: MatchSummary[], facts: Map<number, Fact>, f: Filters): MatchSummary[] {
  return matches.filter((m) => {
    if (f.circuit && m.circuitId !== f.circuit) return false
    if (f.tournament && m.tournamentId !== f.tournament) return false
    if (f.year && m.year !== f.year) return false
    if (f.rival && m.rivalId !== f.rival) return false
    const x = facts.get(m.id)
    if (f.court && x?.court !== f.court) return false
    if (f.shirt && x?.shirt !== f.shirt) return false
    return true
  })
}

export interface Row {
  id: number
  value: number
}

function toRows(c: Map<number, number>): Row[] {
  return Array.from(c.entries())
    .filter(([, v]) => v > 0)
    .map(([id, value]) => ({ id, value }))
    .sort((a, b) => b.value - a.value || a.id - b.id)
}

function inc(c: Map<number, number>, k: number, n = 1) {
  c.set(k, (c.get(k) ?? 0) + n)
}

export interface Breakdown<K> {
  key: K
  record: Record
  goals?: number
}

function breakdown<K>(ms: MatchSummary[], key: (m: MatchSummary) => K | null | undefined): Breakdown<K>[] {
  const groups = new Map<K, MatchSummary[]>()
  for (const m of ms) {
    const k = key(m)
    if (k == null) continue
    groups.set(k, [...(groups.get(k) ?? []), m])
  }
  return Array.from(groups.entries())
    .map(([k, list]) => ({ key: k, record: computeRecord(list) }))
    .sort((a, b) => b.record.played - a.record.played)
}

export interface Streak {
  length: number
  from?: number
  to?: number
}

function longest(ms: MatchSummary[], ok: (o: MatchSummary['outcome']) => boolean): Streak {
  let best: Streak = { length: 0 }
  let cur = 0
  let start: number | undefined
  for (const m of [...ms].sort((a, b) => a.date.localeCompare(b.date))) {
    if (m.outcome && ok(m.outcome)) {
      cur++
      start ??= m.id
      if (cur > best.length) best = { length: cur, from: start, to: m.id }
    } else {
      cur = 0
      start = undefined
    }
  }
  return best
}

export interface ClubStats {
  matches: MatchSummary[]
  record: Record
  goalsDetailed: number
  goalsWithoutAuthor: number
  penalties: number
  freeKicks: number
  ownGoals: number
  videoGoals: number
  scorers: Row[]
  assists: Row[]
  appearances: Row[]
  yellow: Row[]
  red: Row[]
  goalkeepers: { id: number; matches: number; goalsAgainst: number; cleanSheets: number }[]
  biggestWin?: MatchSummary
  biggestLoss?: MatchSummary
  winStreak: Streak
  unbeatenStreak: Streak
  byYear: Breakdown<number>[]
  byCircuit: Breakdown<number>[]
  byTournament: Breakdown<number>[]
  byCourt: Breakdown<number>[]
  byShirt: Breakdown<number>[]
  byRival: Breakdown<number>[]
}

export function clubStats(ms: MatchSummary[], facts: Map<number, Fact>): ClubStats {
  const scorers = new Map<number, number>()
  const assists = new Map<number, number>()
  const apps = new Map<number, number>()
  const yellow = new Map<number, number>()
  const red = new Map<number, number>()
  const gk = new Map<number, { matches: number; goalsAgainst: number; cleanSheets: number }>()
  let detailed = 0
  let pen = 0
  let fk = 0
  let own = 0
  let video = 0
  for (const m of ms) {
    const f = facts.get(m.id)
    if (!f) continue
    for (const p of participants(f)) inc(apps, p)
    for (const g of f.g) {
      detailed++
      if (g[1]) inc(scorers, g[1])
      else own++
      if (g[2]) inc(assists, g[2])
      pen += g[3]
      fk += g[4]
      video += g[5]
    }
    f.y.forEach((p) => inc(yellow, p))
    f.r.forEach((p) => inc(red, p))
    if (f.gk) {
      const s = gk.get(f.gk) ?? { matches: 0, goalsAgainst: 0, cleanSheets: 0 }
      s.matches++
      s.goalsAgainst += m.goalsAgainst ?? 0
      if (m.goalsAgainst === 0) s.cleanSheets++
      gk.set(f.gk, s)
    }
  }
  const record = computeRecord(ms)
  const known = ms.filter((m) => m.goalsFor != null && m.goalsAgainst != null)
  const diff = (m: MatchSummary) => m.goalsFor! - m.goalsAgainst!
  const biggestWin = known.filter((m) => diff(m) > 0).sort((a, b) => diff(b) - diff(a) || b.goalsFor! - a.goalsFor!)[0]
  const biggestLoss = known.filter((m) => diff(m) < 0).sort((a, b) => diff(a) - diff(b) || b.goalsAgainst! - a.goalsAgainst!)[0]

  return {
    matches: ms,
    record,
    goalsDetailed: detailed,
    goalsWithoutAuthor: Math.max(0, record.goalsFor - detailed),
    penalties: pen,
    freeKicks: fk,
    ownGoals: own,
    videoGoals: video,
    scorers: toRows(scorers),
    assists: toRows(assists),
    appearances: toRows(apps),
    yellow: toRows(yellow),
    red: toRows(red),
    goalkeepers: Array.from(gk.entries())
      .map(([id, s]) => ({ id, ...s }))
      .sort((a, b) => b.matches - a.matches),
    biggestWin,
    biggestLoss,
    winStreak: longest(ms, (o) => o === 'V'),
    unbeatenStreak: longest(ms, (o) => o === 'V' || o === 'E'),
    byYear: breakdown(ms, (m) => m.year).sort((a, b) => b.key - a.key),
    byCircuit: breakdown(ms, (m) => m.circuitId),
    byTournament: breakdown(ms, (m) => m.tournamentId),
    byCourt: breakdown(ms, (m) => facts.get(m.id)?.court),
    byShirt: breakdown(ms, (m) => facts.get(m.id)?.shirt),
    byRival: breakdown(ms, (m) => m.rivalId),
  }
}

export interface PlayerGoal {
  goalId: number
  matchId: number
  assistId: number
  penalty: boolean
  freeKick: boolean
  video: boolean
}

export interface PlayerStats {
  id: number
  matches: MatchSummary[]
  record: Record
  starts: number
  bench: number
  goals: PlayerGoal[]
  assistsGiven: { goalId: number; matchId: number; scorerId: number }[]
  yellow: number[] // matchIds
  red: number[]
  goalkeeper: { matches: number; goalsAgainst: number; cleanSheets: number }
  assistedBy: Row[] // quién le dio más pases de gol
  assistedTo: Row[] // a quién le dio más pases de gol
  byYear: (Breakdown<number> & { goals: number })[]
  byCircuit: (Breakdown<number> & { goals: number })[]
  byTournament: (Breakdown<number> & { goals: number })[]
  byCourt: (Breakdown<number> & { goals: number })[]
  byRival: (Breakdown<number> & { goals: number })[]
}

export function playerStats(pid: number, scope: MatchSummary[], facts: Map<number, Fact>): PlayerStats {
  const ms = scope.filter((m) => {
    const f = facts.get(m.id)
    return f ? participants(f).has(pid) : false
  })
  const goals: PlayerGoal[] = []
  const assistsGiven: PlayerStats['assistsGiven'] = []
  const yellow: number[] = []
  const red: number[] = []
  const by = new Map<number, number>()
  const to = new Map<number, number>()
  const goalsInMatch = new Map<number, number>()
  let starts = 0
  let bench = 0
  const gk = { matches: 0, goalsAgainst: 0, cleanSheets: 0 }
  for (const m of ms) {
    const f = facts.get(m.id)!
    if (f.st.includes(pid)) starts++
    if (f.bn.includes(pid)) bench++
    for (const g of f.g) {
      if (g[1] === pid) {
        goals.push({ goalId: g[0], matchId: m.id, assistId: g[2], penalty: !!g[3], freeKick: !!g[4], video: !!g[5] })
        inc(goalsInMatch, m.id)
        if (g[2]) inc(by, g[2])
      }
      if (g[2] === pid) {
        assistsGiven.push({ goalId: g[0], matchId: m.id, scorerId: g[1] })
        if (g[1]) inc(to, g[1])
      }
    }
    f.y.filter((p) => p === pid).forEach(() => yellow.push(m.id))
    f.r.filter((p) => p === pid).forEach(() => red.push(m.id))
    if (f.gk === pid) {
      gk.matches++
      gk.goalsAgainst += m.goalsAgainst ?? 0
      if (m.goalsAgainst === 0) gk.cleanSheets++
    }
  }
  const withGoals = <K>(b: Breakdown<K>[], key: (m: MatchSummary) => K | null | undefined) =>
    b.map((x) => ({
      ...x,
      goals: ms.filter((m) => key(m) === x.key).reduce((s, m) => s + (goalsInMatch.get(m.id) ?? 0), 0),
    }))
  const k = {
    year: (m: MatchSummary) => m.year,
    circuit: (m: MatchSummary) => m.circuitId,
    tournament: (m: MatchSummary) => m.tournamentId,
    court: (m: MatchSummary) => facts.get(m.id)?.court,
    rival: (m: MatchSummary) => m.rivalId,
  }
  return {
    id: pid,
    matches: ms,
    record: computeRecord(ms),
    starts,
    bench,
    goals,
    assistsGiven,
    yellow,
    red,
    goalkeeper: gk,
    assistedBy: toRows(by),
    assistedTo: toRows(to),
    byYear: withGoals(breakdown(ms, k.year), k.year).sort((a, b) => b.key - a.key),
    byCircuit: withGoals(breakdown(ms, k.circuit), k.circuit),
    byTournament: withGoals(breakdown(ms, k.tournament), k.tournament),
    byCourt: withGoals(breakdown(ms, k.court), k.court),
    byRival: withGoals(breakdown(ms, k.rival), k.rival),
  }
}
