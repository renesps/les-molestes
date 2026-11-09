#!/usr/bin/env python3
"""Saca los colores principales del escudo (input/Escudo.png).

Uso: python3 scripts/extract_palette.py
Imprime los colores dominantes (ignorando el fondo transparente) con su %.
Necesita Pillow (viene con muchas instalaciones de Python; si no: pip3 install pillow).
"""
from collections import Counter
from pathlib import Path

from PIL import Image

def _px(im):
    return list(getattr(im, "get_flattened_data", im.getdata)())


SRC = Path(__file__).resolve().parent.parent / "input" / "Escudo.png"


def main():
    img = Image.open(SRC).convert("RGBA")
    alpha = img.getchannel("A")
    print(f"Tamaño: {img.size}, píxeles transparentes: "
          f"{sum(1 for a in _px(alpha) if a < 16) / (img.width * img.height):.0%}")
    opaque = [p[:3] for p in _px(img) if p[3] > 240]
    # cuantizar a 6 colores sobre los píxeles opacos
    strip = Image.new("RGB", (len(opaque), 1))
    strip.putdata(opaque)
    q = strip.quantize(colors=6, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette()
    counts = Counter(_px(q))
    total = sum(counts.values())
    for idx, n in counts.most_common():
        r, g, b = pal[idx * 3: idx * 3 + 3]
        print(f"#{r:02X}{g:02X}{b:02X}  {n / total:6.1%}")


if __name__ == "__main__":
    main()
