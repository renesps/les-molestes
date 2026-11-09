# Decisiones

Cosas que elegí sin preguntarte porque eran razonables. Si alguna no te cierra, decime y la cambio.

## Hito 1 — Datos

**Archivos de entrada.** Los archivos estaban sueltos en la raíz del proyecto. Moví `dump.sql` y `Escudo.png` a `input/` y copié ahí `drive_map.json` desde Descargas. Las carpetas de fotos/videos y los `.zip` quedan donde estaban, pero git los ignora.

**`input/drive_map.json` tampoco se sube a GitHub.** Tiene los IDs del Drive viejo (`old_folder_id`, `old_file_id`). La app usa `public/data/media.json`, que es la misma información pero limpia, sin esos IDs. Para regenerar los datos necesitás tener el `drive_map.json` en `input/`, igual que el dump.

**Resultado de cada partido.** La base tiene el marcador dos veces: como texto (`result`, por ejemplo `3-1`) y como números (`goals_made` / `goals_received`). Comparé los dos en los 243 partidos y coinciden siempre. La app usa los números; si faltan, usa el texto; si faltan los dos, muestra "sin dato".

**Ganado / empatado / perdido.** Sale del marcador. En los 2 partidos sin marcador completo (220 y 223, Diagonales 2016) uso el campo `final` de la base ("Derrota" en los dos), así el récord histórico suma 243 partidos sin inventar nada. En el detalle de esos partidos el marcador aparece como "sin dato".

**Goles sin autor.** En 10 partidos de Diagonales 2016 hay menos goles cargados que en el marcador (faltan 14 en total). La app muestra el marcador real y, debajo, los goles que tienen autor más "N goles sin autor cargado".

**"En Contra" (jugador 32).** Son goles en contra de los rivales a nuestro favor (hay 3). Cuentan en el marcador y aparecen en el partido como "Gol en contra", pero no son un jugador: no está en la lista de jugadores ni en ningún ranking.

**Partidos jugados de un jugador.** Cuenta si fue titular, suplente, arquero o hizo un gol en ese partido. "Años en el club" = primer y último año en que jugó.

**Copa.** Los partidos de copa no tienen fecha (`matchday`); se muestra la fase (`64vos`, `16vos`, etc.).

**Fechas y hora.** Todas vienen con zona `-03` (Argentina no tiene horario de verano desde 2009). Se guardan como `2016-03-12T13:00:00-03:00` y la app las muestra en hora de Buenos Aires.

**Nombre de las ediciones.** Armé nombres como "Rock and Gol 2018 · Torneo 3". La copa (edición 0) queda como "Copa Rock and Gol 2017".

**Títulos.** En la base, las únicas ediciones con `position = 1` son justo `RnG-2018-03`, `RnG-2021-03` y `RnG-2022-01`, así que coinciden con lo que me pasaste. Uso tus etiquetas: "2018/19" (ese torneo se jugó de octubre 2018 a marzo 2019), "2021" y "2022".

**Campos que no paso a la app.** `priority` y `priority_player` de los jugadores (parecen ser para ordenar en el admin viejo), los links viejos de Drive (`stats_match.media`, `stats_goal.link`) y todas las tablas `auth_*`, `django_*` y `admin_interface_*`.

**Archivos JSON.** Un índice liviano `matches.json` (para la lista y los filtros) y un archivo por partido en `matches/<id>.json` (se carga cuando abrís el partido). Los rankings y datos curiosos ya vienen calculados en `stats.json`. Total: 1,2 MB, pero la pantalla de inicio solo necesita unos pocos KB.

**Tests sin instalar nada.** Los tests usan solo Python (`python3 -m unittest discover -s tests -v`), no hace falta instalar `pytest`.

## Hito 2 — Identidad visual

**Colores del escudo** (sacados con `scripts/extract_palette.py`): celeste `#5FBDF5`, dorado `#C3A166` y blanco. Los colores viejos del admin (`#110A78`, `#F5DD5D`, `#13BEBE`) no se usan; el control de contraste avisa si alguno vuelve a aparecer.

