import { Link, useSearchParams } from 'react-router-dom'
import { RecordCard, RecordInline, Stat, StatGrid } from '../components/Bits'
import { ExpandableList, GoalList } from '../components/GoalList'
import { MatchRow } from '../components/MatchRow'
import { Page } from '../components/Page'
import { Async, Empty } from '../components/States'
import { api, loadBase, useData, type Base } from '../lib/data'
import {
  clubStats,
  FILTER_PARAM,
  filtersFromParams,
  playerStats,
  scopeMatches,
  type Breakdown,
  type Fact,
  type FilterKey,
  type Filters,
  type Row,
} from '../lib/explore'
import { formatDate, formatScore } from '../lib/format'
import type { MatchSummary } from '../lib/types'

export default function StatsExplorer() {
  const state = useData(() => Promise.all([api.matches(), api.facts(), loadBase()]), [])
  return (
    <Page title="Estadísticas">
      <Async state={state}>{([matches, facts, base]) => <Explorer matches={matches} facts={facts} base={base} />}</Async>
    </Page>
  )
}

/** Nombre legible de cada valor de filtro. */
export function labeler(base: Base) {
  return {
    player: (id: number) => base.players.get(id)?.name ?? 'sin dato',
    circuit: (id: number) => base.circuits.get(id)?.name ?? 'sin dato',
    tournament: (id: number) => base.tournaments.get(id)?.name ?? 'sin dato',
    year: (y: number) => String(y),
    court: (id: number) => base.courts.get(id)?.name ?? 'sin dato',
    rival: (id: number) => base.teams.get(id)?.name ?? 'sin dato',
    shirt: (id: number) => base.shirts.get(id)?.name ?? 'sin dato',
  }
}

const FILTER_LABEL: { [k in FilterKey]: string } = {
  player: 'Jugador',
  circuit: 'Circuito',
  tournament: 'Torneo',
  year: 'Año',
  court: 'Cancha',
  rival: 'Rival',
  shirt: 'Camiseta',
}

