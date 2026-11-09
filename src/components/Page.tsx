import { useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconBack } from './Icons'

const CLUB = 'Club Social y Deportivo Les Molestes'

interface Props {
  title: string
  /** Pantallas de detalle: muestran "‹ Atrás" y título chico, como en iOS. */
  back?: boolean
  /** Texto chico arriba del título grande. */
  eyebrow?: string
  /** Oculta el título grande a la vista (sigue para lectores de pantalla). */
  hideTitle?: boolean
  children: ReactNode
}

export function Page({ title, back, eyebrow, hideTitle, children }: Props) {
  const navigate = useNavigate()
  useEffect(() => {
    document.title = title === CLUB ? CLUB : `${title} · Les Molestes`
  }, [title])

  return (
    <div className="page">
      {back ? (
        <header className="navbar">
          <button
            type="button"
            className="navbar-back"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          >
            <IconBack />
            <span>Atrás</span>
          </button>
          <h1 className="navbar-title">{title}</h1>
          <span className="navbar-spacer" aria-hidden="true" />
        </header>
      ) : (
        <header className={`large-title${hideTitle ? ' is-compact' : ''}`}>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className={hideTitle ? 'visually-hidden' : undefined}>{title}</h1>
        </header>
      )}
      <main className="page-content">{children}</main>
    </div>
  )
}