**Por qué hay versiones oscuras.** El celeste y el dorado del escudo son claros: como letra sobre blanco no se leen bien (contraste 2,1:1 y 2,4:1; el mínimo es 4,5:1). Para texto y botones en modo claro uso celeste oscuro `#0A6DA8` y dorado oscuro `#806432`, del mismo tono que los del escudo. En modo oscuro sí alcanza el celeste original. Los colores del escudo tal cual quedan para fondos, bordes y detalles.

**Todos los colores en un solo archivo:** `src/styles/tokens.css`. `python3 scripts/check_contrast.py` revisa 27 combinaciones de texto y fondo en modo claro y oscuro: todas pasan el mínimo WCAG AA. La hoja de muestras está en `docs/paleta.html` (se genera con `scripts/make_palette_preview.py`).

**Fondo de los íconos: celeste profundo `#074E78`.** Probé blanco, celeste, negro y celeste profundo. Sobre celeste el borde del escudo se pierde y el blanco queda pálido en la pantalla de inicio; con el celeste profundo el dorado resalta.

**Tipografía.** La del sistema (en iPhone, San Francisco), así se siente como una app de iOS y no se descarga nada de afuera. Para el nombre del club uso la serif del sistema (en iPhone, "New York"), que recuerda a las letras del escudo. Los números de estadísticas usan cifras de ancho fijo (`.tabular`) para que las columnas queden alineadas.

**Íconos generados** (`scripts/make_icons.py`): `public/logo.png` (20 KB, transparente), íconos de la PWA de 192 y 512 (normal y "maskable", con el escudo dentro de la zona segura para que Android no lo recorte), `apple-touch-icon.png` de 180, favicons, y para Capacitor `resources/icon.png` (1024, sin transparencia, como pide la App Store) más `splash.png` / `splash-dark.png` (2732).

## Hito 3 — Esqueleto de la app

**Herramientas:** Vite + React + TypeScript, como pediste. No sumé librerías de íconos ni de componentes: los íconos de la barra son dibujos SVG propios y los estilos son CSS común. Así la app pesa poco (unos 85 KB comprimida) y no depende de nadie.

**Navegación:** `HashRouter` (las direcciones quedan como `…/#/partidos/12`), que funciona en GitHub Pages y en Capacitor sin configurar nada. Barra inferior con Inicio · Partidos · Jugadores · Torneos · Más. Rivales, Títulos y Datos curiosos se abren desde Más (Títulos también desde Torneos e Inicio), y mientras estás en esas pantallas queda marcada la pestaña correspondiente. Las pantallas de detalle tienen "‹ Atrás" arriba, como en iOS.

**Pantallas de este hito:** Inicio y Más ya funcionan con datos reales. Las demás muestran "En construcción" hasta el hito 4.

**No invento datos:** no puse "La Plata" en ningún texto de la app porque no está en la base (solo sé que vos vivís ahí). Si querés que diga la ciudad, decime.

**Modo sin conexión:** un service worker propio (`sw/sw.template.js`), sin librerías. Al instalarse guarda la app y todos los datos (268 archivos, unos 1,3 MB), así después anda sin conexión. Fotos y videos de Drive siguen necesitando internet. Los datos se muestran desde lo guardado y se actualizan en segundo plano ("stale-while-revalidate"). Cada build tiene una versión nueva y borra lo viejo. Dentro de Capacitor no se activa, porque ahí los archivos ya están en el teléfono.

**Versión de la app:** sale de `package.json` (`0.1.0`) y se ve en Más.

**Links externos:** todos pasan por `src/lib/openExternal.ts`, que además ignora cualquier link que no sea `https`.

**Tests:** `npm test` corre los de la lógica (récord, rankings, fechas en hora argentina) y compara el récord calculado en la app con el del script de datos.

## Hito 4 — Pantallas

**Partidos.** Lista agrupada por año (el año queda fijo arriba al bajar) con el récord de cada año. A la vista quedan la búsqueda (por rival o torneo) y los circuitos; año, torneo, resultado, "con goles en video" y "con fotos" están en "Más filtros". Los filtros se guardan en la dirección: si entrás a un partido y volvés, siguen puestos. Arriba de la lista se ve el récord de lo filtrado. No hizo falta "virtualizar" la lista: con 243 partidos anda fluido en el celular.

