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
