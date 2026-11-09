import type { ReactNode } from 'react'
import { goalDiff, winRate } from '../lib/format'
import { openExternal } from '../lib/openExternal'
import type { Record } from '../lib/types'

/** Tarjeta de récord PJ/G/E/P + goles. */
export function RecordCard({ r, title }: { r: Record; title?: string }) {
  return (
    <div className="card">
      {title && <p className="card-label">{title}</p>}
      <dl className="record tabular">
        <div><dt>PJ</dt><dd>{r.played}</dd></div>
        <div className="win"><dt>G</dt><dd>{r.won}</dd></div>
        <div className="draw"><dt>E</dt><dd>{r.drawn}</dd></div>
        <div className="loss"><dt>P</dt><dd>{r.lost}</dd></div>
      </dl>
      <p className="record-goals tabular">
        <span>{r.goalsFor} a favor</span>
        <span>{r.goalsAgainst} en contra</span>
        <span>({goalDiff(r)})</span>
      </p>
      <p className="muted small center">
        {winRate(r)} % ganados{r.unknown ? ` · ${r.unknown} sin resultado` : ''}
      </p>
    </div>
  )
}

/** Línea compacta "12 PJ · 8G 2E 2P" */
export function RecordInline({ r }: { r: Record }) {
  return (
    <span className="tabular">
      {r.played} PJ · <span className="t-win">{r.won}G</span> <span className="t-draw">{r.drawn}E</span>{' '}
      <span className="t-loss">{r.lost}P</span>
    </span>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'is-on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'win' | 'loss' | 'accent' }) {
  return (
    <div className={`stat${tone ? ` t-${tone}` : ''}`}>
      <dd className="tabular">{value}</dd>
      <dt>{label}</dt>
    </div>
  )
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <dl className="stat-grid">{children}</dl>
}

/** Botón a una carpeta de Drive (siempre vía openExternal). */
export function DriveFolderButton({ url, label, note }: { url: string; label: string; note?: string }) {
  return (
    <div className="drive-btn">
      <button type="button" className="btn btn-block" onClick={() => openExternal(url)}>
        {label}
      </button>
      {note && <p className="muted small center">{note}</p>}
    </div>
  )
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="search">
      <span className="visually-hidden">{placeholder}</span>
      <span aria-hidden="true" className="search-icon">⌕</span>
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
      />
      {value && (
        <button type="button" className="search-clear" onClick={() => onChange('')} aria-label="Borrar búsqueda">
          ✕
        </button>
      )}
    </label>
  )
}

/** Normaliza para buscar sin tildes ni mayúsculas. */
export function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
