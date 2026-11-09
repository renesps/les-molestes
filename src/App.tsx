import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { TabBar } from './components/TabBar'
import { Loading } from './components/States'
import { VideoProvider } from './components/VideoModal'
import Placeholder from './screens/Placeholder'

// Cada pantalla se carga recién cuando se abre (carga diferida)
const Home = lazy(() => import('./screens/Home'))
const Matches = lazy(() => import('./screens/Matches'))
const MatchDetail = lazy(() => import('./screens/MatchDetail'))
const Players = lazy(() => import('./screens/Players'))
const PlayerDetail = lazy(() => import('./screens/PlayerDetail'))
const Rivals = lazy(() => import('./screens/Rivals').then((m) => ({ default: m.Rivals })))
const RivalDetail = lazy(() => import('./screens/Rivals').then((m) => ({ default: m.RivalDetail })))
const Tournaments = lazy(() => import('./screens/Tournaments').then((m) => ({ default: m.Tournaments })))
const TournamentDetail = lazy(() => import('./screens/Tournaments').then((m) => ({ default: m.TournamentDetail })))
const Titles = lazy(() => import('./screens/Tournaments').then((m) => ({ default: m.Titles })))
const Curiosities = lazy(() => import('./screens/Curiosities'))
const More = lazy(() => import('./screens/More'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <VideoProvider>
        <div className="app">
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/partidos" element={<Matches />} />
              <Route path="/partidos/:id" element={<MatchDetail />} />
              <Route path="/jugadores" element={<Players />} />
              <Route path="/jugadores/:id" element={<PlayerDetail />} />
              <Route path="/rivales" element={<Rivals />} />
              <Route path="/rivales/:id" element={<RivalDetail />} />
              <Route path="/torneos" element={<Tournaments />} />
              <Route path="/torneos/:id" element={<TournamentDetail />} />
              <Route path="/titulos" element={<Titles />} />
              <Route path="/curiosidades" element={<Curiosities />} />
              <Route path="/mas" element={<More />} />
              <Route path="*" element={<Placeholder title="No encontrado" back />} />
            </Routes>
          </Suspense>
        </div>
        <TabBar />
      </VideoProvider>
    </HashRouter>
  )
}
