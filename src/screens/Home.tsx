import { Link } from 'react-router-dom'
import { Page } from '../components/Page'
import { Async } from '../components/States'
import { IconChevron } from '../components/Icons'
import { api, useData } from '../lib/data'
import { formatDate, formatScore, goalDiff, OUTCOME_SHORT, winRate } from '../lib/format'
import type { MatchSummary, Team, Tournament } from '../lib/types'

const CLUB = 'Club Social y Deportivo Les Molestes'

export default function Home() {
  const state = useData(
    () => Promise.all([api.stats(), api.matches(), api.teams(), api.tournaments(), api.titles()]),
    [],
  )
  return (
    <Page title={CLUB} hideTitle>
      <Async state={state}>
        {([stats, matches, teams, tours, titles]) => {
          const o = stats.overall
          const last = matches[0]
          const lastVideo = matches.find((m) => m.videoGoals > 0)
          const teamName = new Map(teams.map((t) => [t.id, t.name]))
          const tourById = new Map(tours.tournaments.map((t) => [t.id, t]))
          const top = stats.rankings.scorers[0]
          return (
            <>
              <section className="hero" aria-label="Escudo">
                <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Escudo de Les Molestes" width="96" height="144" />
                <div>
                  <p className="hero-name display">
                    Club Social y Deportivo
                    <br />
                    Les Molestes
                  </p>
                  <p className="muted">Historia del equipo desde 2016</p>
                </div>
              </section>

              <h2 className="section-title">Récord histórico</h2>
              <div className="card">
                <dl className="record tabular">
                  <div><dt>PJ</dt><dd>{o.played}</dd></div>
                  <div className="win"><dt>G</dt><dd>{o.won}</dd></div>
                  <div className="draw"><dt>E</dt><dd>{o.drawn}</dd></div>
                  <div className="loss"><dt>P</dt><dd>{o.lost}</dd></div>
                </dl>
                <p className="record-goals tabular">
                  <span>{o.goalsFor} goles a favor</span>
                  <span>{o.goalsAgainst} en contra</span>
                  <span>({goalDiff(o)})</span>
                </p>
                <p className="muted small">{winRate(o)} % de partidos ganados</p>
              </div>

              {last && (
                <>
                  <h2 className="section-title">Último partido cargado</h2>
                  <MatchCard m={last} rival={teamName.get(last.rivalId)} tour={tourById.get(last.tournamentId)} />
                </>
              )}

              <h2 className="section-title">Accesos rápidos</h2>
              <ul className="list">
                {top && (
                  <li>
                    <Link to="/estadisticas" className="row">
                      <span className="row-main">
                        <span>Goleadores</span>
                        <span className="muted small">{top.name}, {top.value} goles</span>
                      </span>
                      <IconChevron />
                    </Link>
                  </li>
                )}
                <li>
                  <Link to="/titulos" className="row">
                    <span className="row-main">
                      <span>Títulos</span>
                      <span className="muted small accent">{'★'.repeat(titles.length)} {titles.map((t) => t.label).join(' · ')}</span>
                    </span>
                    <IconChevron />
                  </Link>
                </li>
                {lastVideo && (
                  <li>
                    <Link to={`/partidos/${lastVideo.id}`} className="row">
                      <span className="row-main">
                        <span>Último gol en video</span>
                        <span className="muted small">
                          {formatDate(lastVideo.date)} vs {teamName.get(lastVideo.rivalId) ?? 'sin dato'}
                        </span>
                      </span>
                      <IconChevron />
                    </Link>
                  </li>
                )}
              </ul>
            </>
          )
        }}
      </Async>
    </Page>
  )
}

export function MatchCard({ m, rival, tour }: { m: MatchSummary; rival?: string; tour?: Tournament | Team }) {
  return (
    <Link to={`/partidos/${m.id}`} className="card match-card">
      <div className="match-card-top">
        <span className="muted small tabular">{formatDate(m.date)}</span>
        {m.outcome && <span className={`badge badge-${m.outcome}`} aria-label={m.outcome}>{OUTCOME_SHORT[m.outcome]}</span>}
      </div>
      <p className="match-card-score">
        <span className="match-card-rival">vs {rival ?? 'sin dato'}</span>
        <span className="tabular">{formatScore(m.goalsFor, m.goalsAgainst)}</span>
      </p>
      {tour && <p className="muted small">{tour.name}{m.matchday ? ` · Fecha ${m.matchday}` : m.cupRound ? ` · ${m.cupRound}` : ''}</p>}
    </Link>
  )
}
