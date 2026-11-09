#!/usr/bin/env node
/**
 * Verificación de punta a punta con Playwright, sobre la app ya compilada (dist/).
 *
 *   npm run build && npm run e2e
 *
 * 1. Capturas 390×844 de todas las pantallas (claro y oscuro) → docs/capturas/
 * 2. En cada pantalla: errores de JavaScript, revisión de accesibilidad (axe, WCAG AA)
 *    y botones/links más chicos que 44 px.
 * 3. Modo sin conexión: carga una vez, corta internet y navega.
 *
 * Sale con error si algo falla.
 */
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { chromium } from 'playwright'
import { preview } from 'vite'

const require = createRequire(import.meta.url)
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const OUT = 'docs/capturas'
const VIEWPORT = { width: 390, height: 844 }

const SCREENS = [
  ['01-inicio', '#/', 'Récord histórico'],
  ['02-partidos', '#/partidos', '2024'],
  ['03-partidos-filtros', '#/partidos?c=1&y=2018&r=V', 'partidos'],
  ['04-partido', '#/partidos/237', 'Quilmes'],
  ['05-partido-video', '#/partidos/237', 'Quilmes', 'video'],
  ['06-partido-sin-marcador', '#/partidos/220', 'marcador completo'],
  ['07-jugadores', '#/jugadores', 'Manuel Echegaray'],
  ['08-rankings', '#/jugadores?vista=rankings', 'Manuel Echegaray'],
  ['09-jugador', '#/jugadores/8', 'Goles por año'],
  ['10-rivales', '#/rivales', 'Ademar'],
  ['11-rival', '#/rivales/__ADEMAR__', 'Historial'],
  ['12-torneos', '#/torneos', 'Palmarés'],
  ['13-torneo-2024-4', '#/torneos/29', 'todavía no están cargados'],
  ['14-titulos', '#/titulos', 'Campeones'],
  ['15-curiosidades', '#/curiosidades', 'Racha'],
  ['16-mas', '#/mas', 'Instagram'],
  ['17-no-existe', '#/cualquier-cosa', 'no existe'],
]

const teams = JSON.parse(readFileSync('public/data/teams.json', 'utf8'))
const ademar = teams.find((t) => t.name === 'Ademar')?.id

const problems = []
const fail = (msg) => {
  problems.push(msg)
  console.log(`  ✗ ${msg}`)
}

const server = await preview({ preview: { port: 4174, strictPort: true, open: false }, logLevel: 'silent' })
const BASE = 'http://localhost:4174/'
const browser = await chromium.launch()

