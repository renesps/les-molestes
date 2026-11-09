# Club Social y Deportivo Les Molestes: la app

Web app para navegar toda la historia del equipo: 243 partidos (2016–2024), 794 goles, 105 goles en video, jugadores, rivales, torneos, títulos y fotos. Se instala en el celular como una app y anda sin conexión (menos las fotos y videos, que están en Google Drive).

## Las guías

| Guía | Para qué |
|---|---|
| [PUBLICAR.md](PUBLICAR.md) | Subirla a internet (GitHub Pages) e instalarla en el celular |
| [ACTUALIZAR_DATOS.md](ACTUALIZAR_DATOS.md) | Cargar un dump nuevo de la base o fotos nuevas |
| [IOS.md](IOS.md) | Convertirla en app de iOS (App Store / TestFlight) |
| [DECISIONES.md](DECISIONES.md) | Todo lo que se decidió y por qué |
| [DATOS_INCONSISTENTES.md](DATOS_INCONSISTENTES.md) | Lo raro que tiene la base vieja (no se "arregló" nada) |
| [capturas/](capturas/) | Cómo se ve cada pantalla en el celular |

## Comandos útiles

Todos se corren en la Terminal, dentro de la carpeta del proyecto. La primera vez, instalá las dependencias:

```bash
npm install
```

Ver la app en tu compu mientras la cambiás (se abre en http://localhost:5173):

```bash
npm run dev
```

Probar la versión final, igual a la que se publica (http://localhost:4173):

```bash
npm run build && npm run preview
```

Revisar todo antes de publicar:

```bash
npm test && python3 -m unittest discover -s tests && npm run build && npm run e2e
```

## Qué hay en cada carpeta

| Carpeta | Qué tiene |
|---|---|
| `input/` | Archivos originales: `dump.sql` y `drive_map.json` (**privados, no se suben**) y el escudo |
| `scripts/` | Programas: generar datos, íconos, revisar contraste, auditar, probar la app |
| `public/data/` | Los datos ya preparados que usa la app (sí se suben) |
| `public/` | Logo, íconos y manifest de la app instalable |
| `src/` | El código de la app (pantallas en `src/screens/`, colores en `src/styles/tokens.css`) |
| `sw/` | El service worker (lo que la hace andar sin conexión) |
| `resources/` | Ícono 1024 y pantallas de carga para la futura app de iOS |
| `tests/` | Controles de las cifras de los datos |
| `docs/` | Estas guías y las capturas |

## Lo que la app no tiene (a propósito)

No tiene servidor, base de datos en internet, login, analytics ni servicios de terceros. Los únicos sitios externos son Google Drive (fotos y videos) e Instagram (el link de @lesmolestes).
