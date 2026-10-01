"""Generates the Lure Block's textures: a bait crate.

Writes pack/kubejs/assets/kubejs/textures/block/lure_block_{side,top,bottom}.png
and the top's .mcmeta. The sides are an iron-cornered crate with meat pushed
through the gaps between the slats; the top is an iron grate over a red core
that pulses (8 interpolated frames). Run from the repo root:

    python tools/lure_block_art.py
"""
import json
import math
import os

from PIL import Image

OUT = os.path.join('pack', 'kubejs', 'assets', 'kubejs', 'textures', 'block')

PALETTE = {
    'K': (41, 27, 15),     # frame, darkest edge
    'F': (61, 40, 22),     # frame
    'f': (79, 53, 29),     # frame, lit
    'S': (139, 98, 56),    # slat, lit top edge
    's': (116, 80, 45),    # slat
    't': (92, 63, 35),     # slat, shade and grain
    'G': (24, 13, 8),      # gap shadow
    'M': (190, 96, 72),    # meat, light
    'm': (150, 58, 44),    # meat
    'n': (104, 36, 28),    # meat, dark
    'g': (112, 130, 52),   # rot
    'R': (158, 16, 16),    # blood
    'r': (100, 10, 10),    # blood, dark end of a drip
    'I': (204, 204, 210),  # iron, light
    'i': (150, 150, 158),  # iron
    'k': (92, 92, 100),    # iron, dark
    'o': (52, 52, 58),     # rivet
}

# Posts at x 0-1 / 14-15, beams at y 0-1 / 14-15, three 3px slats with
# shadow gaps at y 2, 6 and 10.
SIDE = [
    'IiiKKKKKKKKKKiiI',
    'iokffffffffffkoi',
    'ikFGGGGGGGGnGGFk',
    'KFSSSSSSSSSmSSfK',
    'KFsstsssssSsssfK',
    'KFtttttnmtttttfK',
    'KFGGGnmMmnGGGGfK',
    'KFSSSSSRSSSSSSfK',
    'KFsstssRssstssfK',
    'KFtttttrtttmmtfK',
    'KFGGGGGGGnmMgnfK',
    'KFSSSSSSSSSRSSfK',
    'KFssstsssssRssfK',
    'ikttttttttttttFk',
    'iokFFFFFFFFFFkoi',
    'IiiKKKKKKKKKKiiI',
]

BOTTOM = [
    'IiiKKKKKKKKKKiiI',
    'iokffffffffffkoi',
    'ikFGGGGGGGGGGGFk',
    'KFSSSSSSSSSSSSfK',
    'KFsstsssssssssfK',
    'KFttttttttttttfK',
    'KFGGGGGGGGGGGGfK',
    'KFSSSSSSSSSSSSfK',
    'KFsssssstsssssfK',
    'KFttttttttttttfK',
    'KFGGGGGGGGGGGGfK',
    'KFSSSSSSSSSSSSfK',
    'KFsssstsssssssfK',
    'ikttttttttttttFk',
    'iokFFFFFFFFFFkoi',
    'IiiKKKKKKKKKKiiI',
]

# The top's frame; '.' is the pit, drawn per frame; grate bars at x/y 5 and 10.
TOP = [
    'IiiKKKKKKKKKKiiI',
    'iokffffffffffkoi',
    'ikF..i....i..Ffk',
    'KF...i....i...fK',
    'KF.n.i....i...fK',
    'KFIiiIiiiiIiiifK',
    'KF...i....i...fK',
    'KF...i....i...fK',
    'KF...i....i...fK',
    'KF...i....i...fK',
    'KFIiiIiiiiIiiifK',
    'KF...i....i.m.fK',
    'KF...i....i..nfK',
    'ikF..i....i..Ffk',
    'iokFFFFFFFFFFkoi',
    'IiiKKKKKKKKKKiiI',
]

PIT_DARK = (30, 8, 8)
CORE_DIM = (120, 14, 12)
CORE_HOT = (255, 92, 64)
CORE_WHITE = (255, 214, 176)
FRAMES = 8
FRAMETIME = 3  # ticks per frame; the pulse takes 24 ticks


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def draw(rows):
    im = Image.new('RGBA', (16, 16))
    for y, row in enumerate(rows):
        assert len(row) == 16, (y, row)
        for x, ch in enumerate(row):
            im.putpixel((x, y), PALETTE[ch] + (255,))
    return im


def top_frame(glow):
    im = Image.new('RGBA', (16, 16))
    for y, row in enumerate(TOP):
        for x, ch in enumerate(row):
            if ch != '.':
                im.putpixel((x, y), PALETTE[ch] + (255,))
                continue
            d = math.hypot(x - 7.5, y - 7.5)
            heat = max(0.0, 1.0 - d / 6.0) ** 1.3
            c = mix(PIT_DARK, mix(CORE_DIM, CORE_HOT, glow), heat * (0.45 + 0.55 * glow))
            if d < 1.0:
                c = mix(mix(CORE_DIM, CORE_HOT, 0.6), CORE_WHITE, glow)
            # the bars shade the pit just right of and below them
            if (x in (6, 11) and y not in (5, 10)) or (y in (6, 11) and x not in (5, 10)):
                c = mix(c, PIT_DARK, 0.45)
            im.putpixel((x, y), c + (255,))
    return im


def main():
    os.makedirs(OUT, exist_ok=True)
    draw(SIDE).save(os.path.join(OUT, 'lure_block_side.png'))
    draw(BOTTOM).save(os.path.join(OUT, 'lure_block_bottom.png'))
    strip = Image.new('RGBA', (16, 16 * FRAMES))
    for i in range(FRAMES):
        glow = 0.5 - 0.5 * math.cos(2 * math.pi * i / FRAMES)
        strip.paste(top_frame(glow), (0, 16 * i))
    strip.save(os.path.join(OUT, 'lure_block_top.png'))
    with open(os.path.join(OUT, 'lure_block_top.png.mcmeta'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump({'animation': {'frametime': FRAMETIME, 'interpolate': True}}, f, indent=2)
        f.write('\n')


if __name__ == '__main__':
    main()
