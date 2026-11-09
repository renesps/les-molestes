// Íconos de línea simples (sin librerías externas). Heredan el color del texto.
import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { filled?: boolean }

function Svg({ children, filled: _f, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
      {children}
    </svg>
  )
}

export const IconHome = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 10.5 12 3.5l8.5 7" fill="none" />
    <path d="M5.5 9v11h13V9" fill={p.filled ? 'currentColor' : 'none'} fillOpacity={p.filled ? 0.18 : 0} />
    <path d="M10 20v-5.5h4V20" />
  </Svg>
)

export const IconBall = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" fill={p.filled ? 'currentColor' : 'none'} fillOpacity={p.filled ? 0.18 : 0} />
    <path d="m12 8.2 3.3 2.4-1.3 3.9h-4l-1.3-3.9z" />
    <path d="M12 3.5v4.7M15.3 10.6l4.4-1.6M14 14.5l2.7 3.8M10 14.5l-2.7 3.8M8.7 10.6 4.3 9" />
  </Svg>
)

export const IconPeople = (p: P) => (
  <Svg {...p}>
    <circle cx="9" cy="8.5" r="3.2" fill={p.filled ? 'currentColor' : 'none'} fillOpacity={p.filled ? 0.18 : 0} />
    <path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
    <circle cx="16.5" cy="9.2" r="2.6" />
    <path d="M16.2 14.4c2.3.1 3.9 1.7 4.3 4.6" />
  </Svg>
)

export const IconTrophy = (p: P) => (
  <Svg {...p}>
    <path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0z" fill={p.filled ? 'currentColor' : 'none'} fillOpacity={p.filled ? 0.18 : 0} />
    <path d="M7.5 6H4.5c0 2.8 1.3 4.3 3.3 4.6M16.5 6h3c0 2.8-1.3 4.3-3.3 4.6M12 13.5V17M8.5 20h7M9.5 17h5v3h-5z" />
  </Svg>
)

export const IconMore = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" fill={p.filled ? 'currentColor' : 'none'} fillOpacity={p.filled ? 0.18 : 0} />
    <circle cx="8" cy="12" r=".9" fill="currentColor" />
    <circle cx="12" cy="12" r=".9" fill="currentColor" />
    <circle cx="16" cy="12" r=".9" fill="currentColor" />
  </Svg>
)

export const IconChevron = (p: P) => (
  <Svg width="18" height="18" strokeWidth="2.2" {...p}>
    <path d="m9 5 7 7-7 7" />
  </Svg>
)

export const IconBack = (p: P) => (
  <Svg width="22" height="22" strokeWidth="2.4" {...p}>
    <path d="m15 5-7 7 7 7" />
  </Svg>
)

export const IconExternal = (p: P) => (
  <Svg width="18" height="18" {...p}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Svg>
)
