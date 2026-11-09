import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { norm, SearchBox, Segmented } from '../components/Bits'
import { IconChevron } from '../components/Icons'
import { Page } from '../components/Page'
import { Async, Empty } from '../components/States'
import { api, loadBase, useData, type Base } from '../lib/data'
import { withRanks } from '../lib/stats'
import type { Player, RankingRow, Stats } from '../lib/types'

type View = 'lista' | 'rankings'
type Sort = 'goles' | 'partidos' | 'nombre'

export default function Players() {
  const state = useData(() => Promise.all([api.players(), api.stats(), loadBase()]), [])
  const [params, setParams] = useSearchParams()
  const view = (params.get('vista') as View) || 'lista'
  const setView = (v: View) => {
    const next = new URLSearchParams(params)
    if (v === 'lista') next.delete('vista')
    else next.set('vista', v)
    setParams(next, { replace: true })
  }
  return (
    <Page title="Jugadores">
      <Segmented<View>
        label="Vista"
        value={view}
        onChange={setView}
        options={[
          { value: 'lista', label: 'Plantel' },
          { value: 'rankings', label: 'Rankings' },
        ]}
      />
      <Async state={state}>
        {([players, stats, base]) =>
          view === 'lista' ? <List players={players} /> : <Rankings stats={stats} base={base} />
        }
      </Async>
    </Page>
  )
}

function years(p: Player) {
  if (!p.firstYear) return 'sin partidos'
  return p.firstYear === p.lastYear ? String(p.firstYear) : `${p.firstYear}–${p.lastYear}`
}

