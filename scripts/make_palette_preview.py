#!/usr/bin/env python3
"""Genera docs/paleta.html: muestras de colores (claro y oscuro) leídas de tokens.css.
El HTML es autocontenido (CSS e imágenes adentro) para abrirlo con doble clic.

Uso: python3 scripts/make_palette_preview.py  → abrir docs/paleta.html en el navegador.
"""
import base64
import re
from pathlib import Path

from check_contrast import ratio  # mismo cálculo WCAG

ROOT = Path(__file__).resolve().parent.parent
CSS = ROOT / "src" / "styles" / "tokens.css"
OUT = ROOT / "docs" / "paleta.html"


def tokens(block):
    return dict(re.findall(r"(--[\w-]+):\s*(#[0-9A-Fa-f]{6})\b", block))


css = CSS.read_text(encoding="utf-8")
light_block, dark_block = css.split("@media (prefers-color-scheme: dark)")
light = tokens(light_block)
dark = {**light, **tokens(dark_block)}

SWATCHES = [
    ("Primario", "--primary", "--on-primary"),
    ("Primario suave", "--primary-container", "--on-primary-container"),
    ("Dorado", "--accent", "--on-accent"),
    ("Dorado suave", "--accent-container", "--on-accent-container"),
    ("Fondo", "--background", "--text"),
    ("Superficie", "--surface", "--text"),
    ("Superficie 2", "--surface-2", "--text-secondary"),
    ("Ganado", "--win", "--on-result"),
    ("Empatado", "--draw", "--on-result"),
    ("Perdido", "--loss", "--on-result"),
]


def data_uri(rel):
    return "data:image/png;base64," + base64.b64encode((ROOT / rel).read_bytes()).decode()


LOGO = data_uri("public/logo.png")
ICON = data_uri("public/icons/icon-192.png")


def vars_css(t):
    return ";".join(f"{k}:{v}" for k, v in t.items())


def column(title, t):
    cells = "".join(
        f'<div class="sw" style="background:{t[bg]};color:{t[fg]}">'
        f'<b>{name}</b><span>{bg} {t[bg]}</span><span>texto {t[fg]} · {ratio(t[fg], t[bg]):.1f}:1</span></div>'
        for name, bg, fg in SWATCHES)
    return f'''<section class="col" style="{vars_css(t)}">
  <h2>{title}</h2>
  <div class="hdr"><img src="{LOGO}" alt=""><div><div class="display">Club Social y Deportivo<br>Les Molestes</div>
  <div class="sub">243 partidos · 148 G · 31 E · 64 P</div></div></div>
  <div class="card"><div class="row"><span class="date tabular">28/09/2024</span><span class="badge v">V</span></div>
  <div class="score tabular">Les Molestes 6 – 2 Rival</div>
  <div class="row"><button class="btn">▶ Ver gol</button><button class="btn ghost">📷 Fotos</button></div>
  <p class="muted">Texto secundario de ejemplo · Rock and Gol 2024 · Torneo 4</p>
  <p class="gold">★ Campeón 2021</p></div>
  <div class="grid">{cells}</div>
</section>'''


html = f'''<!doctype html>
<html lang="es-AR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Paleta Les Molestes</title>
<style>{css}</style>
<style>
body{{margin:0;font-family:var(--font-sans);background:#888}}
.top{{display:flex;gap:12px;flex-wrap:wrap;padding:16px;background:#fff;align-items:center}}
.brand{{width:120px;height:72px;border-radius:12px;display:flex;align-items:end;padding:8px;box-sizing:border-box;font:600 13px var(--font-sans)}}
.wrap{{display:flex;flex-wrap:wrap}}
.col{{flex:1 1 360px;background:var(--background);color:var(--text);padding:16px}}
h2{{margin:0 0 12px;font-size:var(--text-lg)}}
.hdr{{display:flex;gap:12px;align-items:center;margin-bottom:12px}}
.hdr img{{height:72px}}
.display{{font-family:var(--font-display);font-weight:700;font-size:var(--text-lg);line-height:1.15}}
.sub,.muted{{color:var(--text-secondary);font-size:var(--text-sm)}}
.card{{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-4);margin-bottom:12px}}
.row{{display:flex;gap:8px;align-items:center;justify-content:space-between}}
.score{{font-size:var(--text-xl);font-weight:700;margin:8px 0}}
.badge{{min-width:28px;height:28px;border-radius:8px;display:grid;place-items:center;font-weight:700;color:var(--on-result)}}
.badge.v{{background:var(--win)}}
.btn{{min-height:var(--tap-min);padding:0 16px;border-radius:var(--radius-pill);border:0;background:var(--primary);color:var(--on-primary);font:600 var(--text-md) var(--font-sans);flex:1}}
.btn.ghost{{background:var(--primary-container);color:var(--on-primary-container)}}
.gold{{color:var(--accent);font-weight:700;margin:4px 0 0}}
.grid{{display:grid;grid-template-columns:1fr 1fr;gap:8px}}
.sw{{border-radius:var(--radius-md);padding:10px;display:flex;flex-direction:column;gap:2px;font-size:12px;border:1px solid var(--border)}}
.sw b{{font-size:14px}}
</style></head><body>
<div class="top">
  <div class="brand" style="background:{light['--brand-celeste']};color:{light['--on-brand-celeste']}">Celeste {light['--brand-celeste']}</div>
  <div class="brand" style="background:{light['--brand-gold']};color:{light['--on-brand-gold']}">Dorado {light['--brand-gold']}</div>
  <div class="brand" style="background:#fff;border:1px solid #ccc;color:#0F1C26">Blanco #FFFFFF</div>
  <div class="brand" style="background:#074E78;color:#fff">Fondo ícono #074E78</div>
  <img src="{ICON}" alt="Ícono" style="height:72px;border-radius:16px">
</div>
<div class="wrap">{column("Modo claro", light)}{column("Modo oscuro", dark)}</div>
</body></html>
'''
OUT.write_text(html, encoding="utf-8")
print(f"OK: {OUT.relative_to(ROOT)}")
