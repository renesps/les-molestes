# Actualizar los datos

La app **no** lee la base de datos directamente. Los datos salen de archivos ya preparados en `public/data/`, que se generan **en tu computadora** a partir del `dump.sql`. Esos archivos sí se suben a GitHub; el `dump.sql` no (tiene datos privados).

Cuándo hace falta: cuando tengas un dump nuevo de la base (partidos nuevos, correcciones) o un `drive_map.json` nuevo (fotos y videos nuevos).

## Pasos

Abrí la Terminal en la carpeta del proyecto (`Documentos/les-molestes`).

**1. Poné los archivos nuevos en `input/`**, con estos nombres exactos:

- `input/dump.sql`: el dump de Postgres
- `input/drive_map.json`: el mapa de Drive

**2. Regenerá los datos:**

```bash
python3 scripts/build_data.py
```

Si todo da bien, termina con algo como `OK: 243 partidos, 794 goles…`. Si algo no cierra, se corta con un mensaje en castellano y **no cambia nada**.

> **Importante:** el script tiene "cifras de control" (243 partidos, 794 goles, 105 goles con video, etc.) para detectar si algo se rompió. **Cuando agregues partidos nuevos, esas cifras van a cambiar a propósito**, y el script se va a frenar diciendo qué cifra no da. Es normal: actualizá los números esperados en `scripts/build_data.py` (bloque `EXPECTED`, al principio) y en `tests/test_data.py`, o pedile a Claude que lo haga revisando que los números nuevos tengan sentido.

**3. Revisá las inconsistencias.** El script reescribe `docs/DATOS_INCONSISTENTES.md` con lo raro que encontró (resultados incompletos, goles sin autor, etc.). Leelo por si apareció algo nuevo.

**4. Corré los controles:**

```bash
python3 -m unittest discover -s tests -v
```

```bash
python3 scripts/audit_public.py
```

```bash
npm run build && npm run e2e
```

El primero revisa las cifras, el segundo que no se publique nada privado y el tercero prueba la app entera en un Chrome simulado de celular (también actualiza las capturas de `docs/capturas/`).

**5. Subí los cambios** (se publica solo, ver `PUBLICAR.md`):

```bash
git add -A && git commit -m "Datos actualizados" && git push
```

## Cosas a tener en cuenta

- **Títulos:** el palmarés usa la lista fija de `TITLE_CODES` en `scripts/build_data.py` (`RnG-2018-03`, `RnG-2021-03`, `RnG-2022-01`). Si salen campeones de nuevo 🏆, agregá el código ahí (y la etiqueta, por ejemplo `"RnG-2025-02": "2025"`).
- **Fotos de partidos no cargados:** las carpetas de `drive_folders_without_db_match` del mapa aparecen en la pantalla del torneo. Cuando cargues esos partidos en la base y regeneres el mapa, pasan a tener su propio botón.
- **Los IDs viejos de Drive** que vienen en la base se ignoran siempre; la app usa solo el `drive_map.json`.
- **Si cambia la estructura de la base** (tablas o columnas nuevas o renombradas), el script puede fallar: pedile a Claude que lo adapte.
