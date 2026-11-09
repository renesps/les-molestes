import type { Outcome, Record } from './types'

export const TIME_ZONE = 'America/Argentina/Buenos_Aires'

const dateFmt = new Intl.DateTimeFormat('es-AR', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const timeFmt = new Intl.DateTimeFormat('es-AR', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
const longFmt = new Intl.DateTimeFormat('es-AR', {
  timeZone: TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** '2016-03-12T13:00:00-03:00' → '12/03/2016' (hora de Buenos Aires) */
export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso))
}

/** → '13:00' */
export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso))
}

/** → 'sábado, 12 de marzo de 2016' */
export function formatLongDate(iso: string): string {
  return longFmt.format(new Date(iso))
}

export const OUTCOME_LABEL: { [k in Outcome]: string } = { V: 'Victoria', E: 'Empate', D: 'Derrota' }
export const OUTCOME_SHORT: { [k in Outcome]: string } = { V: 'G', E: 'E', D: 'P' }

/** Marcador para mostrar: '3 – 1', o 'sin dato' en la parte que falte. */
export function formatScore(gf: number | null, ga: number | null): string {
  if (gf === null && ga === null) return 'sin dato'
  return `${gf ?? '?'} – ${ga ?? '?'}`
}

export function goalDiff(r: Record): string {
  const d = r.goalsFor - r.goalsAgainst
  return d > 0 ? `+${d}` : String(d)
}

/** Porcentaje de partidos ganados sobre los que tienen resultado conocido. */
export function winRate(r: Record): number {
  const known = r.won + r.drawn + r.lost
  return known ? Math.round((r.won / known) * 100) : 0
}

export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralForm}`
}
