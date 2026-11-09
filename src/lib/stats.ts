import type { MatchSummary, Record } from './types'

export function emptyRecord(): Record {
  return { played: 0, won: 0, drawn: 0, lost: 0, unknown: 0, goalsFor: 0, goalsAgainst: 0 }
}

/** Récord (PJ/G/E/P/GF/GC) de una lista de partidos. Mismo criterio que build_data.py. */
export function computeRecord(matches: Pick<MatchSummary, 'outcome' | 'goalsFor' | 'goalsAgainst'>[]): Record {
  const r = emptyRecord()
  for (const m of matches) {
    r.played++
    if (m.outcome === 'V') r.won++
    else if (m.outcome === 'E') r.drawn++
    else if (m.outcome === 'D') r.lost++
    else r.unknown++
    r.goalsFor += m.goalsFor ?? 0
    r.goalsAgainst += m.goalsAgainst ?? 0
  }
  return r
}

export interface Ranked<T> {
  rank: number
  item: T
}

/** Ranking con empates compartidos (1, 2, 2, 4…). Espera la lista ya ordenada de mayor a menor. */
export function withRanks<T>(items: T[], value: (t: T) => number): Ranked<T>[] {
  const out: Ranked<T>[] = []
  items.forEach((item, i) => {
    const prev = out[i - 1]
    const rank = prev && value(prev.item) === value(item) ? prev.rank : i + 1
    out.push({ rank, item })
  })
  return out
}
