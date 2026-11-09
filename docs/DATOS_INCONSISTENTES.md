# Datos inconsistentes

Generado automáticamente por `scripts/build_data.py`. **Nada de esto se "arregló"**: la app muestra lo que dice la base y, si falta algo, dice "sin dato".

Total de observaciones: **14**.

## Partidos sin resultado completo en la base (2)

Si falta el marcador, la app muestra "sin dato". Para el récord (G/E/P) se usa el campo `final` de la base (Victoria/Empate/Derrota) cuando existe.

- Partido 220 · 24/09/2016 vs Berlincha (Diag-2016-03) — Resultado incompleto en la base: 'None-None'. Se muestra 'sin dato' en lo que falte.
- Partido 223 · 22/10/2016 vs Brillante (Diag-2016-04) — Resultado incompleto en la base: '1-None'. Se muestra 'sin dato' en lo que falte.

## Tarjetas incompletas (1)

- Partido 28 · 16/09/2017 vs Sudestada (RnG-2017-02) — Tarjeta roja (id 2) sin tipo (directa / doble amarilla)

## Notas en fichas de jugadores (1)

- Nota en la ficha de Manuel Echegaray: "Goles en diagonales: 70. Figuran 63."

## Partidos con menos goles detallados que el marcador (falta saber quién los hizo) (10)

La app muestra el resultado real y solo los goles que tienen autor; el resto aparece como "gol sin autor cargado". No se inventa nada.

- Partido 194 · 24/03/2016 vs Club de Remo (Diag-2016-01) — Marcador 3 a favor, 2 goles con autor cargado (faltan 1)
- Partido 195 · 09/04/2016 vs Inter (Diagonales) (Diag-2016-01) — Marcador 3 a favor, 2 goles con autor cargado (faltan 1)
- Partido 196 · 16/04/2016 vs La Granja (Diag-2016-01) — Marcador 7 a favor, 5 goles con autor cargado (faltan 2)
- Partido 208 · 20/06/2016 vs Eibar (Diag-2016-02) — Marcador 5 a favor, 3 goles con autor cargado (faltan 2)
- Partido 209 · 25/06/2016 vs La Granja (Diag-2016-02) — Marcador 2 a favor, 1 goles con autor cargado (faltan 1)
- Partido 213 · 06/08/2016 vs Brillante (Diag-2016-03) — Marcador 2 a favor, 1 goles con autor cargado (faltan 1)
- Partido 215 · 15/08/2016 vs Marroneros (Diag-2016-03) — Marcador 5 a favor, 3 goles con autor cargado (faltan 2)
- Partido 216 · 20/08/2016 vs Gambeta (Diag-2016-03) — Marcador 2 a favor, 1 goles con autor cargado (faltan 1)
- Partido 219 · 17/09/2016 vs ADN (Diag-2016-03) — Marcador 2 a favor, 0 goles con autor cargado (faltan 2)
- Partido 223 · 22/10/2016 vs Brillante (Diag-2016-04) — Marcador 1 a favor, 0 goles con autor cargado (faltan 1)

## Controles que dieron bien (0 casos)

- Resultado que no coincide con los goles a favor/en contra o con el campo 'final'
- Más goles cargados que los del marcador
- Edición y circuito que no coinciden
- Cancha de otro circuito
- Alineaciones raras
- Registros que apuntan a cosas que no existen
- Partidos sin alineación cargada
