import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { TabBar } from './components/TabBar'
import { Loading } from './components/States'
import Placeholder from './screens/Placeholder'

// Cada pantalla se carga recién cuando se abre (carga diferida)
const Home = lazy(() => import('./screens/Home'))
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
      <div className="app">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/partidos" element={<Placeholder title="Partidos" />} />
            <Route path="/partidos/:id" element={<Placeholder title="Partido" back />} />
            <Route path="/jugadores" element={<Placeholder title="Jugadores" />} />
            <Route path="/jugadores/:id" element={<Placeholder title="Jugador" back />} />
            <Route path="/rivales" element={<Placeholder title="Rivales" back />} />
            <Route path="/rivales/:id" element={<Placeholder title="Rival" back />} />
            <Route path="/torneos" element={<Placeholder title="Torneos" />} />
            <Route path="/torneos/:id" element={<Placeholder title="Torneo" back />} />
            <Route path="/titulos" element={<Placeholder title="Títulos" back />} />
            <Route path="/curiosidades" element={<Placeholder title="Datos curiosos" back />} />
            <Route path="/mas" element={<More />} />
            <Route path="*" element={<Placeholder title="No encontrado" back />} />
          </Routes>
        </Suspense>
      </div>
      <TabBar />
    </HashRouter>
  )
}
