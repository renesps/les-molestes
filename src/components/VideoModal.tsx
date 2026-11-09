import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { openExternal } from '../lib/openExternal'
import type { GoalVideo } from '../lib/types'

interface Clip {
  video: GoalVideo
  title: string
  subtitle?: string
}

const VideoCtx = createContext<(clip: Clip) => void>(() => {})

/** Abre el modal de video de gol desde cualquier pantalla. */
export const usePlayVideo = () => useContext(VideoCtx)

export function VideoProvider({ children }: { children: ReactNode }) {
  const [clip, setClip] = useState<Clip | null>(null)
  const play = useCallback((c: Clip) => setClip(c), [])
  return (
    <VideoCtx.Provider value={play}>
      {children}
      {clip && <VideoModal clip={clip} onClose={() => setClip(null)} />}
    </VideoCtx.Provider>
  )
}

function VideoModal({ clip, onClose }: { clip: Clip; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [vertical, setVertical] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    d.showModal() // <dialog>: atrapa el foco y se cierra con Escape
    const t = window.setTimeout(() => setSlow(true), 8000)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <dialog
      ref={ref}
      className="video-modal"
      aria-label={clip.title}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
    >
      <div className="video-sheet">
        <header className="video-head">
          <div className="video-titles">
            <p className="video-title">{clip.title}</p>
            {clip.subtitle && <p className="muted small">{clip.subtitle}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={() => ref.current?.close()} aria-label="Cerrar video">
            ✕
          </button>
        </header>
        <div className={`video-frame${vertical ? ' is-vertical' : ''}`}>
          {!loaded && <span className="spinner" aria-hidden="true" />}
          <iframe
            src={clip.video.previewUrl}
            title={`Video: ${clip.title}`}
            allow="autoplay; fullscreen; encrypted-media"
            allowFullScreen
            onLoad={() => setLoaded(true)}
          />
        </div>
        {slow && !loaded && (
          <p className="muted small video-hint">Drive está tardando. Probá abrirlo directamente en Drive.</p>
        )}
        <div className="video-actions">
          <button type="button" className="btn btn-soft" onClick={() => setVertical((v) => !v)} aria-pressed={vertical}>
            {vertical ? 'Ver horizontal' : 'Ver vertical'}
          </button>
          <button type="button" className="btn btn-soft" onClick={() => openExternal(clip.video.viewUrl)}>
            Abrir en Drive ↗
          </button>
        </div>
      </div>
    </dialog>
  )
}
