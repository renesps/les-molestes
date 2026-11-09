/**
 * ÚNICO punto por el que salen todos los links externos (Drive, Instagram…).
 *
 * Hoy: pestaña nueva del navegador.
 * En la app de iOS (Capacitor): cambiar el cuerpo por el plugin Browser, por ejemplo
 *   import { Browser } from '@capacitor/browser'
 *   await Browser.open({ url })
 * Ver docs/IOS.md.
 */
export function openExternal(url: string): void {
  if (!/^https:\/\//.test(url)) {
    console.warn('openExternal: se ignoró un link no https', url)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
