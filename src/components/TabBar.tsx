import { NavLink, useLocation } from 'react-router-dom'
import { IconBall, IconChart, IconHome, IconMore, IconSearch } from './Icons'

const MORE_PATHS = ['/mas', '/jugadores', '/torneos', '/titulos', '/rivales', '/curiosidades']

const TABS = [
  { to: '/', label: 'Inicio', Icon: IconHome, match: (p: string) => p === '/' },
  { to: '/partidos', label: 'Partidos', Icon: IconBall, match: (p: string) => p.startsWith('/partidos') },
  { to: '/buscar', label: 'Buscar', Icon: IconSearch, match: (p: string) => p.startsWith('/buscar') },
  { to: '/estadisticas', label: 'Estadísticas', Icon: IconChart, match: (p: string) => p.startsWith('/estadisticas') },
  { to: '/mas', label: 'Más', Icon: IconMore, match: (p: string) => MORE_PATHS.some((m) => p.startsWith(m)) },
]

export function TabBar() {
  const { pathname } = useLocation()
  return (
    <nav className="tabbar" aria-label="Secciones">
      {TABS.map(({ to, label, Icon, match }) => {
        const active = match(pathname)
        return (
          <NavLink key={to} to={to} className={`tab${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}>
            <Icon filled={active} />
            <span>{label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
