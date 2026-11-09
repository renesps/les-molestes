import { Link, useParams, useSearchParams } from 'react-router-dom'
import { norm, RecordCard, RecordInline, SearchBox, Segmented } from '../components/Bits'
import { IconChevron } from '../components/Icons'
import { MatchRow } from '../components/MatchRow'
import { Page } from '../components/Page'
import { Async, Empty } from '../components/States'
import { api, loadBase, useData } from '../lib/data'
import type { Team } from '../lib/types'

type Sort = 'partidos' | 'nombre' | 'ganados' | 'perdidos'

export function Rivals() {
  const state = useData(() => api.teams(), [])
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const sort = (params.get('orden') as Sort) || 'partidos'
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    setParams(next, { replace: true })
  }
  return (
    <Page title="Rivales" back>
      <Async state={state}>
        {(teams) => {
          const nq = norm(q.trim())
          const by: { [k in Sort]: (a: Team, b: Team) => number } = {
            partidos: (a, b) => b.record.played - a.record.played,
            nombre: (a, b) => a.name.localeCompare(b.name, 'es'),
            ganados: (a, b) => b.record.won - a.record.won,
            perdidos: (a, b) => b.record.lost - a.record.lost,
          }
          const list = teams
            .filter((t) => t.record.played > 0 && (!nq || norm(t.name).includes(nq)))
            .sort((a, b) => by[sort](a, b) || a.name.localeCompare(b.name, 'es'))
          return (
            <>
              <div className="filters">
                <SearchBox value={q} onChange={(v) => set('q', v)} placeholder="Buscar rival" />
                <Segmented<Sort>
                  label="Ordenar por"
                  value={sort}
                  onChange={(v) => set('orden', v === 'partidos' ? '' : v)}
                  options={[
                    { value: 'partidos', label: 'Jugados' },
                    { value: 'ganados', label: 'Ganados' },
                    { value: 'perdidos', label: 'Perdidos' },
                    { value: 'nombre', label: 'A–Z' },
                  ]}
                />
              </div>
              <p className="result-summary muted small">{list.length} rivales</p>
              {list.length === 0 ? (
                <Empty title="No hay rivales con ese nombre" />
              ) : (
                <ul className="list">
                  {list.map((t) => (
                    <li key={t.id}>
                      <Link to={`/rivales/${t.id}`} className="row">
                        <span className="row-main">
                          <span>{t.name}</span>
                          <span className="muted small"><RecordInline r={t.record} /></span>
                        </span>
                        <span className="row-value tabular small">
                          {t.record.goalsFor}–{t.record.goalsAgainst}
                        </span>
                        <IconChevron />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )
        }}
      </Async>
    </Page>
  )
}

export function RivalDetail() {
  const id = Number(useParams().id)
  const state = useData(() => Promise.all([loadBase(), api.matches()]), [])
  return (
    <Async state={state}>
      {([base, matches]) => {
        const t = base.teams.get(id)
        if (!t)
          return (
            <Page title="Rival" back>
              <Empty title="Rival no encontrado" />
            </Page>
          )
        const ids = new Set(t.matchIds)
        const ms = matches.filter((m) => ids.has(m.id))
        return (
          <Page title={t.name} back>
            <RecordCard r={t.record} title={`Historial contra ${t.name}`} />
            <h2 className="section-title">Partidos</h2>
            <ul className="list">
              {ms.map((m) => (
                <MatchRow key={m.id} m={m} base={base} />
              ))}
            </ul>
          </Page>
        )
      }}
    </Async>
  )
}
