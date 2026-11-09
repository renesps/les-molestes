import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DriveFolderButton } from '../components/Bits'
import { OutcomeBadge, roundLabel } from '../components/MatchRow'
import { Page } from '../components/Page'
import { Async, Empty } from '../components/States'
import { usePlayVideo } from '../components/VideoModal'
import { api, loadBase, useData, type Base } from '../lib/data'
import { formatDate, formatLongDate, formatTime, OUTCOME_LABEL, plural } from '../lib/format'
import type { Goal, MatchDetail as M, MatchSummary } from '../lib/types'

export default function MatchDetail() {
  const id = Number(useParams().id)
  const state = useData(() => Promise.all([api.match(id), loadBase(), api.matches()]), [id])
  return (
    <Page title="Partido" back>
      {Number.isNaN(id) ? (
        <Empty title="Partido no encontrado" />
      ) : (
        <Async state={state}>{([m, base, all]) => <Detail m={m} base={base} all={all} />}</Async>
      )}
    </Page>
  )
}

function PlayerLink({ id, base }: { id: number | null; base: Base }) {
  const p = id != null ? base.players.get(id) : undefined
  if (!p) return <span className="muted">sin dato</span>
  return <Link to={`/jugadores/${p.id}`}>{p.name}</Link>
}

function Detail({ m, base, all }: { m: M; base: Base; all: MatchSummary[] }) {
  const play = usePlayVideo()
  const rival = base.teams.get(m.rivalId)
  const tour = base.tournaments.get(m.tournamentId)
  const circuit = base.circuits.get(m.circuitId)
  const court = m.courtId ? base.courts.get(m.courtId) : undefined
  const shirt = m.shirtId ? base.shirts.get(m.shirtId) : undefined
  const missingGoals = m.goalsFor != null ? m.goalsFor - m.goalsDetailed : 0
  const rivalName = rival?.name ?? 'Rival sin dato'

  // anterior / siguiente en orden cronológico (all viene del más nuevo al más viejo)
  const idx = all.findIndex((x) => x.id === m.id)
  const newer = idx > 0 ? all[idx - 1] : undefined
  const older = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : undefined

  const goalTitle = (g: Goal) => (g.ownGoal ? 'Gol en contra (del rival)' : base.players.get(g.playerId ?? -1)?.name ?? 'Gol')

  return (
    <>
      <section className="card scoreboard" aria-label="Resultado">
        <p className="muted small center">
          {tour ? <Link to={`/torneos/${tour.id}`}>{tour.name}</Link> : circuit?.name}
          {roundLabel(m) && ` · ${roundLabel(m)}`}
        </p>
        <div className="scoreboard-row">
          <span className="scoreboard-team">Les Molestes</span>
          <span className="scoreboard-score tabular">
            {m.goalsFor ?? '–'}
            <span className="scoreboard-sep">:</span>
            {m.goalsAgainst ?? '–'}
          </span>
          <span className="scoreboard-team">
            {rival ? <Link to={`/rivales/${rival.id}`}>{rival.name}</Link> : rivalName}
          </span>
        </div>
        <p className="center scoreboard-outcome">
          <span aria-hidden="true"><OutcomeBadge outcome={m.outcome} /></span>
          <span>{m.outcome ? OUTCOME_LABEL[m.outcome] : 'Resultado sin dato'}</span>
        </p>
        {(m.goalsFor == null || m.goalsAgainst == null) && (
          <p className="muted small center">
            La base no tiene el marcador completo
            {m.outcomeSource === 'campo_final' && m.outcome ? `; figura como ${OUTCOME_LABEL[m.outcome].toLowerCase()}` : ''}.
          </p>
        )}
        <p className="center small scoreboard-date">
          <span className="capitalize">{formatLongDate(m.date)}</span> · {formatTime(m.date)} h
        </p>
      </section>

      {m.media && (
        <DriveFolderButton
          url={m.media.folderUrl}
          label="📷 Fotos y videos del partido"
          note={m.media.source === 'inferred_by_date_and_rival' ? 'Carpeta asociada por fecha y rival.' : undefined}
        />
      )}

      <h2 className="section-title">Goles</h2>
      {m.goals.length === 0 && missingGoals <= 0 ? (
        <p className="muted card">{m.goalsFor === 0 ? 'No hubo goles de Les Molestes.' : 'Sin goles cargados.'}</p>
      ) : (
        <ul className="list">
          {m.goals.map((g) => (
            <li key={g.id} className="goal-row">
              <span className="goal-ball" aria-hidden="true">⚽</span>
              <span className="row-main">
                <span>
                  {g.ownGoal ? <span>Gol en contra <span className="muted">(del rival)</span></span> : <PlayerLink id={g.playerId} base={base} />}
                  {g.penalty && <span className="tag">Penal</span>}
                  {g.freeKick && <span className="tag">Tiro libre</span>}
                </span>
                {(g.assistId || g.period || g.scoreAfter) && (
                  <span className="muted small">
                    {[
                      g.assistId ? <span key="a">Asistencia: <PlayerLink id={g.assistId} base={base} /></span> : null,
                      g.period ? <span key="p">{g.period}</span> : null,
                      g.scoreAfter ? <span key="s" className="tabular">{g.scoreAfter}</span> : null,
                    ]
                      .filter(Boolean)
                      .reduce<React.ReactNode[]>((acc, el, i) => (i ? [...acc, ' · ', el] : [el]), [])}
                  </span>
                )}
              </span>
              {g.video && (
                <button
                  type="button"
                  className="btn btn-small"
                  onClick={() =>
                    play({ video: g.video!, title: goalTitle(g), subtitle: `vs ${rivalName} · ${formatDate(m.date)}` })
                  }
                >
                  ▶ Ver gol
                </button>
              )}
            </li>
          ))}
          {missingGoals > 0 && (
            <li className="goal-row muted">
              <span className="goal-ball" aria-hidden="true">⚽</span>
              <span className="row-main">{plural(missingGoals, 'gol sin autor cargado', 'goles sin autor cargado')}</span>
            </li>
          )}
        </ul>
      )}

      {(m.yellowCards.length > 0 || m.redCards.length > 0) && (
        <>
          <h2 className="section-title">Tarjetas</h2>
          <ul className="list">
            {m.redCards.map((c, i) => (
              <li key={`r${i}`} className="goal-row">
                <span className="card-icon red" aria-label="Roja" />
                <span className="row-main">
                  <PlayerLink id={c.playerId} base={base} />
                  <span className="muted small">Roja{c.kind ? ` · ${c.kind.toLowerCase()}` : ''}</span>
                </span>
              </li>
            ))}
            {m.yellowCards.map((c, i) => (
              <li key={`y${i}`} className="goal-row">
                <span className="card-icon yellow" aria-label="Amarilla" />
                <span className="row-main">
                  <PlayerLink id={c.playerId} base={base} />
                  <span className="muted small">Amarilla</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="section-title">Equipo</h2>
      <Lineup m={m} base={base} />

      <h2 className="section-title">Datos del partido</h2>
      <dl className="card facts">
        <div><dt>Circuito</dt><dd>{circuit?.name ?? 'sin dato'}</dd></div>
        <div><dt>Torneo</dt><dd>{tour?.name ?? 'sin dato'}</dd></div>
        <div><dt>{m.cupRound ? 'Fase' : 'Fecha'}</dt><dd>{m.cupRound ?? m.matchday ?? 'sin dato'}</dd></div>
        <div><dt>Cancha</dt><dd>{court ? `Cancha ${court.number}` : 'sin dato'}</dd></div>
        <div><dt>Camiseta</dt><dd>{shirt?.name ?? 'sin dato'}</dd></div>
        <div><dt>Arquero</dt><dd><PlayerLink id={m.goalkeeperId} base={base} /></dd></div>
        <div><dt>Esquema</dt><dd>{m.formation ?? 'sin dato'}</dd></div>
        <div><dt>Clima</dt><dd>{m.weather ?? 'sin dato'}</dd></div>
      </dl>

      {m.notes && (
        <>
          <h2 className="section-title">Notas de la base</h2>
          <p className="card pre-line">{m.notes}</p>
        </>
      )}

      <nav className="pager" aria-label="Otros partidos">
        {older ? (
          <Link to={`/partidos/${older.id}`} className="btn btn-soft" replace>
            ‹ Anterior
          </Link>
        ) : <span />}
        {newer ? (
          <Link to={`/partidos/${newer.id}`} className="btn btn-soft" replace>
            Siguiente ›
          </Link>
        ) : <span />}
      </nav>
    </>
  )
}

function Lineup({ m, base }: { m: M; base: Base }) {
  const [open, setOpen] = useState(true)
  if (!m.starters.length && !m.bench.length) return <p className="muted card">Alineación sin dato.</p>
  const names = (ids: number[]) =>
    ids
      .map((id) => base.players.get(id))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .sort((a, b) => (a.id === m.goalkeeperId ? -1 : b.id === m.goalkeeperId ? 1 : a.name.localeCompare(b.name)))
  return (
    <div className="card lineup">
      <button type="button" className="lineup-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {m.starters.length} titulares · {m.bench.length} suplentes {open ? '▴' : '▾'}
      </button>
      {open && (
        <div className="lineup-cols">
          <div>
            <p className="card-label">Titulares</p>
            <ul>
              {names(m.starters).map((p) => (
                <li key={p.id}>
                  <Link to={`/jugadores/${p.id}`}>{p.name}</Link>
                  {p.id === m.goalkeeperId && <span className="tag">Arq.</span>}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="card-label">Suplentes</p>
            {m.bench.length ? (
              <ul>
                {names(m.bench).map((p) => (
                  <li key={p.id}>
                    <Link to={`/jugadores/${p.id}`}>{p.name}</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">Sin suplentes cargados</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
