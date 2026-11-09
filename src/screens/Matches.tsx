import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { norm, RecordInline, SearchBox, Segmented } from '../components/Bits'
import { MatchRow } from '../components/MatchRow'
import { Page } from '../components/Page'
import { Async, Empty } from '../components/States'
import { api, loadBase, useData, type Base } from '../lib/data'
import { computeRecord } from '../lib/stats'
import type { MatchSummary } from '../lib/types'

type OutcomeFilter = '' | 'V' | 'E' | 'D'

export default function Matches() {
  const state = useData(() => Promise.all([api.matches(), loadBase()]), [])
  return (
    <Page title="Partidos">
      <Async state={state}>{([matches, base]) => <MatchList matches={matches} base={base} />}</Async>
    </Page>
  )
}

function MatchList({ matches, base }: { matches: MatchSummary[]; base: Base }) {
  // Los filtros viven en la dirección (?c=1&y=2018…): al volver de un partido siguen puestos.
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const circuit = Number(params.get('c')) || 0
  const year = Number(params.get('y')) || 0
  const tour = Number(params.get('t')) || 0
  const outcome = (params.get('r') ?? '') as OutcomeFilter
  const video = params.get('video') === '1'
  const photos = params.get('fotos') === '1'

  const set = (k: string, v: string | number | boolean) => {
    const next = new URLSearchParams(params)
    if (v === '' || v === 0 || v === false) next.delete(k)
    else next.set(k, v === true ? '1' : String(v))
    if (k === 'c' || k === 'y') next.delete('t') // el torneo depende de circuito y año
    setParams(next, { replace: true })
  }

  const years = useMemo(() => Array.from(new Set(matches.map((m) => m.year))).sort((a, b) => b - a), [matches])
  const tourOptions = useMemo(
    () =>
      Array.from(base.tournaments.values())
        .filter((t) => (!circuit || t.circuitId === circuit) && (!year || t.year === year) && t.matchIds.length)
        .sort((a, b) => b.year - a.year || b.edition - a.edition),
    [base, circuit, year],
  )

  const filtered = useMemo(() => {
    const nq = norm(q.trim())
    return matches.filter((m) => {
      if (circuit && m.circuitId !== circuit) return false
      if (year && m.year !== year) return false
      if (tour && m.tournamentId !== tour) return false
      if (outcome && m.outcome !== outcome) return false
      if (video && !m.videoGoals) return false
      if (photos && !m.hasMedia) return false
      if (nq) {
        const t = base.tournaments.get(m.tournamentId)
        const hay = norm(`${base.teams.get(m.rivalId)?.name ?? ''} ${t?.name ?? ''} ${t?.code ?? ''}`)
        if (!hay.includes(nq)) return false
      }
      return true
    })
  }, [matches, base, q, circuit, year, tour, outcome, video, photos])

  const groups = useMemo(() => {
    const g = new Map<number, MatchSummary[]>()
    for (const m of filtered) g.set(m.year, [...(g.get(m.year) ?? []), m])
    return Array.from(g.entries())
  }, [filtered])

  const active = [circuit, year, tour, outcome, video, photos, q].filter(Boolean).length
  const advanced = [year, tour, outcome, video, photos].filter(Boolean).length
  const [showMore, setShowMore] = useState(advanced > 0)
  const rec = computeRecord(filtered)

  return (
    <>
      <div className="filters">
        <SearchBox value={q} onChange={(v) => set('q', v)} placeholder="Buscar rival o torneo" />
        <div className="chips" role="group" aria-label="Circuito">
          <button type="button" className={`chip${!circuit ? ' is-on' : ''}`} aria-pressed={!circuit} onClick={() => set('c', 0)}>
            Todos
          </button>
          {Array.from(base.circuits.values()).map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chip${circuit === c.id ? ' is-on' : ''}`}
              aria-pressed={circuit === c.id}
              onClick={() => set('c', circuit === c.id ? 0 : c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="link-btn more-filters"
          aria-expanded={showMore}
          aria-controls="more-filters"
          onClick={() => setShowMore((v) => !v)}
        >
          {showMore ? 'Menos filtros ▴' : `Más filtros${advanced ? ` (${advanced})` : ''} ▾`}
        </button>
        {showMore && (
        <div id="more-filters" className="filters">
        <div className="selects">
          <label className="select">
            <span className="visually-hidden">Año</span>
            <select value={year} onChange={(e) => set('y', Number(e.target.value))}>
              <option value={0}>Todos los años</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>
          <label className="select">
            <span className="visually-hidden">Torneo</span>
            <select value={tour} onChange={(e) => set('t', Number(e.target.value))}>
              <option value={0}>Todos los torneos</option>
              {tourOptions.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
        </div>
        <Segmented<OutcomeFilter>
          label="Resultado"
          value={outcome}
          onChange={(v) => set('r', v)}
          options={[
            { value: '', label: 'Todos' },
            { value: 'V', label: 'Ganados' },
            { value: 'E', label: 'Empates' },
            { value: 'D', label: 'Perdidos' },
          ]}
        />
        <div className="chips" role="group" aria-label="Multimedia">
          <button type="button" className={`chip${video ? ' is-on' : ''}`} aria-pressed={video} onClick={() => set('video', !video)}>
            ▶ Con goles en video
          </button>
          <button type="button" className={`chip${photos ? ' is-on' : ''}`} aria-pressed={photos} onClick={() => set('fotos', !photos)}>
            📷 Con fotos
          </button>
        </div>
        </div>
        )}
      </div>

      <p className="result-summary muted small" aria-live="polite">
        {filtered.length === matches.length ? 'Todos los partidos' : `${filtered.length} partidos`} · <RecordInline r={rec} />
        {active > 0 && (
          <>
            {' · '}
            <button type="button" className="link-btn" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
              Limpiar filtros
            </button>
          </>
        )}
      </p>

      {filtered.length === 0 ? (
        <Empty title="No hay partidos con esos filtros">Probá sacando alguno.</Empty>
      ) : (
        groups.map(([y, ms]) => (
          <section key={y} aria-labelledby={`y-${y}`}>
            <h2 className="group-title" id={`y-${y}`}>
              <span>{y}</span>
              <span className="muted small"><RecordInline r={computeRecord(ms)} /></span>
            </h2>
            <ul className="list">
              {ms.map((m) => (
                <MatchRow key={m.id} m={m} base={base} />
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  )
}