try {
  rmSync(OUT, { recursive: true, force: true })
  mkdirSync(OUT, { recursive: true })

  // ------------------------------------------------------------ capturas + revisiones
  for (const scheme of ['light', 'dark']) {
    console.log(`\nPantallas (${scheme === 'light' ? 'modo claro' : 'modo oscuro'})`)
    const ctx = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      colorScheme: scheme,
      locale: 'es-AR',
      timezoneId: 'Europe/Madrid', // a propósito NO Argentina: las fechas igual tienen que salir en hora de Buenos Aires
      serviceWorkers: 'block',
    })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    // solo errores de nuestra app (el reproductor de Drive tira avisos propios)
    page.on('console', (m) => m.type() === 'error' && m.location().url.startsWith(BASE) && errors.push(m.text()))

    for (const [name, hash, expect, action] of SCREENS) {
      errors.length = 0
      await page.goto(BASE + hash.replace('__ADEMAR__', String(ademar)))
      await page.reload() // asegura render limpio de la ruta
      try {
        await page.getByText(expect, { exact: false }).first().waitFor({ timeout: 8000 })
      } catch {
        fail(`${name}: no apareció "${expect}"`)
      }
      if (action === 'video') {
        await page.getByRole('button', { name: /Ver gol/ }).first().click()
        await page.locator('dialog[open] iframe').waitFor()
        await page.waitForTimeout(2500) // que cargue el reproductor de Drive
      }
      await page.evaluate(() => document.fonts.ready)
      if (scheme === 'light' || ['01-inicio', '04-partido', '09-jugador', '14-titulos'].includes(name)) {
        await page.screenshot({ path: `${OUT}/${name}${scheme === 'dark' ? '-oscuro' : ''}.png` })
      }
      if (errors.length) fail(`${name}: errores JS: ${errors.join(' | ')}`)

      // accesibilidad (axe) — solo en claro, el contraste de oscuro se revisa con check_contrast.py
      if (scheme === 'light') {
        await page.addScriptTag({ content: AXE })
        const res = await page.evaluate(async () => {
          // eslint-disable-next-line no-undef
          const r = await axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
            exclude: [['iframe']], // el reproductor de Drive no es nuestro
          })
          return r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(' ')}`)
        })
        for (const v of res) fail(`${name}: accesibilidad: ${v}`)

        // tamaños táctiles: todo lo tocable que no sea un link dentro de un texto
        const small = await page.evaluate(() => {
          const out = []
          for (const el of document.querySelectorAll('a, button, select, input, [role="radio"]')) {
            const r = el.getBoundingClientRect()
            if (!r.width || !r.height) continue
            if (el.tagName === 'A' && el.closest('p, .muted, dd, .scoreboard-team')) continue
            // los ::after agrandan el área táctil de chips y segmentados
            const after = getComputedStyle(el, '::after')
            const extra = after.content !== 'none' && after.position === 'absolute' ? 8 : 0
            if (Math.min(r.height + extra, r.width) < 44 && !(r.width >= 44 && r.height + extra >= 44)) {
              out.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 25)}" ${Math.round(r.width)}×${Math.round(r.height)}`)
            }
          }
          return Array.from(new Set(out)).slice(0, 5)
        })
        for (const s of small) fail(`${name}: objetivo táctil chico: ${s}`)
      }
      console.log(`  · ${name}`)
    }
    await ctx.close()
  }

  // ------------------------------------------------------------ modo sin conexión
  console.log('\nSin conexión')
  const ctx = await browser.newContext({ viewport: VIEWPORT, colorScheme: 'light' })
  const page = await ctx.newPage()
  await page.goto(BASE)
  await page.getByText('Récord histórico').waitFor()
  const cached = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready
    const keys = await caches.keys()
    const c = await caches.open(keys.find((k) => k.startsWith('les-molestes-')))
    return { active: !!reg.active, files: (await c.keys()).length }
  })
  console.log(`  · service worker activo: ${cached.active}, archivos guardados: ${cached.files}`)
  if (!cached.active || cached.files < 200) fail(`el service worker no guardó la app (${cached.files} archivos)`)

  await ctx.setOffline(true)
  const offlineChecks = [
    ['#/', 'Récord histórico'],
    ['#/partidos', '2016'],
    ['#/partidos/1', 'Goles'],
    ['#/partidos/237', 'Quilmes'],
    ['#/jugadores/8', 'Goles por año'],
    ['#/torneos/9', 'Campeón'],
    ['#/curiosidades', 'Racha'],
  ]
  await page.reload()
  for (const [hash, expect] of offlineChecks) {
    await page.goto(BASE + hash)
    try {
      await page.getByText(expect).first().waitFor({ timeout: 5000 })
      console.log(`  ✓ ${hash} anda sin conexión`)
    } catch {
      fail(`sin conexión: ${hash} no mostró "${expect}"`)
    }
  }
  await page.screenshot({ path: `${OUT}/18-sin-conexion.png` })
  await ctx.close()
} finally {
  await browser.close()
  await new Promise((r) => server.httpServer.close(r))
}

console.log(problems.length ? `\n${problems.length} problema(s)` : '\nTodo OK')
process.exit(problems.length ? 1 : 0)
