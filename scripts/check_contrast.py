#!/usr/bin/env python3
"""Verifica contraste WCAG AA de los pares de colores de src/styles/tokens.css.

Uso: python3 scripts/check_contrast.py   (sale con error si algún par no alcanza)
Texto normal: 4.5:1 · texto grande / íconos / bordes de foco: 3:1
"""
import re
import sys
from pathlib import Path

CSS = Path(__file__).resolve().parent.parent / "src" / "styles" / "tokens.css"

# (texto, fondo, mínimo)
PAIRS = [
    ("--text", "--background", 4.5), ("--text", "--surface", 4.5), ("--text", "--surface-2", 4.5),
    ("--text-secondary", "--background", 4.5), ("--text-secondary", "--surface", 4.5),
    ("--text-secondary", "--surface-2", 4.5),
    ("--primary", "--surface", 4.5), ("--primary", "--background", 4.5),
    ("--on-primary", "--primary", 4.5),
    ("--on-primary-container", "--primary-container", 4.5),
    ("--accent", "--surface", 4.5), ("--accent", "--background", 4.5),
    ("--on-accent", "--accent", 4.5),
    ("--on-accent-container", "--accent-container", 4.5),
    ("--on-brand-celeste", "--brand-celeste", 4.5), ("--on-brand-gold", "--brand-gold", 4.5),
    ("--win", "--surface", 4.5), ("--draw", "--surface", 4.5), ("--loss", "--surface", 4.5),
    ("--win", "--win-container", 4.5), ("--draw", "--draw-container", 4.5), ("--loss", "--loss-container", 4.5),
    ("--on-result", "--win", 4.5), ("--on-result", "--draw", 4.5), ("--on-result", "--loss", 4.5),
    ("--focus-ring", "--surface", 3.0), ("--focus-ring", "--background", 3.0),
]


def lum(hexc):
    h = hexc.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def ratio(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def tokens(block):
    return dict(re.findall(r"(--[\w-]+):\s*(#[0-9A-Fa-f]{6})\b", block))


def main():
    css = CSS.read_text(encoding="utf-8")
    light_block = css.split("@media (prefers-color-scheme: dark)")[0]
    dark_block = css.split("@media (prefers-color-scheme: dark)")[1]
    light = tokens(light_block)
    dark = {**light, **tokens(dark_block)}
    fails = 0
    for name, t in (("claro", light), ("oscuro", dark)):
        print(f"\nModo {name}")
        for fg, bg, need in PAIRS:
            r = ratio(t[fg], t[bg])
            ok = r >= need
            fails += not ok
            print(f"  {'OK ' if ok else 'MAL'} {r:5.2f}:1 (≥{need})  {fg} {t[fg]} sobre {bg} {t[bg]}")
    old = [c for c in ("#110A78", "#F5DD5D", "#13BEBE") if c.lower() in css.lower()]
    if old:
        print(f"\nMAL: aparecen colores viejos del admin: {old}")
        fails += 1
    print(f"\n{'Todo OK' if not fails else f'{fails} problema(s)'}")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
