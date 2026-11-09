import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type Base } from '../lib/data'
import type { PlayerGoal } from '../lib/explore'
import { formatDate } from '../lib/format'
import type { MatchSummary } from '../lib/types'
import { usePlayVideo } from './VideoModal'

/** Lista de goles de un jugador (más nuevos primero), con "Ver gol" si hay video. */
export function GoalList({
  goals,
  base,
  byId,
  playerName,
  limit = 10,
}: {
  goals: PlayerGoal[]
  base: Base
  byId: Map<number, MatchSummary>
  playerName: string
  limit?: number
}) {
  const play = usePlayVideo()
  const [all, setAll] = useState(false)
  const [onlyVideo, setOnlyVideo] = useState(false)
  const [loading, setLoading] = useState<number | null>(null)
  const sorted = [...goals]
    .filter((g) => !onlyVideo || g.video)
    .sort((a, b) => (byId.get(b.matchId)?.date ?? '').localeCompare(byId.get(a.matchId)?.date ?? '') || b.goalId - a.goalId)
  const shown = all ? sorted : sorted.slice(0, limit)
  const withVideo = goals.filter((g) => g.video).length

  const openVideo = async (g: PlayerGoal, rival: string, date: string) => {
    setLoading(g.goalId)
    try {
      const d = await api.match(g.matchId)
      const v = d.goals.find((x) => x.id === g.goalId)?.video
      if (v) play({ video: v, title: playerName, subtitle: `vs ${rival} · ${date}` })
    } finally {
      setLoading(null)
    }
  }

  if (!goals.length) return <p className="card muted">Sin goles en esta selección.</p>
  return (
    <>
      {withVideo > 0 && (
        <div className="chips list-tools">
          <button type="button" className={`chip${onlyVideo ? ' is-on' : ''}`} aria-pressed={onlyVideo} onClick={() => setOnlyVideo((v) => !v)}>
            ▶ Solo con video ({withVideo})
          </button>
        </div>
      )}
      <ul className="list">
        {shown.map((g) => {
          const m = byId.get(g.matchId)
          const rival = m ? base.teams.get(m.rivalId)?.name ?? 'sin dato' : 'sin dato'
          const date = m ? formatDate(m.date) : ''
          const assist = g.assistId ? base.players.get(g.assistId)?.name : undefined
          return (
            <li key={g.goalId} className="goal-row">
              <span className="goal-ball" aria-hidden="true">⚽</span>
              <span className="row-main">
                <Link to={`/partidos/${g.matchId}`}>vs {rival}</Link>
                <span className="muted small tabular">
                  {date}
                  {assist && ` · asist. ${assist}`}
                  {g.penalty && ' · penal'}
                  {g.freeKick && ' · tiro libre'}
                </span>
              </span>
              {g.video && (
                <button
                  type="button"
                  className="btn btn-small"
                  disabled={loading === g.goalId}
                  onClick={() => openVideo(g, rival, date)}
                >
                  {loading === g.goalId ? '…' : '▶ Ver gol'}
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {sorted.length > limit && (
        <button type="button" className="btn btn-soft btn-block more-btn" onClick={() => setAll((a) => !a)}>
          {all ? 'Ver menos' : `Ver los ${sorted.length} goles`}
        </button>
      )}
    </>
  )
}

/** Lista de partidos con "ver todos". */
export function ExpandableList<T>({
  items,
  limit = 10,
  render,
  noun = 'partidos',
}: {
  items: T[]
  limit?: number
  render: (t: T) => React.ReactNode
  noun?: string
}) {
  const [all, setAll] = useState(false)
  return (
    <>
      <ul className="list">{(all ? items : items.slice(0, limit)).map(render)}</ul>
      {items.length > limit && (
        <button type="button" className="btn btn-soft btn-block more-btn" onClick={() => setAll((a) => !a)}>
          {all ? 'Ver menos' : `Ver los ${items.length} ${noun}`}
        </button>
      )}
    </>
  )
}
