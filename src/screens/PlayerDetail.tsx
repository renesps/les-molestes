import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Stat, StatGrid } from '../components/Bits'
import { MatchRow } from '../components/MatchRow'
import { Page } from '../components/Page'
import { Async, Empty } from '../components/States'
import { usePlayVideo } from '../components/VideoModal'
import { api, loadBase, useData, type Base } from '../lib/data'
import { formatDate } from '../lib/format'
import type { MatchSummary, Player, Stats } from '../lib/types'
import { initials } from './Players'

export default function PlayerDetail() {
  const id = Number(useParams().id)
  const state = useData(() => Promise.all([loadBase(), api.matches(), api.stats()]), [])
  return (
    <Async state={state}>
      {([base, matches, stats]) => {
        const p = base.players.get(id)
        if (!p)
          return (
            <Page title="Jugador" back>
              <Empty title="Jugador no encontrado" />
            </Page>
          )
        return (
          <Page title={p.name} back>
            <Profile p={p} base={base} matches={matches} stats={stats} />
          </Page>
        )
      }}
    </Async>
  )
}

function Profile({ p, base, matches, stats }: { p: Player; base: Base; matches: MatchSummary[]; stats: Stats }) {
  const play = usePlayVideo()
  const [showAll, setShowAll] = useState(false)
  const byId = new Map(matches.map((m) => [m.id, m]))
  const played = p.matchIds.map((id) => byId.get(id)).filter((m): m is MatchSummary => !!m).reverse()
  const rank = stats.rankings.scorers.findIndex((r) => r.playerId === p.id)

  // goles por año (de los rankings por año)
  const perYear = Object.entries(stats.rankings.scorersByYear)
    .map(([y, rows]) => ({ y, n: rows.find((r) => r.playerId === p.id)?.value ?? 0 }))
    .filter((x) => p.years.includes(Number(x.y)))
  const maxYear = Math.max(1, ...perYear.map((x) => x.n))

  const years = p.firstYear ? (p.firstYear === p.lastYear ? `${p.firstYear}` : `${p.firstYear} – ${p.lastYear}`) : 'sin dato'
  const circuits = p.circuits.map((c) => base.circuits.get(c)?.name).filter(Boolean).join(' · ')

  return (
    <>
      <section className="profile">
        <span className="avatar avatar-lg" aria-hidden="true">{initials(p.name)}</span>
        <div>
          <p className="profile-name">{p.name}</p>
          <p className="muted small">
            {p.number != null && <>Camiseta {p.number} · </>}
            {years}
          </p>
          {circuits && <p className="muted small">{circuits}</p>}
        </div>
      </section>

      <StatGrid>
        <Stat label="Partidos" value={p.matches} />
        <Stat label="Goles" value={p.goals} tone="win" />
        <Stat label="Asistencias" value={p.assists} />
        <Stat label="Titular" value={p.starts} />
        <Stat label="Suplente" value={p.benchApps} />
        <Stat label="Prom. gol" value={p.matches ? (p.goals / p.matches).toFixed(2).replace('.', ',') : '–'} />
        <Stat label="Amarillas" value={p.yellowCards} />
        <Stat label="Rojas" value={p.redCards} tone={p.redCards ? 'loss' : undefined} />
        <Stat label="Penales / T. libre" value={`${p.penaltyGoals} / ${p.freeKickGoals}`} />
      </StatGrid>
      {rank >= 0 && p.goals > 0 && (
        <p className="muted small center note">
          Puesto {rank + 1} entre los goleadores históricos ·{' '}
          <Link to="/jugadores?vista=rankings">ver ranking</Link>
        </p>
      )}

      {p.goalkeeper && (
        <>
          <h2 className="section-title">Como arquero</h2>
          <StatGrid>
            <Stat label="Partidos" value={p.goalkeeper.matches} />
            <Stat label="Vallas invictas" value={p.goalkeeper.cleanSheets} tone="win" />
            <Stat label="Goles en contra" value={p.goalkeeper.goalsAgainst} />
          </StatGrid>
        </>
      )}

      {perYear.some((x) => x.n > 0) && (
        <>
          <h2 className="section-title">Goles por año</h2>
          <div className="card bars" role="img" aria-label={perYear.map((x) => `${x.y}: ${x.n}`).join(', ')}>
            {perYear.map((x) => (
              <div key={x.y} className="bar-row">
                <span className="tabular muted small">{x.y}</span>
                <span className="bar-track">
                  <span className="bar" style={{ width: `${(x.n / maxYear) * 100}%` }} />
                </span>
                <span className="tabular small bar-val">{x.n}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {p.videoGoals.length > 0 && (
        <>
          <h2 className="section-title">Goles en video ({p.videoGoals.length})</h2>
          <VideoGoals p={p} base={base} byId={byId} onPlay={play} />
        </>
      )}

      <h2 className="section-title">Partidos ({played.length})</h2>
      {played.length === 0 ? (
        <Empty title="Sin partidos cargados" />
      ) : (
        <>
          <ul className="list">
            {(showAll ? played : played.slice(0, 10)).map((m) => (
              <MatchRow key={m.id} m={m} base={base} />
            ))}
          </ul>
          {played.length > 10 && (
            <button type="button" className="btn btn-soft btn-block more-btn" onClick={() => setShowAll((s) => !s)}>
              {showAll ? 'Ver menos' : `Ver los ${played.length}`}
            </button>
          )}
        </>
      )}
    </>
  )
}

function VideoGoals({
  p,
  base,
  byId,
  onPlay,
}: {
  p: Player
  base: Base
  byId: Map<number, MatchSummary>
  onPlay: ReturnType<typeof usePlayVideo>
}) {
  const [loading, setLoading] = useState<number | null>(null)
  const list = [...p.videoGoals].sort((a, b) => (byId.get(b.matchId)?.date ?? '').localeCompare(byId.get(a.matchId)?.date ?? ''))
  return (
    <ul className="list">
      {list.map((vg) => {
        const m = byId.get(vg.matchId)
        const rival = m ? base.teams.get(m.rivalId)?.name : undefined
        return (
          <li key={vg.goalId}>
            <button
              type="button"
              className="row"
              disabled={loading === vg.goalId}
              onClick={async () => {
                setLoading(vg.goalId)
                try {
                  const detail = await api.match(vg.matchId)
                  const g = detail.goals.find((x) => x.id === vg.goalId)
                  if (g?.video) onPlay({ video: g.video, title: p.name, subtitle: `vs ${rival ?? 'sin dato'} · ${m ? formatDate(m.date) : ''}` })
                } finally {
                  setLoading(null)
                }
              }}
            >
              <span className="play-dot" aria-hidden="true">▶</span>
              <span className="row-main">
                <span>vs {rival ?? 'sin dato'}</span>
                <span className="muted small tabular">{m ? formatDate(m.date) : ''}</span>
              </span>
              {loading === vg.goalId && <span className="spinner spinner-sm" aria-label="Cargando" />}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
