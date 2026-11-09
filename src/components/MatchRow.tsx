import { Link } from 'react-router-dom'
import type { Base } from '../lib/data'
import { formatDate, formatScore, OUTCOME_LABEL, OUTCOME_SHORT } from '../lib/format'
import type { MatchSummary, Outcome } from '../lib/types'

export function OutcomeBadge({ outcome }: { outcome: Outcome | null }) {
  if (!outcome) return <span className="badge badge-none" title="Resultado sin dato">–</span>
  return (
    <span className={`badge badge-${outcome}`} title={OUTCOME_LABEL[outcome]}>
      <span aria-hidden="true">{OUTCOME_SHORT[outcome]}</span>
      <span className="visually-hidden">{OUTCOME_LABEL[outcome]}</span>
    </span>
  )
}

/** Fecha / fase corta: "F. 3", "8vos", etc. */
export function roundLabel(m: Pick<MatchSummary, 'matchday' | 'cupRound'>): string {
  if (m.matchday) return `Fecha ${m.matchday}`
  if (m.cupRound) return m.cupRound
  return ''
}

function shortRound(m: Pick<MatchSummary, 'matchday' | 'cupRound'>): string {
  if (m.matchday) return `F${m.matchday}`
  return m.cupRound ?? ''
}

export function MatchRow({ m, base, showTournament = true }: { m: MatchSummary; base: Base; showTournament?: boolean }) {
  const rival = base.teams.get(m.rivalId)?.name ?? 'sin dato'
  const tour = base.tournaments.get(m.tournamentId)
  const circuit = base.circuits.get(m.circuitId)
  const sub = [showTournament ? (tour?.isCup ? tour.name : `${circuit?.short ?? ''} ${tour?.year ?? ''} T${tour?.edition ?? ''}`) : '', shortRound(m)]
    .filter(Boolean)
    .join(' · ')
  return (
    <li>
      <Link to={`/partidos/${m.id}`} className="row match-row">
        <OutcomeBadge outcome={m.outcome} />
        <span className="row-main">
          <span className="match-row-rival">{rival}</span>
          <span className="muted small tabular">
            {formatDate(m.date)}
            {sub && ` · ${sub}`}
          </span>
        </span>
        <span className="match-row-end">
          <span className="match-row-score tabular">{formatScore(m.goalsFor, m.goalsAgainst)}</span>
          <span className="match-row-icons" aria-hidden="true">
            {m.videoGoals > 0 && <span title="Goles en video">▶</span>}
            {m.hasMedia && <span title="Fotos y videos">📷</span>}
          </span>
        </span>
      </Link>
    </li>
  )
}
