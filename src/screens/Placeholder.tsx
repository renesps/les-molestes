import { Link } from 'react-router-dom'
import { Page } from '../components/Page'
import { Empty } from '../components/States'

/** Dirección que no existe. */
export default function Placeholder({ title, back }: { title: string; back?: boolean }) {
  return (
    <Page title={title} back={back}>
      <Empty title="Esta página no existe">
        <Link to="/">Volver al inicio</Link>
      </Empty>
    </Page>
  )
}
