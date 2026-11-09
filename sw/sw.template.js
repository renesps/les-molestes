/* Service worker de Les Molestes (generado en el build desde sw/sw.template.js).
 * - Al instalarse guarda la app y TODOS los datos → anda sin conexión.
 * - Datos y archivos: "stale-while-revalidate" (muestra lo guardado y actualiza en segundo plano).
 * - Páginas: intenta la red y, si no hay conexión, usa index.html guardado.
 * - Nunca toca Google Drive ni otros sitios (los videos/fotos necesitan conexión).
 */
const VERSION = '__VERSION__'
const CACHE = `les-molestes-${VERSION}`
const PRECACHE = __PRECACHE__
// ignoreVary: algunos servidores mandan "Vary: Origin" y los scripts de módulo se piden con Origin;
// sin esto, lo guardado no coincidiría y la app no arrancaría sin conexión.
const MATCH = { ignoreSearch: true, ignoreVary: true }

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('les-molestes-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // Drive, Instagram, etc.: directo a la red

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html', MATCH).then((r) => r || caches.match('./', MATCH))),
    )
    return
  }

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, MATCH)
      const network = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone())
          return res
        })
        .catch(() => cached || new Response('Sin conexión', { status: 503, statusText: 'Sin conexión' }))
      if (cached) {
        event.waitUntil(network) // revalida en segundo plano
        return cached
      }
      return network
    }),
  )
})
