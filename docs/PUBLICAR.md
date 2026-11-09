# Publicar la app en internet (GitHub Pages)

La app se publica gratis en GitHub Pages. Una vez armado, **cada vez que subas cambios a GitHub la web se actualiza sola** en 1 o 2 minutos.

Dirección final: **https://renesps.github.io/les-molestes/**

> Ojo: la web es **pública**. Cualquiera que tenga el link ve los partidos, los nombres de los jugadores y los links a las fotos de Drive. El `dump.sql` **no** se sube nunca (está excluido en `.gitignore`).

---

## Estado

✅ **Publicada el 09/11/2026** en https://renesps.github.io/les-molestes/ (repo: https://github.com/renesps/les-molestes). Lo que sigue es para referencia o por si hay que rehacerlo.

## Opción A: que lo haga Claude (lo más fácil)

Tu computadora ya tiene GitHub conectado con la cuenta **renesps**. Pedile a Claude "publicalo" y él:

1. crea el repositorio `les-molestes` (público) en tu cuenta,
2. sube el proyecto,
3. activa GitHub Pages,
4. espera a que termine y te pasa el link.

## Opción B: a mano, paso a paso

Abrí la Terminal en la carpeta del proyecto (`Documentos/les-molestes`).

**1. Revisá que el dump no se vaya a subir.** Este comando no tiene que mostrar nada:

```bash
git ls-files | grep -E "dump|drive_map|\.zip"
```

**2. Creá el repositorio en GitHub y subí todo** (un solo comando):

```bash
gh repo create les-molestes --public --source=. --push --description "Club Social y Deportivo Les Molestes"
```

Si preferís hacerlo desde la web: entrá a https://github.com/new, en *Repository name* poné `les-molestes`, elegí **Public**, **no** marques "Add a README", tocá *Create repository* y después corré:

```bash
git remote add origin https://github.com/renesps/les-molestes.git
```

```bash
git push -u origin main
```

**3. Activá GitHub Pages.**

1. Entrá a https://github.com/renesps/les-molestes/settings/pages
2. En **Build and deployment → Source** elegí **GitHub Actions**. No hace falta tocar nada más.

**4. Esperá la primera publicación.**

1. Entrá a https://github.com/renesps/les-molestes/actions
2. Vas a ver "Publicar en GitHub Pages" corriendo (círculo amarillo). Si quedó en gris sin arrancar, entrá y tocá **Re-run all jobs**.
3. Cuando aparezca el tilde verde ✅ (1 o 2 minutos), la app está en **https://renesps.github.io/les-molestes/**

**5. Instalala en el iPhone.**

1. Abrí el link en **Safari**.
2. Tocá el botón de compartir (cuadrado con flecha) → **Agregar a pantalla de inicio**.
3. Aparece el ícono del escudo con el nombre "Les Molestes". Abierta desde ahí se ve como una app y, después de la primera vez, anda sin conexión (menos las fotos y videos de Drive).

En Android: Chrome → menú ⋮ → **Instalar app**.

---

## Después: subir cambios

Cada vez que cambies algo (por ejemplo, datos nuevos, ver `ACTUALIZAR_DATOS.md`):

```bash
git add -A && git commit -m "Datos actualizados" && git push
```

La web se actualiza sola. En los celulares donde ya estaba instalada se actualiza la próxima vez que la abran con internet (a veces hay que cerrarla y abrirla dos veces).

## Si algo sale mal

- **La publicación terminó con una ❌ roja:** entrá al paso que falló en la pestaña *Actions* y leé el mensaje. Antes de publicar, GitHub corre los mismos controles que en tu compu: las cifras de los datos, que no se publique nada privado, el contraste de colores y los tests. Si alguno no da, no publica (a propósito). Pasale el mensaje a Claude.
- **Falló con "Internal server error" y el paso "deploy" ni arrancó:** es un error de GitHub, no del proyecto (pasó en la primera publicación, el 09/11/2026). Se arregla borrando el entorno de publicación y volviendo a correr:
  ```bash
  gh api -X DELETE repos/renesps/les-molestes/environments/github-pages
  ```
  ```bash
  gh workflow run "Publicar en GitHub Pages" --repo renesps/les-molestes
  ```
- **La página dice 404:** revisá que en *Settings → Pages* la fuente sea **GitHub Actions** y que la última publicación tenga tilde verde.
- **Veo una versión vieja:** cerrá la app y volvé a abrirla con internet. En la compu, recargá con Cmd+Shift+R.
