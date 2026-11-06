#!/usr/bin/env python3
"""Draws the 24x24 pixel-art logo and writes the SVG + PNG icons into public/. Run: python3 scripts/make-icons.py"""
from PIL import Image

N = 24
# Mid-tone teal tile: stays visible on both the white and the near-black page backgrounds.
BG, NOTE, TRACK, TICK, DOT = '#0F766E', '#FFFFFF', '#0A4F49', '#CFF5EE', '#F2B84B'
px: dict[tuple[int, int], str] = {}


def rect(x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            px[(x, y)] = c


# Eighth note: stem, flag, head
rect(12, 3, 13, 14, NOTE)
for y, (a, b) in {3: (14, 17), 4: (14, 18), 5: (16, 19), 6: (17, 20), 7: (18, 20), 8: (18, 20), 9: (17, 19)}.items():
    rect(a, y, b, y, NOTE)
for y, (a, b) in {12: (8, 11), 13: (7, 12), 14: (7, 12), 15: (8, 11)}.items():
    rect(a, y, b, y, NOTE)
# Tuner bar: track, centre tick, dot a little sharp of centre
rect(3, 19, 20, 20, TRACK)
rect(11, 17, 12, 22, TICK)
rect(13, 18, 16, 21, DOT)


def image() -> Image.Image:
    im = Image.new('RGB', (N, N), BG)
    for (x, y), c in px.items():
        im.putpixel((x, y), tuple(int(c[i : i + 2], 16) for i in (1, 3, 5)))
    return im


def png(path: str, size: int, scale: int):
    """Integer scale keeps every logo pixel the same size; the rest is background padding."""
    art = image().resize((N * scale, N * scale), Image.NEAREST)
    out = Image.new('RGB', (size, size), BG)
    off = (size - N * scale) // 2
    out.paste(art, (off, off))
    out.save(path)


def svg(path: str):
    rects = ''.join(f'<rect x="{x}" y="{y}" width="1" height="1" fill="{c}"/>' for (x, y), c in sorted(px.items(), key=lambda k: (k[0][1], k[0][0])))
    open(path, 'w').write(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {N} {N}" shape-rendering="crispEdges">'
        f'<rect width="{N}" height="{N}" fill="{BG}"/>{rects}</svg>\n'
    )


svg('public/icon.svg')
png('public/icon-192.png', 192, 8)
png('public/icon-512.png', 512, 21)
png('public/icon-maskable-512.png', 512, 16)  # art inside the 80% safe zone
png('public/apple-touch-icon.png', 180, 7)
print('wrote', sorted(__import__('os').listdir('public')))
