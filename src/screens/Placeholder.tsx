import { useParams } from 'react-router-dom'
import { Page } from '../components/Page'
import { Empty } from '../components/States'

/** Pantalla provisoria mientras se construye cada sección (hito 4). */
export default function Placeholder({ title, back }: { title: string; back?: boolean }) {
  const { id } = useParams()
  return (
    <Page title={title} back={back}>
      <Empty title="En construcción">
        Esta pantalla llega en el próximo hito{id ? ` (id ${id})` : ''}.
      </Empty>
    </Page>
  )
}
