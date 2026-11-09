import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { Plugin } from 'vite'

/** Lista recursiva de archivos de una carpeta, como rutas relativas './x/y'. */
function listFiles(dir: string, root = dir): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (name.startsWith('.')) return []
    return statSync(full).isDirectory() ? listFiles(full, root) : [`./${relative(root, full).split('\\').join('/')}`]
  })
}

/**
 * Genera dist/sw.js con la lista de todo lo que hay que guardar para usar la app offline:
 * los archivos del build (JS/CSS con hash) + todo public/ (datos, íconos, logo).
 */
export function serviceWorker(): Plugin {
  return {
    name: 'les-molestes-sw',
    apply: 'build',
    generateBundle(_, bundle) {
      const publicFiles = listFiles('public').filter((f) => !/\/(resources)\//.test(f))
      const built = Object.keys(bundle).map((f) => `./${f}`)
      const files = Array.from(new Set(['./', './index.html', ...built, ...publicFiles])).sort()
      const hash = createHash('sha256')
      for (const f of publicFiles) hash.update(f).update(readFileSync(join('public', f)))
      for (const f of built) hash.update(f)
      const version = hash.digest('hex').slice(0, 12)
      const source = readFileSync('sw/sw.template.js', 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(files, null, 0))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}
