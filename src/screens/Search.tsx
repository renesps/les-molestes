import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { RecordCard, RecordInline, SearchBox, Stat, StatGrid } from '../components/Bits'
import { ExpandableList } from '../components/GoalList'
import { IconChevron } from '../components/Icons'
import { MatchRow } from '../components/MatchRow'
import { Page } from '../components/Page'
import { Async, Empty } from '../components/States'
import { api, loadBase, useData, type Base } from '../lib/data'
import { clubStats, FILTER_PARAM, playerStats, scopeMatches, type Fact, type Filters } from '../lib/explore'
import { featured, KIND_FILTER, KIND_LABEL, KIND_SINGULAR, search, type Hit, type Kind } from '../lib/search'
import type { MatchSummary } from '../lib/types'

const EXAMPLES = ['Echegaray', 'Quilmes', 'Rock and Gol 2021', '2018', 'Cancha 2', 'Showbol', 'Golden']

export default function SearchScreen() {
  const state = useData(() => Promise.all([loadBase(), api.matches(), api.facts()]), [])
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const setQ = (v: string) => setParams(v ? { q: v } : {}, { replace: true })
  return (
    <Page title="Buscar">
      <div className="search-sticky">
        <SearchBox value={q} onChange={setQ} placeholder="Jugador, rival, torneo, año, cancha…" autoFocus />
      </div>
      <Async state={state}>{([base, matches, facts]) => <Results q={q} setQ={setQ} base={base} matches={matches} facts={facts} />}</Async>
    </Page>
  )
}

function statsLink(h: Hit) {
  return `/estadisticas?${FILTER_PARAM[KIND_FILTER[h.kind]]}=${h.id}`
}

function detailLink(h: Hit): string | null {
  if (h.kind === 'player') return `/jugadores/${h.id}`
  if (h.kind === 'rival') return `/rivales/${h.id}`
  if (h.kind === 'tournament') return `/torneos/${h.id}`
  return null
}

function Results({ q, setQ, base, matches, facts }: { q: string; setQ: (v: string) => void; base: Base; matches: MatchSummary[]; facts: Map<number, Fact> }) {
  const hits = useMemo(() => (q.trim().length >= 2 || /^\d{4}$/.test(q.trim()) ? search(q, base, matches) : []), [q, base, matches])
  const top = featured(hits)

  if (q.trim().length < 2) {
    return (
      <>
        <p className="muted small note">Probá con:</p>
        <div className="chips">
          {EXAMPLES.map((e) => (
            <button key={e} type="button" className="chip" onClick={() => setQ(e)}>
              {e}
            </button>
          ))}
        </div>
        <h2 className="section-title">Explorar</h2>
        <ul className="list">
          {[
            ['/jugadores', 'Todos los jugadores'],
            ['/rivales', 'Todos los rivales'],
            ['/torneos', 'Todos los torneos'],
            ['/estadisticas', 'Estadísticas con filtros'],
          ].map(([to, l]) => (
            <li key={to}>
              <Link to={to} className="row">
                <span className="row-main">{l}</span>
                <IconChevron />
              </Link>
            </li>
          ))}
        </ul>
      </>
    )
  }
  if (!hits.length) return <Empty title={`Nada para "${q}"`}>Revisá cómo está escrito o probá con una parte del nombre.</Empty>

  const groups = new Map<Kind, Hit[]>()
  for (const h of hits) if (h !== top) groups.set(h.kind, [...(groups.get(h.kind) ?? []), h])

  return (
    <>
      {top && <Featured h={top} base={base} matches={matches} facts={facts} />}
      {groups.size > 0 && top && <h2 className="section-title">Otros resultados</h2>}
      {Array.from(groups.entries()).map(([kind, hs]) => (
        <section key={kind}>
          <h3 className="sub-title">{KIND_LABEL[kind]}</h3>
          <ExpandableList
            items={hs}
            limit={5}
            noun="resultados"
            render={(h) => <HitRow key={`${h.kind}${h.id}`} h={h} base={base} matches={matches} facts={facts} />}
          />
        </section>
      ))}
    </>
  )
}

function HitRow({ h, base, matches, facts }: { h: Hit; base: Base; matches: MatchSummary[]; facts: Map<number, Fact> }) {
  let sub: React.ReactNode = null
  if (h.kind === 'player') {
    const p = base.players.get(h.id)!
    sub = `${p.matches} PJ · ${p.goals} goles · ${p.firstYear ?? ''}${p.lastYear && p.lastYear !== p.firstYear ? `–${p.lastYear}` : ''}`
  } else {
    const f: Filters = { [KIND_FILTER[h.kind]]: h.id }
    sub = <RecordInline r={clubStats(scopeMatches(matches, facts, f), facts).record} />
  }
  return (
    <li>
      <Link to={detailLink(h) ?? statsLink(h)} className="row">
        <span className="row-main">
          <span>{h.name}</span>
          <span className="muted small">{sub}</span>
        </span>
        <IconChevron />
      </Link>
    </li>
  )
}

/** Resultado principal desplegado con sus datos y sus partidos. */
function Featured({ h, base, matches, facts }: { h: Hit; base: Base; matches: MatchSummary[]; facts: Map<number, Fact> }) {
  const detail = detailLink(h)
  const actions = (
    <div className="title-actions">
      {detail && <Link to={detail} className="btn btn-soft">{h.kind === 'player' ? 'Ficha completa' : 'Ver página'}</Link>}
      <Link to={statsLink(h)} className="btn">Estadísticas</Link>
    </div>
  )

  if (h.kind === 'player') {
    const p = base.players.get(h.id)!
    const s = playerStats(p.id, matches, facts)
    return (
      <section className="card featured" aria-label={p.name}>
        <p className="eyebrow">Jugador</p>
        <h2 className="featured-title">{p.name}</h2>
        <p className="muted small">
          {p.firstYear ? `${p.firstYear}${p.lastYear !== p.firstYear ? `–${p.lastYear}` : ''}` : 'sin partidos'}
          {p.number != null && ` · camiseta ${p.number}`}
        </p>
        <StatGrid>
          <Stat label="Partidos" value={s.matches.length} />
          <Stat label="Goles" value={s.goals.length} tone="win" />
          <Stat label="Asistencias" value={s.assistsGiven.length} />
          <Stat label="Amarillas" value={s.yellow.length} />
          <Stat label="Rojas" value={s.red.length} tone={s.red.length ? 'loss' : undefined} />
          <Stat label="Goles en video" value={s.goals.filter((g) => g.video).length} tone="accent" />
        </StatGrid>
        <p className="muted small note">
          Con él en cancha: <RecordInline r={s.record} />
        </p>
        {actions}
      </section>
    )
  }

  const f: Filters = { [KIND_FILTER[h.kind]]: h.id }
  const ms = scopeMatches(matches, facts, f)
  const c = clubStats(ms, facts)
  const top = c.scorers[0]
  return (
    <>
      <section className="card featured" aria-label={h.name}>
        <p className="eyebrow">{KIND_SINGULAR[h.kind]}</p>
        <h2 className="featured-title">{h.kind === 'rival' ? `vs ${h.name}` : h.name}</h2>
        {top && (
          <p className="muted small">
            Goleador: {base.players.get(top.id)?.name} ({top.value})
          </p>
        )}
        {actions}
      </section>
      <RecordCard r={c.record} />
      <h2 className="section-title">Partidos ({ms.length})</h2>
      <ExpandableList items={ms} limit={15} render={(m) => <MatchRow key={m.id} m={m} base={base} showTournament={h.kind !== 'tournament'} />} />
    </>
  )
}
