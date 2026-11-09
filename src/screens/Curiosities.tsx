import { Link } from 'react-router-dom'
import { RecordInline, Stat, StatGrid } from '../components/Bits'
import { MatchRow } from '../components/MatchRow'
import { Page } from '../components/Page'
import { Async } from '../components/States'
import { api, loadBase, useData, type Base } from '../lib/data'
import { formatDate, formatScore, winRate } from '../lib/format'
import type { MatchSummary, Record } from '../lib/types'

interface Group {
  key: string | number
  label: string | number
  record: Record
}
interface Streak {
  length: number
  fromMatchId: number | null
  toMatchId: number | null
}
interface Curiosities {
  toletole: { matchIds: number[]; record: Record; meaningConfirmed: boolean }
  cacoLevel: { byLevel: Group[]; teams: { teamId: number; name: string; level: string }[]; meaningConfirmed: boolean }
  byWeather: Group[]
  byShirt: Group[]
  byFormation: Group[]
  biggestWin: number
  biggestLoss: number
  mostGoalsMatch: number
  longestWinStreak: Streak
  longestUnbeatenStreak: Streak
  hatTricks: { matchId: number; playerId: number; name: string; goals: number }[]
  penaltyGoals: number
  freeKickGoals: number
  ownGoalsByRivals: number
}

export default function CuriositiesScreen() {
  const state = useData(() => Promise.all([api.stats(), api.matches(), loadBase()]), [])
  return (
    <Page title="Datos curiosos" back>
      <Async state={state}>
        {([stats, matches, base]) => <Body c={stats.curiosities as Curiosities} matches={matches} base={base} />}
      </Async>
    </Page>
  )
}

function GroupTable({ title, groups, note }: { title: string; groups: Group[]; note?: string }) {
  return (
    <>
      <h2 className="section-title">{title}</h2>
      <ul className="list">
        {groups.map((g) => (
          <li key={g.key} className="row static">
            <span className="row-main">
              <span>{g.label}</span>
              <span className="muted small"><RecordInline r={g.record} /></span>
            </span>
            <span className="row-value tabular">{winRate(g.record)} %<small>ganados</small></span>
          </li>
        ))}
      </ul>
      {note && <p className="muted small note">{note}</p>}
    </>
  )
}

function Body({ c, matches, base }: { c: Curiosities; matches: MatchSummary[]; base: Base }) {
  const byId = new Map(matches.map((m) => [m.id, m]))
  const feat = (id: number) => byId.get(id)
  const streakText = (s: Streak) => {
    const a = s.fromMatchId ? feat(s.fromMatchId) : undefined
    const b = s.toMatchId ? feat(s.toMatchId) : undefined
    return a && b ? `del ${formatDate(a.date)} al ${formatDate(b.date)}` : ''
  }
  const toletole = c.toletole.matchIds.map((id) => byId.get(id)).filter((m): m is MatchSummary => !!m)
  const hatByPlayer = new Map<string, number>()
  c.hatTricks.forEach((h) => hatByPlayer.set(h.name, (hatByPlayer.get(h.name) ?? 0) + 1))
  const topHat = c.hatTricks[0]

  return (
    <>
      <StatGrid>
        <Stat label="Racha ganando" value={c.longestWinStreak.length} tone="win" />
        <Stat label="Racha invicta" value={c.longestUnbeatenStreak.length} tone="win" />
        <Stat label="Hat-tricks" value={c.hatTricks.length} tone="accent" />
        <Stat label="Goles de penal" value={c.penaltyGoals} />
        <Stat label="De tiro libre" value={c.freeKickGoals} />
        <Stat label="En contra del rival" value={c.ownGoalsByRivals} />
      </StatGrid>
      <p className="muted small note">
        Racha ganando: {c.longestWinStreak.length} partidos seguidos, {streakText(c.longestWinStreak)}. Racha invicta:{' '}
        {c.longestUnbeatenStreak.length} sin perder, {streakText(c.longestUnbeatenStreak)}.
      </p>

      <h2 className="section-title">Partidos para el recuerdo</h2>
      <ul className="list">
        {[
          ['Goleada más grande', c.biggestWin],
          ['Derrota más dura', c.biggestLoss],
          ['Partido con más goles', c.mostGoalsMatch],
        ].map(([label, id]) => {
          const m = feat(id as number)
          if (!m) return null
          return (
            <li key={label}>
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
        })}
      </ul>

      {topHat && (
        <>
          <h2 className="section-title">Hat-tricks (3 goles o más)</h2>
          <ul className="list">
            {Array.from(hatByPlayer.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([name, n]) => {
                const pid = c.hatTricks.find((h) => h.name === name)!.playerId
                return (
                  <li key={name}>
                    <Link to={`/jugadores/${pid}`} className="row">
                      <span className="row-main">{name}</span>
                      <span className="row-value tabular">{n}<small>{n === 1 ? 'vez' : 'veces'}</small></span>
                    </Link>
                  </li>
                )
              })}
          </ul>
          <p className="muted small note">
            Récord: {topHat.goals} goles de {topHat.name} en un partido (
            <Link to={`/partidos/${topHat.matchId}`}>{feat(topHat.matchId) ? formatDate(feat(topHat.matchId)!.date) : 'ver'}</Link>).
          </p>
        </>
      )}

      <GroupTable title="Según la camiseta" groups={c.byShirt} note="Solo partidos con camiseta cargada." />
      <GroupTable title="Según el clima" groups={c.byWeather} note="Solo partidos con clima cargado." />
      <GroupTable title="Según el esquema inicial" groups={c.byFormation} />

      <GroupTable
        title="Según el nivel caco del rival"
        groups={c.cacoLevel.byLevel}
        note={`Campo "caco_level" de la base, cargado en ${c.cacoLevel.teams.length} rivales.`}
      />

      <h2 className="section-title">Partidos marcados como "toletole"</h2>
      <p className="muted small note">
        Campo "toletole" de la base: {toletole.length} partidos · <RecordInline r={c.toletole.record} />
      </p>
      <ul className="list">
        {toletole.map((m) => (
          <MatchRow key={m.id} m={m} base={base} />
        ))}
      </ul>
    </>
  )
}
