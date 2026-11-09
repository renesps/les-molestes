#!/usr/bin/env python3
"""Genera logo, íconos de la PWA, apple-touch-icon y recursos para Capacitor
a partir de input/Escudo.png.

Uso: python3 scripts/make_icons.py      (necesita Pillow)
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "input" / "Escudo.png"
PUBLIC = ROOT / "public"
ICONS = PUBLIC / "icons"
RESOURCES = ROOT / "resources"

ICON_BG = "#074E78"  # celeste profundo (derivado del celeste del escudo)


def load_crest():
    im = Image.open(SRC).convert("RGBA")
    bbox = im.getchannel("A").point(lambda a: 255 if a > 16 else 0).getbbox()
    return im.crop(bbox)


def fit(crest, box_h):
    w = round(crest.width * box_h / crest.height)
    return crest.resize((w, box_h), Image.LANCZOS)


def square(crest, size, frac, bg, opaque=True):
    """Escudo centrado en un cuadrado. frac = alto del escudo / lado."""
    canvas = Image.new("RGBA", (size, size), bg if bg else (0, 0, 0, 0))
    s = fit(crest, round(size * frac))
    canvas.alpha_composite(s, ((size - s.width) // 2, (size - s.height) // 2))
    return canvas.convert("RGB") if opaque else canvas


def save_png(img, path, colors=None):
    """colors: reduce a N colores (paleta) para que pese menos; el escudo es plano y no se nota."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if colors:
        img = img.quantize(colors=colors, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    img.save(path, optimize=True)
    print(f"  {path.relative_to(ROOT)}  {img.width}x{img.height}  {path.stat().st_size // 1024} KB")


def main():
    crest = load_crest()
    print("Generando:")
    # Logo para usar dentro de la app (transparente, alto 512)
    save_png(fit(crest, 512), PUBLIC / "logo.png", colors=128)
    # Íconos PWA ("any": escudo grande; "maskable": dentro de la zona segura del 80 %)
    save_png(square(crest, 192, 0.80, ICON_BG), ICONS / "icon-192.png")
    save_png(square(crest, 512, 0.80, ICON_BG), ICONS / "icon-512.png")
    save_png(square(crest, 512, 0.62, ICON_BG), ICONS / "icon-maskable-512.png")
    save_png(square(crest, 192, 0.62, ICON_BG), ICONS / "icon-maskable-192.png")
    # iOS (sin transparencia; iOS redondea las esquinas solo)
    save_png(square(crest, 180, 0.78, ICON_BG), PUBLIC / "apple-touch-icon.png")
    # Favicons
    save_png(square(crest, 32, 0.90, None, opaque=False), ICONS / "favicon-32.png")
    save_png(square(crest, 48, 0.90, None, opaque=False), ICONS / "favicon-48.png")
    # Capacitor / App Store: 1024 sin transparencia + splash 2732
    save_png(square(crest, 1024, 0.78, ICON_BG), RESOURCES / "icon.png")
    save_png(square(crest, 2732, 0.30, ICON_BG), RESOURCES / "splash.png")
    save_png(square(crest, 2732, 0.30, "#0A1218"), RESOURCES / "splash-dark.png")


if __name__ == "__main__":
    main()
