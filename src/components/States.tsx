import type { ReactNode } from 'react'
import type { LoadState } from '../lib/data'

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}

export function ErrorState({ message, retry }: { message?: string; retry?: () => void }) {
  return (
    <div className="state" role="alert">
      <p className="state-title">No se pudieron cargar los datos</p>
      <p>{message ?? 'Revisá la conexión y probá de nuevo.'}</p>
      {retry && (
        <button type="button" className="btn" onClick={retry}>
          Reintentar
        </button>
      )}
    </div>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state">
      <p className="state-title">{title}</p>
      {children && <p>{children}</p>}
    </div>
  )
}

/** Muestra cargando / error / contenido según el estado de useData. */
export function Async<T>({ state, children }: { state: LoadState<T>; children: (data: T) => ReactNode }) {
  if (state.status === 'loading') return <Loading />
  if (state.status === 'error') return <ErrorState retry={state.retry} />
  return <>{children(state.data)}</>
}