**Detalle de partido.** Marcador grande, resultado, fecha y hora (en hora de Buenos Aires), torneo y fecha o fase de copa. Debajo, botón de fotos, goles (autor, asistencia, penal o tiro libre, tiempo, marcador parcial y "▶ Ver gol"), tarjetas, titulares y suplentes, datos del partido (cancha, camiseta, arquero, esquema, clima) y las notas de la base. Al final, botones al partido anterior y al siguiente.
- Si la carpeta de fotos se asoció por fecha y rival (no venía en la base), lo aclara en chiquito.
- En los 15 partidos sin carpeta el botón no aparece.
- Los goles sin autor se muestran como "N goles sin autor cargado".
- Los goles en contra de los rivales aparecen como "Gol en contra (del rival)".

**Video de gol.** Se abre en una ventana encima de la pantalla con el reproductor de Drive. Se cierra con ✕, tocando afuera o con Escape. Desde la base no hay forma de saber si un video se grabó vertical, así que hay un botón "Ver vertical / Ver horizontal" para acomodarlo sin deformarlo, además de "Abrir en Drive". Si Drive tarda más de 8 segundos, aparece un aviso sugiriendo abrirlo en Drive.

**Fotos del partido:** el botón abre la carpeta de Drive con `openExternal`. No puse la vista de carpeta incrustada (`embeddedfolderview`): en celular se ve chica y suele pedir abrir Drive igual. Si la querés, se puede agregar.

**Jugadores.** Dos vistas: Plantel (búsqueda; orden por goles, partidos o A–Z) y Rankings (goleadores históricos, por circuito, por año o por torneo; asistencias; presencias; arqueros; tarjetas). Los empates comparten puesto. La ficha muestra:
- partidos, goles, asistencias, titular o suplente, promedio de gol, tarjetas, penales y tiros libres;
- años en el club y circuitos;
- si atajó: partidos al arco, vallas invictas y goles recibidos;
- un gráfico de goles por año, sus goles en video y la lista de sus partidos.

**Rivales.** Lista con búsqueda y orden (jugados, ganados, perdidos, A–Z). La ficha tiene el historial y la lista de partidos. Hay 159 equipos en la base, pero la lista muestra 158: uno no tiene partidos cargados.

**Torneos.** Por circuito, cada edición con su récord, su zona y el puesto final si está en la base ("★ Campeón" en los 3 títulos). No hay tablas de posiciones porque la base no las tiene. En el torneo RnG 2024-4 aparecen las 3 carpetas de fotos de partidos que no están cargados, sin resultado.

**Títulos.** Las 3 tarjetas (2018/19, 2021, 2022), con su récord, el acceso a los partidos y "🏆 Festejos" en 2021 y 2022.

**Datos curiosos.**
- Rachas: 12 triunfos seguidos y 14 partidos invicto.
- 66 hat-tricks, goles de penal y de tiro libre, y goles en contra de los rivales.
- La goleada más grande, la derrota más dura y el partido con más goles.
- Récord según camiseta, clima y esquema.
- `caco_level` y `toletole` no se usan (ver más abajo).

**Nombres de jugadores:** completos, tal cual están en la base (decisión de René, 09/11/2026). La web es pública: cualquiera con el link los ve.

## Hito 5 — Pulido y verificación

**Verificación automática con Playwright** (`npm run build && npm run e2e`). Abre la app compilada en un Chrome de verdad, a 390×844 y como si fuera un celular táctil, y en cada una de las 17 pantallas:
- saca captura en modo claro (y en oscuro de las principales) → `docs/capturas/`;
- revisa que no haya errores de JavaScript;
- pasa la revisión de accesibilidad **axe** (reglas WCAG 2.1 AA);
- verifica que todo lo que se toca tenga al menos 44 px.

El navegador de la prueba está en hora de Madrid a propósito: así se comprueba que las fechas igual salen en hora de Buenos Aires.

