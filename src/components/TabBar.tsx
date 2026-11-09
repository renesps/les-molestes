import { NavLink, useLocation } from 'react-router-dom'
import { IconBall, IconHome, IconMore, IconPeople, IconTrophy } from './Icons'

const TABS = [
  { to: '/', label: 'Inicio', Icon: IconHome, match: (p: string) => p === '/' },
  { to: '/partidos', label: 'Partidos', Icon: IconBall, match: (p: string) => p.startsWith('/partidos') },
  { to: '/jugadores', label: 'Jugadores', Icon: IconPeople, match: (p: string) => p.startsWith('/jugadores') },
  {
    to: '/torneos',
    label: 'Torneos',
    Icon: IconTrophy,
    match: (p: string) => p.startsWith('/torneos') || p.startsWith('/titulos'),
  },
  {
    to: '/mas',
    label: 'Más',
    Icon: IconMore,
    match: (p: string) => p.startsWith('/mas') || p.startsWith('/rivales') || p.startsWith('/curiosidades'),
  },
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