function List({ players }: { players: Player[] }) {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const sort = (params.get('orden') as Sort) || 'goles'
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    setParams(next, { replace: true })
  }
  const list = useMemo(() => {
    const nq = norm(q.trim())
    const l = players.filter((p) => !nq || norm(p.name).includes(nq))
    const by: { [k in Sort]: (a: Player, b: Player) => number } = {
      goles: (a, b) => b.goals - a.goals || b.matches - a.matches,
      partidos: (a, b) => b.matches - a.matches || b.goals - a.goals,
      nombre: (a, b) => a.name.localeCompare(b.name, 'es'),
    }
    return l.sort((a, b) => by[sort](a, b) || a.name.localeCompare(b.name, 'es'))
  }, [players, q, sort])

  return (
    <>
      <div className="filters">
        <SearchBox value={q} onChange={(v) => set('q', v)} placeholder="Buscar jugador" />
        <Segmented<Sort>
          label="Ordenar por"
          value={sort}
          onChange={(v) => set('orden', v === 'goles' ? '' : v)}
          options={[
            { value: 'goles', label: 'Goles' },
            { value: 'partidos', label: 'Partidos' },
            { value: 'nombre', label: 'A–Z' },
          ]}
        />
      </div>
      {list.length === 0 ? (
        <Empty title="No hay jugadores con ese nombre" />
      ) : (
        <ul className="list">
          {list.map((p) => (
            <li key={p.id}>
              <Link to={`/jugadores/${p.id}`} className="row">
                <span className="avatar" aria-hidden="true">{initials(p.name)}</span>
                <span className="row-main">
                  <span>{p.name}</span>
                  <span className="muted small tabular">
                    {years(p)} · {p.matches} PJ
                  </span>
                </span>
                <span className="row-value tabular" aria-label={`${p.goals} goles`}>
                  {p.goals}
                  <small>goles</small>
                </span>
                <IconChevron />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export function initials(name: string) {
  return name
    .replace(/\(.*?\)/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

type RankKind = 'goles' | 'asistencias' | 'partidos' | 'arqueros' | 'tarjetas'

function Rankings({ stats, base }: { stats: Stats; base: Base }) {
  const [params, setParams] = useSearchParams()
  const kind = (params.get('r') as RankKind) || 'goles'
  const scope = params.get('ambito') ?? 'total' // total | c<id> | y<año> | t<id>
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    next.set(k, v)
    if (k === 'r') next.delete('ambito')
    setParams(next, { replace: true })
  }
  const r = stats.rankings

  let rows: RankingRow[] = []
  let unit = 'goles'
  if (kind === 'goles') {
    if (scope === 'total') rows = r.scorers
    else if (scope.startsWith('c')) rows = r.scorersByCircuit[scope.slice(1)] ?? []
    else if (scope.startsWith('y')) rows = r.scorersByYear[scope.slice(1)] ?? []
    else if (scope.startsWith('t')) rows = r.scorersByTournament[scope.slice(1)] ?? []
  } else if (kind === 'asistencias') {
    rows = r.assists
    unit = 'asist.'
  } else if (kind === 'partidos') {
    rows = r.appearances
    unit = 'PJ'
  } else if (kind === 'tarjetas') {
    const reds = new Map(r.redCards.map((x) => [x.playerId, x.value]))
    const ids = new Set([...r.yellowCards.map((x) => x.playerId), ...reds.keys()])
    const yel = new Map(r.yellowCards.map((x) => [x.playerId, x.value]))
    rows = Array.from(ids)
      .map((id) => ({ playerId: id, name: base.players.get(id)?.name ?? '', value: (yel.get(id) ?? 0) + (reds.get(id) ?? 0) }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
    unit = 'tarj.'
  }

  const tours = Array.from(base.tournaments.values())
    .filter((t) => t.matchIds.length)
    .sort((a, b) => b.year - a.year || b.edition - a.edition)
  const yearsList = Object.keys(r.scorersByYear).sort().reverse()

  return (
    <>
      <div className="chips scroll-x" role="group" aria-label="Ranking">
        {(
          [
            ['goles', 'Goleadores'],
            ['asistencias', 'Asistencias'],
            ['partidos', 'Presencias'],
            ['arqueros', 'Arqueros'],
            ['tarjetas', 'Tarjetas'],
          ] as [RankKind, string][]
        ).map(([k, l]) => (
          <button key={k} type="button" className={`chip${kind === k ? ' is-on' : ''}`} aria-pressed={kind === k} onClick={() => set('r', k)}>
            {l}
          </button>
        ))}
      </div>

      {kind === 'goles' && (
        <label className="select">
          <span className="visually-hidden">Ámbito</span>
          <select value={scope} onChange={(e) => set('ambito', e.target.value)}>
            <option value="total">Históricos (todo)</option>
            <optgroup label="Por circuito">
              {Array.from(base.circuits.values()).map((c) => (
                <option key={c.id} value={`c${c.id}`}>{c.name}</option>
              ))}
            </optgroup>
            <optgroup label="Por año">
              {yearsList.map((y) => (
                <option key={y} value={`y${y}`}>{y}</option>
              ))}
            </optgroup>
            <optgroup label="Por torneo">
              {tours.map((t) => (
                <option key={t.id} value={`t${t.id}`}>{t.name}</option>
              ))}
            </optgroup>
          </select>
        </label>
      )}

      {kind === 'arqueros' ? (
        <ul className="list rank-list">
          {r.goalkeepers.map((g, i) => (
            <li key={g.playerId}>
              <Link to={`/jugadores/${g.playerId}`} className="row">
                <span className="rank tabular">{i + 1}</span>
                <span className="row-main">
                  <span>{g.name}</span>
                  <span className="muted small tabular">
                    {g.cleanSheets} vallas invictas · {(g.goalsAgainst / g.matches).toFixed(1).replace('.', ',')} goles en contra por partido
                  </span>
                </span>
                <span className="row-value tabular">{g.matches}<small>PJ</small></span>
              </Link>
            </li>
          ))}
        </ul>
      ) : rows.length === 0 ? (
        <Empty title="Sin datos para este ranking" />
      ) : (
        <ul className="list rank-list">
          {withRanks(rows, (x) => x.value).map(({ rank, item }) => (
            <li key={item.playerId}>
              <Link to={`/jugadores/${item.playerId}`} className="row">
                <span className={`rank tabular${rank <= 3 ? ' top' : ''}`}>{rank}</span>
                <span className="row-main">{item.name}</span>
                <span className="row-value tabular">{item.value}<small>{unit}</small></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {kind === 'goles' && <p className="muted small center note">No incluye los goles en contra de rivales ni los goles sin autor cargado.</p>}
    </>
  )
}