**Modo sin conexión: tenía un error y está corregido.** La primera prueba real falló: el service worker guardaba todo, pero al cortar internet la app quedaba en blanco. El servidor responde con `Vary: Origin` y el JS principal se pide con ese encabezado, así que lo guardado "no coincidía". Ahora se busca ignorando `Vary`. La prueba carga la app una vez, corta internet y abre Inicio, la lista, dos partidos, una ficha, un torneo y Datos curiosos: todo anda.

**Accesibilidad corregida en este hito:**
- Los links dentro de un texto ("Asistencia: Fulano", "ver ranking") ahora están subrayados, para no depender solo del color.
- El cuadradito de tarjeta amarilla o roja ahora se anuncia bien en lectores de pantalla.
- Los nombres de la alineación y de los goleadores tienen un área de toque de 44 px. Se ven igual que antes.

**Auditoría de publicación** (`python3 scripts/audit_public.py`). Busca en todo lo que se publica los IDs del Drive viejo (los de la base y los `old_*` del mapa), los datos de las cuentas del admin, cualquier mail o contraseña y los colores viejos. Resultado: 0 problemas en 553 archivos.

**Capturas:** quedan en `docs/capturas/` (22 imágenes, 3,3 MB). No se publican en la web; son para que veas cómo quedó.

## Buscar y Estadísticas (pedido después del hito 6)

**Pestañas nuevas.** iOS recomienda hasta 5 pestañas, así que quedaron **Inicio · Partidos · Buscar · Estadísticas · Más**. Jugadores, Torneos, Títulos, Rivales y Datos curiosos pasaron a **Más**, y además se llega a todos desde Buscar y desde Estadísticas.

**Buscar.** Busca jugadores, rivales, torneos (por nombre o código, como `RnG-2018-03`), circuitos, años, canchas y camisetas, sin importar tildes ni mayúsculas. Si hay un resultado claro (nombre exacto, o uno solo), lo muestra desplegado arriba:
- un **jugador**, con sus números (partidos, goles, asistencias, tarjetas, goles en video, cómo le fue al equipo con él en cancha) y accesos a su ficha y a sus estadísticas;
- un **rival, torneo, año, cancha o camiseta**, con el récord y **todos los partidos**.

Si hay varios parecidos (por ejemplo "Echegaray": Manuel y Valentino), los muestra a todos agrupados por tipo, sin elegir por vos. La búsqueda queda en la dirección, así al volver de un partido sigue ahí.

**Estadísticas.** Un explorador: elegís "Todo el club" o un jugador y lo cruzás con cualquier combinación de circuito, torneo, año, cancha, rival y camiseta. Cada menú ofrece solo opciones que tienen partidos con lo ya elegido, y tocando cualquier fila de un desglose o un nombre de un ranking se agrega ese filtro.
- **Club:** récord, promedios, goles de penal y tiro libre, rachas, mejor victoria y peor derrota, rankings (goleadores, asistencias, presencias, tarjetas, arqueros), desglose por año, circuito, torneo, cancha, camiseta y rival, y la lista de partidos.
- **Jugador:** sus números, cómo le fue al equipo cuando jugó, como arquero, **todos sus goles** (con "▶ Ver gol" y filtro "solo con video"), **todas sus tarjetas**, "socios" (quién le dio más asistencias y a quién asistió más), desglose por año, circuito, torneo, cancha y rival (partidos y goles) y sus partidos.

**Ficha del jugador.** Ahora también lista todos sus goles y todas sus tarjetas, con un botón a sus estadísticas filtrables.

**Datos para esto:** `public/data/facts.json` (35 KB), un resumen de cada partido (cancha, camiseta, arquero, alineación, goles, tarjetas) que genera `build_data.py`. Así las estadísticas se calculan en el celular, sin bajar los 243 archivos de partido, y andan sin conexión. Los tests comparan estos cálculos con los del script de datos para los 57 jugadores.

**`toletole` y `caco_level`:** a pedido de René, se ignoran por completo. El script no los pasa a los datos y la app no los muestra.