function Explorer({ matches, facts, base }: { matches: MatchSummary[]; facts: Map<number, Fact>; base: Base }) {
  const [params, setParams] = useSearchParams()
  const f = filtersFromParams(params)
  const label = labeler(base)

  const set = (k: FilterKey, v: number | undefined) => {
    const next = new URLSearchParams(params)
    if (v) next.set(FILTER_PARAM[k], String(v))
    else next.delete(FILTER_PARAM[k])
    setParams(next, { replace: true })
    window.scrollTo({ top: 0 })
  }

  const scope = scopeMatches(matches, facts, f)
  // opciones de cada filtro, según lo demás elegido (para no ofrecer combinaciones vacías)
  const optionsFor = (k: FilterKey): number[] => {
    const rest: Filters = { ...f, [k]: undefined }
    const ms = scopeMatches(matches, facts, rest)
    const ids = new Set<number>()
    for (const m of ms) {
      const x = facts.get(m.id)
      if (k === 'circuit') ids.add(m.circuitId)
      if (k === 'tournament') ids.add(m.tournamentId)
      if (k === 'year') ids.add(m.year)
      if (k === 'rival') ids.add(m.rivalId)
      if (k === 'court' && x?.court) ids.add(x.court)
      if (k === 'shirt' && x?.shirt) ids.add(x.shirt)
    }
    const arr = Array.from(ids)
    if (k === 'year') return arr.sort((a, b) => b - a)
    if (k === 'tournament')
      return arr.sort((a, b) => {
        const ta = base.tournaments.get(a)!
        const tb = base.tournaments.get(b)!
        return tb.year - ta.year || tb.edition - ta.edition
      })
    return arr.sort((a, b) => label[k](a).localeCompare(label[k](b), 'es', { numeric: true }))
  }
  const players = Array.from(base.players.values()).sort((a, b) => b.matches - a.matches || a.name.localeCompare(b.name))
  const scopeKeys = (Object.keys(FILTER_LABEL) as FilterKey[]).filter((k) => k !== 'player')
  const active = (Object.keys(f) as FilterKey[]).filter((k) => f[k])

  const scopeText = scopeKeys.filter((k) => f[k]).map((k) => label[k](f[k]!)).join(' · ')

  return (
    <>
      <div className="card explorer-filters">
        <label className="field">
          <span className="field-label">Ver estadísticas de</span>
          <span className="select">
            <select value={f.player ?? 0} onChange={(e) => set('player', Number(e.target.value) || undefined)}>
              <option value={0}>Todo el club</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </span>
        </label>
        <p className="field-label">Filtrar por</p>
        <div className="selects">
          {scopeKeys.map((k) => (
            <label key={k} className="select">
              <span className="visually-hidden">{FILTER_LABEL[k]}</span>
              <select value={f[k] ?? 0} onChange={(e) => set(k, Number(e.target.value) || undefined)}>
                <option value={0}>{k === 'year' ? 'Todos los años' : `${FILTER_LABEL[k]}: todos`}</option>
                {optionsFor(k).map((id) => (
                  <option key={id} value={id}>{label[k](id)}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
        {active.length > 0 && (
          <div className="chips active-filters">
            {active.map((k) => (
              <button key={k} type="button" className="chip is-on" onClick={() => set(k, undefined)}>
                <span className="visually-hidden">Quitar filtro {FILTER_LABEL[k]}: </span>
                {label[k](f[k]!)} <span aria-hidden="true">✕</span>
              </button>
            ))}
            <button type="button" className="link-btn" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
              Limpiar todo
            </button>
          </div>
        )}
      </div>

      {scope.length === 0 ? (
        <Empty title="No hay partidos con esa combinación">Probá sacando algún filtro.</Empty>
      ) : f.player ? (
        <PlayerView pid={f.player} scope={scope} facts={facts} base={base} scopeText={scopeText} onDrill={set} />
      ) : (
        <ClubView scope={scope} facts={facts} base={base} scopeText={scopeText} onDrill={set} filters={f} />
      )}
    </>
  )
}

type Drill = (k: FilterKey, v: number) => void

function RankTable({ title, rows, base, unit, limit = 5, onPick }: { title: string; rows: Row[]; base: Base; unit: string; limit?: number; onPick?: Drill }) {
  if (!rows.length) return null
  return (
    <>
      <h3 className="sub-title">{title}</h3>
      <ExpandableList
        items={rows}
        limit={limit}
        noun="jugadores"
        render={(r) => (
          <li key={r.id}>
            <button type="button" className="row" onClick={() => onPick?.('player', r.id)}>
              <span className="row-main">{base.players.get(r.id)?.name ?? 'sin dato'}</span>
              <span className="row-value tabular">{r.value}<small>{unit}</small></span>
            </button>
          </li>
        )}
      />
    </>
  )
}

function BreakdownTable<K extends number>({
  title,
  rows,
  label,
  onPick,
  goals,
  limit = 6,
}: {
  title: string
  rows: Breakdown<K>[]
  label: (k: K) => string
  onPick?: (k: K) => void
  goals?: boolean
  limit?: number
}) {
  if (rows.length < 2 && !goals) return null
  if (!rows.length) return null
  return (
    <>
      <h3 className="sub-title">{title}</h3>
      <ExpandableList
        items={rows}
        limit={limit}
        noun="filas"
        render={(b) => (
          <li key={String(b.key)}>
            <button type="button" className="row" onClick={() => onPick?.(b.key)} disabled={!onPick}>
              <span className="row-main">
                <span>{label(b.key)}</span>
                <span className="muted small"><RecordInline r={b.record} /></span>
              </span>
              {goals ? (
                <span className="row-value tabular">{b.goals ?? 0}<small>goles</small></span>
              ) : (
                <span className="row-value tabular small">{b.record.goalsFor}–{b.record.goalsAgainst}</span>
              )}
            </button>
          </li>
        )}
      />
    </>
  )
}

function FeaturedMatch({ label, m, base }: { label: string; m?: MatchSummary; base: Base }) {
  if (!m) return null
  return (
    <li>
      <Link to={`/partidos/${m.id}`} className="row">
        <span className="row-main">
          <span className="muted small">{label}</span>
          <span>vs {base.teams.get(m.rivalId)?.name ?? 'sin dato'}</span>
          <span className="muted small tabular">{formatDate(m.date)}</span>
        </span>
        <span className="row-value tabular big">{formatScore(m.goalsFor, m.goalsAgainst)}</span>
      </Link>
    </li>
  )
}

function ClubView({ scope, facts, base, scopeText, onDrill, filters }: { scope: MatchSummary[]; facts: Map<number, Fact>; base: Base; scopeText: string; onDrill: Drill; filters: Filters }) {
  const s = clubStats(scope, facts)
  const label = labeler(base)
  const pj = s.record.played
  return (
    <>
      <h2 className="section-title">Les Molestes{scopeText ? '' : ' · historia completa'}</h2>
      {scopeText && <p className="muted small scope-text">{scopeText}</p>}
      <RecordCard r={s.record} />

      <StatGrid>
        <Stat label="Goles por partido" value={pj ? (s.record.goalsFor / pj).toFixed(1).replace('.', ',') : '–'} tone="win" />
        <Stat label="Recibidos por partido" value={pj ? (s.record.goalsAgainst / pj).toFixed(1).replace('.', ',') : '–'} />
        <Stat label="Goles en video" value={s.videoGoals} tone="accent" />
        <Stat label="De penal" value={s.penalties} />
        <Stat label="De tiro libre" value={s.freeKicks} />
        <Stat label="En contra del rival" value={s.ownGoals} />
        <Stat label="Racha ganando" value={s.winStreak.length} />
        <Stat label="Racha invicta" value={s.unbeatenStreak.length} />
        <Stat label="Goles sin autor" value={s.goalsWithoutAuthor} />
      </StatGrid>

      {(s.biggestWin || s.biggestLoss) && (
        <ul className="list spaced">
          <FeaturedMatch label="Mejor victoria" m={s.biggestWin} base={base} />
          <FeaturedMatch label="Peor derrota" m={s.biggestLoss} base={base} />
        </ul>
      )}

      <h2 className="section-title">Jugadores</h2>
      <p className="muted small note">Tocá un nombre para ver sus números con estos mismos filtros.</p>
      <RankTable title="Goleadores" rows={s.scorers} base={base} unit="goles" onPick={onDrill} />
      <RankTable title="Asistencias" rows={s.assists} base={base} unit="asist." onPick={onDrill} />
      <RankTable title="Presencias" rows={s.appearances} base={base} unit="PJ" onPick={onDrill} />
      <RankTable title="Amarillas" rows={s.yellow} base={base} unit="amar." limit={3} onPick={onDrill} />
      <RankTable title="Rojas" rows={s.red} base={base} unit="rojas" limit={3} onPick={onDrill} />
      {s.goalkeepers.length > 0 && (
        <>
          <h3 className="sub-title">Arqueros</h3>
          <ExpandableList
            items={s.goalkeepers}
            limit={3}
            noun="arqueros"
            render={(g) => (
              <li key={g.id}>
                <button type="button" className="row" onClick={() => onDrill('player', g.id)}>
                  <span className="row-main">
                    <span>{base.players.get(g.id)?.name ?? 'sin dato'}</span>
                    <span className="muted small tabular">
                      {g.cleanSheets} vallas invictas · {(g.goalsAgainst / g.matches).toFixed(1).replace('.', ',')} recibidos por partido
                    </span>
                  </span>
                  <span className="row-value tabular">{g.matches}<small>PJ</small></span>
                </button>
              </li>
            )}
          />
        </>
      )}

      <h2 className="section-title">Desglose</h2>
      <p className="muted small note">Tocá una fila para filtrar por ella.</p>
      {!filters.year && <BreakdownTable title="Por año" rows={s.byYear} label={label.year} onPick={(k) => onDrill('year', k)} />}
      {!filters.circuit && <BreakdownTable title="Por circuito" rows={s.byCircuit} label={label.circuit} onPick={(k) => onDrill('circuit', k)} />}
      {!filters.tournament && <BreakdownTable title="Por torneo" rows={s.byTournament} label={label.tournament} onPick={(k) => onDrill('tournament', k)} />}
      {!filters.court && <BreakdownTable title="Por cancha" rows={s.byCourt} label={label.court} onPick={(k) => onDrill('court', k)} />}
      {!filters.shirt && <BreakdownTable title="Por camiseta" rows={s.byShirt} label={label.shirt} onPick={(k) => onDrill('shirt', k)} />}
      {!filters.rival && <BreakdownTable title="Rivales más enfrentados" rows={s.byRival} label={label.rival} onPick={(k) => onDrill('rival', k)} limit={5} />}

      <h2 className="section-title">Partidos ({scope.length})</h2>
      <ExpandableList items={[...scope]} render={(m) => <MatchRow key={m.id} m={m} base={base} />} />
    </>
  )
}

function PlayerView({ pid, scope, facts, base, scopeText, onDrill }: { pid: number; scope: MatchSummary[]; facts: Map<number, Fact>; base: Base; scopeText: string; onDrill: Drill }) {
  const p = base.players.get(pid)
  if (!p) return <Empty title="Jugador no encontrado" />
  const s = playerStats(pid, scope, facts)
  const label = labeler(base)
  const byId = new Map(scope.map((m) => [m.id, m]))
  const pj = s.matches.length
  return (
    <>
      <h2 className="section-title">{p.name}</h2>
      <p className="muted small scope-text">
        {scopeText || 'Toda su historia en el club'} · <Link to={`/jugadores/${p.id}`}>ver ficha</Link>
      </p>
      {pj === 0 ? (
        <Empty title="No jugó partidos con estos filtros" />
      ) : (
        <>
          <StatGrid>
            <Stat label="Partidos" value={pj} />
            <Stat label="Goles" value={s.goals.length} tone="win" />
            <Stat label="Asistencias" value={s.assistsGiven.length} />
            <Stat label="Titular" value={s.starts} />
            <Stat label="Suplente" value={s.bench} />
            <Stat label="Prom. gol" value={(s.goals.length / pj).toFixed(2).replace('.', ',')} />
            <Stat label="Amarillas" value={s.yellow.length} />
            <Stat label="Rojas" value={s.red.length} tone={s.red.length ? 'loss' : undefined} />
            <Stat label="Penal / T. libre" value={`${s.goals.filter((g) => g.penalty).length} / ${s.goals.filter((g) => g.freeKick).length}`} />
          </StatGrid>

          <h2 className="section-title">El equipo cuando jugó</h2>
          <RecordCard r={s.record} />

          {s.goalkeeper.matches > 0 && (
            <>
              <h2 className="section-title">Como arquero</h2>
              <StatGrid>
                <Stat label="Partidos" value={s.goalkeeper.matches} />
                <Stat label="Vallas invictas" value={s.goalkeeper.cleanSheets} tone="win" />
                <Stat label="Goles recibidos" value={s.goalkeeper.goalsAgainst} />
              </StatGrid>
            </>
          )}

          <h2 className="section-title">Goles ({s.goals.length})</h2>
          <GoalList goals={s.goals} base={base} byId={byId} playerName={p.name} />

          {(s.yellow.length > 0 || s.red.length > 0) && (
            <>
              <h2 className="section-title">Tarjetas ({s.yellow.length + s.red.length})</h2>
              <CardList yellow={s.yellow} red={s.red} base={base} byId={byId} />
            </>
          )}

          {(s.assistedBy.length > 0 || s.assistedTo.length > 0) && (
            <>
              <h2 className="section-title">Socios</h2>
              <RankTable title="Quién le dio más asistencias" rows={s.assistedBy} base={base} unit="asist." limit={3} onPick={onDrill} />
              <RankTable title="A quién asistió más" rows={s.assistedTo} base={base} unit="asist." limit={3} onPick={onDrill} />
            </>
          )}

          <h2 className="section-title">Desglose</h2>
          <BreakdownTable title="Por año" rows={s.byYear} label={label.year} goals onPick={(k) => onDrill('year', k)} />
          <BreakdownTable title="Por circuito" rows={s.byCircuit} label={label.circuit} goals onPick={(k) => onDrill('circuit', k)} />
          <BreakdownTable title="Por torneo" rows={s.byTournament} label={label.tournament} goals onPick={(k) => onDrill('tournament', k)} />
          <BreakdownTable title="Por cancha" rows={s.byCourt} label={label.court} goals onPick={(k) => onDrill('court', k)} />
          <BreakdownTable title="Contra cada rival" rows={s.byRival.sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0) || b.record.played - a.record.played)} label={label.rival} goals onPick={(k) => onDrill('rival', k)} limit={5} />

          <h2 className="section-title">Partidos ({pj})</h2>
          <ExpandableList items={[...s.matches]} render={(m) => <MatchRow key={m.id} m={m} base={base} />} />
        </>
      )}
    </>
  )
}

export function CardList({ yellow, red, base, byId }: { yellow: number[]; red: number[]; base: Base; byId: Map<number, MatchSummary> }) {
  const items = [...red.map((id) => ({ id, kind: 'red' as const })), ...yellow.map((id) => ({ id, kind: 'yellow' as const }))].sort(
    (a, b) => (byId.get(b.id)?.date ?? '').localeCompare(byId.get(a.id)?.date ?? ''),
  )
  return (
    <ExpandableList
      items={items}
      limit={5}
      noun="tarjetas"
      render={(c) => {
        const m = byId.get(c.id)
        return (
          <li key={`${c.kind}${c.id}`} className="goal-row">
            <span className={`card-icon ${c.kind}`} role="img" aria-label={c.kind === 'red' ? 'Roja' : 'Amarilla'} />
            <span className="row-main">
              <Link to={`/partidos/${c.id}`}>vs {m ? base.teams.get(m.rivalId)?.name ?? 'sin dato' : 'sin dato'}</Link>
              <span className="muted small tabular">{m ? formatDate(m.date) : ''} · {c.kind === 'red' ? 'Roja' : 'Amarilla'}</span>
            </span>
          </li>
        )
      }}
    />
  )
}
