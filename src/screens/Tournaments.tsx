import { Link, useParams } from 'react-router-dom'
import { DriveFolderButton, RecordCard, RecordInline } from '../components/Bits'
import { IconChevron } from '../components/Icons'
import { MatchRow } from '../components/MatchRow'
import { Page } from '../components/Page'
import { Async, Empty } from '../components/States'
import { api, loadBase, useData } from '../lib/data'
import { formatDate } from '../lib/format'
import { openExternal } from '../lib/openExternal'
import type { Tournament } from '../lib/types'

export function positionLabel(t: Tournament): string | null {
  if (t.isTitle) return '★ Campeón'
  if (t.position) return `${t.position}.º puesto`
  return null
}

export function Tournaments() {
  const state = useData(() => Promise.all([api.tournaments(), api.titles()]), [])
  return (
    <Page title="Torneos" back>
      <Async state={state}>
        {([{ circuits, tournaments }, titles]) => (
          <>
            <Link to="/titulos" className="card titles-banner">
              <span className="titles-stars" aria-hidden="true">★★★</span>
              <span className="row-main">
                <span className="display">Palmarés</span>
                <span className="small">{titles.length} títulos de Rock and Gol: {titles.map((t) => t.label).join(' · ')}</span>
              </span>
              <IconChevron />
            </Link>
            {circuits.map((c) => {
              const ts = tournaments
                .filter((t) => t.circuitId === c.id && t.matchIds.length + t.unloadedMatchFolders.length > 0)
                .sort((a, b) => b.year - a.year || b.edition - a.edition)
              return (
                <section key={c.id} aria-labelledby={`c-${c.id}`}>
                  <h2 className="group-title" id={`c-${c.id}`}>
                    <span>{c.name}</span>
                    <span className="muted small"><RecordInline r={c.record} /></span>
                  </h2>
                  <ul className="list">
                    {ts.map((t) => (
                      <li key={t.id}>
                        <Link to={`/torneos/${t.id}`} className="row">
                          <span className="row-main">
                            <span>{t.isCup ? t.name : `${t.year} · Torneo ${t.edition}`}</span>
                            <span className="muted small">
                              <RecordInline r={t.record} />
                              {t.zone && !t.isCup ? ` · Zona ${t.zone}` : ''}
                            </span>
                          </span>
                          {positionLabel(t) && (
                            <span className={`pos-tag${t.isTitle ? ' is-title' : ''}`}>{positionLabel(t)}</span>
                          )}
                          <IconChevron />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
            <p className="muted small center note">
              Solo se muestran los resultados de Les Molestes: la base no tiene las tablas de posiciones completas.
            </p>
          </>
        )}
      </Async>
    </Page>
  )
}

export function TournamentDetail() {
  const id = Number(useParams().id)
  const state = useData(() => Promise.all([loadBase(), api.matches(), api.stats()]), [])
  return (
    <Async state={state}>
      {([base, matches, stats]) => {
        const t = base.tournaments.get(id)
        if (!t)
          return (
            <Page title="Torneo" back>
              <Empty title="Torneo no encontrado" />
            </Page>
          )
        const ids = new Set(t.matchIds)
        const ms = matches.filter((m) => ids.has(m.id))
        const scorers = (stats.rankings.scorersByTournament[String(t.id)] ?? []).slice(0, 5)
        const circuit = base.circuits.get(t.circuitId)
        return (
          <Page title={t.name} back>
            <p className="eyebrow center">{circuit?.name} · {t.code}</p>
            {positionLabel(t) && (
              <p className={`center pos-big${t.isTitle ? ' is-title' : ''}`}>{positionLabel(t)}</p>
            )}
            <p className="muted small center note">
              {t.zone && !t.isCup ? `Zona ${t.zone}` : ''}
              {t.firstDate && t.lastDate ? `${t.zone && !t.isCup ? ' · ' : ''}${formatDate(t.firstDate)} al ${formatDate(t.lastDate)}` : ''}
            </p>
            <RecordCard r={t.record} title="Les Molestes en este torneo" />

            {t.celebrationFolder && (
              <DriveFolderButton url={t.celebrationFolder.folderUrl} label="🏆 Festejos Campeón" />
            )}

            {scorers.length > 0 && (
              <>
                <h2 className="section-title">Goleadores</h2>
                <ul className="list rank-list">
                  {scorers.map((r) => (
                    <li key={r.playerId}>
                      <Link to={`/jugadores/${r.playerId}`} className="row">
                        <span className="row-main">{r.name}</span>
                        <span className="row-value tabular">{r.value}<small>goles</small></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <h2 className="section-title">Partidos</h2>
            {ms.length === 0 ? (
              <Empty title="Sin partidos cargados en este torneo" />
            ) : (
              <ul className="list">
                {ms.map((m) => (
                  <MatchRow key={m.id} m={m} base={base} showTournament={false} />
                ))}
              </ul>
            )}

            {t.unloadedMatchFolders.length > 0 && (
              <>
                <h2 className="section-title">Fotos de partidos que todavía no están cargados</h2>
                <p className="muted small note">Hay fotos y videos en Drive, pero estos partidos no están en la base (sin resultado).</p>
                <ul className="list">
                  {t.unloadedMatchFolders.map((f) => (
                    <li key={f.folderId}>
                      <button type="button" className="row" onClick={() => openExternal(f.folderUrl)}>
                        <span aria-hidden="true">📷</span>
                        <span className="row-main">{f.title.replace(/_/g, '/')}</span>
                        <span className="muted" aria-hidden="true">↗</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Page>
        )
      }}
    </Async>
  )
}

export function Titles() {
  const state = useData(() => api.titles(), [])
  return (
    <Page title="Títulos" back>
      <Async state={state}>
        {(titles) => (
          <>
            <div className="trophy-hero">
              <span className="titles-stars big" aria-hidden="true">★★★</span>
              <p className="display">Campeones de Rock and Gol</p>
              <p className="muted small">{titles.length} títulos</p>
            </div>
            {titles.map((t) => (
              <article key={t.code} className="card title-card">
                <header className="title-card-head">
                  <span className="title-star" aria-hidden="true">★</span>
                  <div>
                    <h2 className="display">Rock and Gol {t.label}</h2>
                    <p className="muted small">
                      {t.name}
                      {t.zone ? ` · Zona ${t.zone}` : ''} · {t.code}
                    </p>
                  </div>
                </header>
                <dl className="record tabular compact">
                  <div><dt>PJ</dt><dd>{t.record.played}</dd></div>
                  <div className="win"><dt>G</dt><dd>{t.record.won}</dd></div>
                  <div className="draw"><dt>E</dt><dd>{t.record.drawn}</dd></div>
                  <div className="loss"><dt>P</dt><dd>{t.record.lost}</dd></div>
                </dl>
                <p className="muted small center">
                  {t.record.goalsFor} goles a favor · {t.record.goalsAgainst} en contra
                </p>
                <div className="title-actions">
                  <Link to={`/torneos/${t.tournamentId}`} className="btn btn-soft">Ver partidos</Link>
                  {t.celebrationFolder && (
                    <button type="button" className="btn" onClick={() => openExternal(t.celebrationFolder!.folderUrl)}>
                      🏆 Festejos
                    </button>
                  )}
                </div>
              </article>
            ))}
          </>
        )}
      </Async>
    </Page>
  )
}
