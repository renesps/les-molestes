import { Link } from 'react-router-dom'
import { Page } from '../components/Page'
import { Async } from '../components/States'
import { IconChevron, IconExternal } from '../components/Icons'
import { api, useData } from '../lib/data'
import { formatDate } from '../lib/format'
import { openExternal } from '../lib/openExternal'

const INSTAGRAM = 'https://www.instagram.com/lesmolestes/'

export default function More() {
  const state = useData(() => api.meta(), [])
  return (
    <Page title="Más">
      <ul className="list">
        <li>
          <Link to="/jugadores" className="row">
            <span className="row-main">
              <span>Jugadores</span>
              <span className="muted small">Plantel y rankings</span>
            </span>
            <IconChevron />
          </Link>
        </li>
        <li>
          <Link to="/torneos" className="row">
            <span className="row-main">
              <span>Torneos</span>
              <span className="muted small">Por circuito y edición</span>
            </span>
            <IconChevron />
          </Link>
        </li>
        <li>
          <Link to="/titulos" className="row">
            <span className="row-main">
              <span>Títulos</span>
              <span className="muted small">★★★ Palmarés</span>
            </span>
            <IconChevron />
          </Link>
        </li>
        <li>
          <Link to="/rivales" className="row">
            <span className="row-main">
              <span>Rivales</span>
              <span className="muted small">Historial contra cada equipo</span>
            </span>
            <IconChevron />
          </Link>
        </li>
        <li>
          <Link to="/curiosidades" className="row">
            <span className="row-main">
              <span>Datos curiosos</span>
              <span className="muted small">Rachas, goleadas, hat-tricks</span>
            </span>
            <IconChevron />
          </Link>
        </li>
      </ul>

      <h2 className="section-title">Info</h2>
      <div className="card info">
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" width="56" height="84" />
        <div>
          <p className="display">Club Social y Deportivo Les Molestes</p>
          <p className="muted small">Fútbol amateur</p>
        </div>
      </div>
      <ul className="list">
        <li>
          <button type="button" className="row" onClick={() => openExternal(INSTAGRAM)}>
            <span className="row-main">
              <span>Instagram</span>
              <span className="muted small">@lesmolestes</span>
            </span>
            <IconExternal />
          </button>
        </li>
      </ul>

      <Async state={state}>
        {(meta) => (
          <dl className="card facts small">
            <div><dt>Partidos cargados</dt><dd className="tabular">{meta.counts.matches}</dd></div>
            <div><dt>Desde</dt><dd className="tabular">{formatDate(meta.firstMatchDate)}</dd></div>
            <div><dt>Hasta</dt><dd className="tabular">{formatDate(meta.lastMatchDate)}</dd></div>
            <div><dt>Datos generados</dt><dd className="tabular">{formatDate(meta.generatedAt)}</dd></div>
            <div><dt>Versión de la app</dt><dd className="tabular">{__APP_VERSION__}</dd></div>
          </dl>
        )}
      </Async>
      <p className="muted small credits">
        Datos tomados de la base histórica del equipo (Molestat). Fotos y videos alojados en Google Drive.
      </p>
    </Page>
  )
}
