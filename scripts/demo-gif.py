#!/usr/bin/env python3
"""Put the frames from scripts/demo-gif.mjs together as an animated GIF.

Usage: demo-gif.py <frames dir> <out.gif> [width]

Needs Pillow. One shared palette for every frame, so the colours do not
flicker between scenes; the width defaults to 360 px (a phone, at README size).
"""
import json
import sys
from pathlib import Path

from PIL import Image

frames_dir, out = Path(sys.argv[1]), Path(sys.argv[2])
width = int(sys.argv[3]) if len(sys.argv) > 3 else 360
spec = json.loads((frames_dir / "frames.json").read_text())

images = []
for f in spec:
    im = Image.open(frames_dir / f["file"]).convert("RGB")
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    images.append(im)

# A palette taken from all frames at once, then applied to each.
strip = Image.new("RGB", (width, sum(i.height for i in images)))
y = 0
for im in images:
    strip.paste(im, (0, y))
    y += im.height
palette = strip.quantize(colors=128, method=Image.Quantize.MEDIANCUT)
paletted = [im.quantize(palette=palette, dither=Image.Dither.NONE) for im in images]

paletted[0].save(
    out,
    save_all=True,
    append_images=paletted[1:],
    duration=[f["ms"] for f in spec],
    loop=0,
    optimize=True,
    disposal=1,
)
print(f"{out}: {len(paletted)} frames, {out.stat().st_size // 1024} kB")
