# Pasar la web a app de iOS (Capacitor)

**No hace falta hacerlo ahora.** La app ya se puede instalar en el iPhone desde Safari ("Agregar a pantalla de inicio", ver `PUBLICAR.md`). Esta guía es para cuando quieras publicarla en la App Store o en TestFlight.

Capacitor "envuelve" la web en una app nativa: el mismo código, dentro de un proyecto de Xcode. El código ya está preparado para eso: direcciones con `#`, archivos con rutas relativas, todos los links externos pasan por un solo lugar, y el ícono y la pantalla de carga ya están hechos.

## Qué necesitás

- Xcode instalado (ya lo tenés).
- Una cuenta de Apple Developer (USD 99/año) **solo** para publicar en la App Store o TestFlight. Para probarla en tu iPhone alcanza con tu Apple ID gratis.

## 1. Instalar Capacitor

En la Terminal, dentro de la carpeta del proyecto:

```bash
npm install @capacitor/core @capacitor/ios @capacitor/browser @capacitor/assets
```

```bash
npm install -D @capacitor/cli
```

```bash
npx cap init "Les Molestes" ar.lesmolestes.app --web-dir dist
```

(`ar.lesmolestes.app` es el identificador de la app; podés elegir otro, pero no se puede cambiar una vez publicada.)

## 2. Configuración

Abrí `capacitor.config.ts` (lo crea el paso anterior) y dejalo así:

```ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'ar.lesmolestes.app',
  appName: 'Les Molestes',
  webDir: 'dist',
  ios: { contentInset: 'never' }, // la app ya maneja el notch con safe areas
  server: {
    // Deja que el reproductor de Drive se cargue dentro de la app
    allowNavigation: ['drive.google.com', '*.google.com', '*.googleusercontent.com'],
  },
}
export default config
```

## 3. Links externos con el navegador de iOS

Todos los links (Drive, Instagram) pasan por **un solo archivo**: `src/lib/openExternal.ts`. Reemplazá su contenido por:

```ts
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'

export function openExternal(url: string): void {
  if (!/^https:\/\//.test(url)) return
  if (Capacitor.isNativePlatform()) {
    void Browser.open({ url, presentationStyle: 'popover' }) // Safari dentro de la app
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
```

Así sigue andando igual en la web y en la app.

## 4. Crear el proyecto de iOS, ícono y pantalla de carga

```bash
npm run build && npx cap add ios
```

```bash
npx capacitor-assets generate --ios --assetPath resources
```

Eso toma `resources/icon.png` (1024×1024, sin transparencia, como pide Apple), `resources/splash.png` y `resources/splash-dark.png`, y genera todos los tamaños.

## 5. Probar en el simulador o en tu iPhone

```bash
npx cap open ios
```

Se abre Xcode. Arriba elegí un iPhone (simulador o el tuyo conectado por cable) y tocá ▶. La primera vez en tu iPhone, Xcode te va a pedir elegir tu "Team" (tu Apple ID) en *Signing & Capabilities*.

**Cada vez que cambies algo de la web**, antes de volver a correr en Xcode:

```bash
npm run build && npx cap sync ios
```

## Cosas que cambian dentro de la app (WKWebView) y ya están resueltas

| Tema | En la web | En la app de iOS | Estado |
|---|---|---|---|
| Links que abren otra pestaña (`target=_blank`) | Pestaña nueva | No hay pestañas; se ignoran | ✅ No usamos `_blank` sueltos: todo pasa por `openExternal`, que en iOS usa el plugin Browser |
| Service worker (modo sin conexión) | Guarda la app en el teléfono | Los archivos ya vienen dentro de la app; los service workers en `capacitor://` no corren | ✅ Solo se registra en `http(s)` (ver `src/main.tsx`). En la app anda offline igual |
| Video de gol (iframe de Drive) | Se ve en la ventana | Necesita permiso de navegación a Google | ✅ Con `allowNavigation` del paso 2. Si Drive pide iniciar sesión o confirmar, el botón "Abrir en Drive" lo abre en Safari |
| Carpetas de fotos | Pestaña nueva | Safari dentro de la app | ✅ Vía `openExternal` |
| Direcciones internas | `…/#/partidos/12` | Igual | ✅ `HashRouter` + `base: './'` no necesitan servidor |
| Notch y barra de inicio | Safe areas | Igual | ✅ `viewport-fit=cover` + `env(safe-area-inset-*)` |
| Zoom al tocar el buscador | — | — | ✅ Letra de 16 px en los campos |

## Para la App Store

- Apple a veces rechaza apps que son "solo una web". Esta tiene contenido propio, modo sin conexión y navegación nativa, lo que ayuda, pero no hay garantía. TestFlight (para el grupo del equipo) no tiene esa revisión tan estricta.
- Vas a necesitar: capturas de pantalla (podés partir de `docs/capturas/`), una descripción, y una **política de privacidad**. La app no junta datos de nadie: no tiene login, analytics ni servidores propios. Igual Apple pide el link.
- En *App Privacy* de App Store Connect: "Data Not Collected".
