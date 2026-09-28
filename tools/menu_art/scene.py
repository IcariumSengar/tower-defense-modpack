"""Painted dusk scene for the title/menu screens, drawn procedurally as pixel art.

640x360 canvas (exact 3x at 1080p, 6x at 4K, same grid as Minecraft's GUI at
scale 3). Every layer is returned separately with alpha so the layouts can
stack them for parallax; flatten() gives the single composite.

Composition, left to right: calm sky and low hills on the left third (the
menu column sits there), the Watchpost on its rise, the setting sun behind
the ruined skyline, and the Horde coming along the near ridge from the right.
"""

import math
import random

import numpy as np
from PIL import Image, ImageDraw

W, H = 640, 360

# Palette. Sky runs night -> ember at the horizon; silhouettes get darker and
# less haze-lit the closer they are.
SKY = [
    (13, 10, 26), (20, 14, 38), (31, 20, 52), (46, 26, 62), (66, 32, 66),
    (92, 38, 64), (122, 46, 56), (156, 58, 46), (190, 78, 40), (216, 108, 46),
    (234, 146, 64), (244, 186, 102),
]
FAR_CITY = (58, 30, 56)
FAR_CITY_HAZE = (92, 44, 60)
MID = (34, 20, 40)
MID_DARK = (26, 16, 32)
NEAR = (15, 10, 20)
BLACK = (8, 6, 12)
RIM = (214, 102, 48)
RIM_HOT = (246, 160, 74)
FIRE = [(255, 226, 140), (255, 170, 72), (228, 92, 36), (150, 44, 28)]
SMOKE = (30, 20, 34)
BONE = (233, 220, 196)
STAR = (196, 184, 214)
BEAM = (200, 228, 255)

SUN = (452, 214, 30)

NIGHT_SKY = [
    (5, 5, 14), (8, 8, 20), (11, 11, 27), (15, 14, 34), (20, 17, 42), (27, 20, 48),
    (36, 23, 52), (48, 26, 52), (64, 28, 48), (86, 32, 42),
]

# Colours that change between the dusk (title) and night (loading) variants.
THEMES = {
    "dusk": dict(city=FAR_CITY, haze=(236, 120, 60), lit=0.03, hill=MID, hill_dark=MID_DARK,
                 crest=(96, 40, 50), smoke_base=(120, 52, 36), smoke=SMOKE, beam=90,
                 halo=1.0, dust=(214, 108, 58), dust_alpha=(0, 50, 95, 140),
                 rim=(132, 54, 40), rim_far=(120, 50, 42), vignette=150),
    "night": dict(city=(30, 18, 38), haze=(190, 52, 34), lit=0.075, hill=(22, 16, 32),
                  hill_dark=(17, 12, 26), crest=(58, 58, 92), smoke_base=(150, 50, 30),
                  smoke=(24, 20, 34), beam=150, halo=1.6, dust=(150, 40, 30),
                  dust_alpha=(0, 26, 48, 70), rim=(86, 92, 138), rim_far=(62, 66, 104),
                  vignette=190),
}
T = THEMES["dusk"]

BAYER4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0


def _rgba(size, fill=(0, 0, 0, 0)):
    return Image.new("RGBA", size, fill)


def glow(img, cx, cy, r, colour, max_alpha, squash=1.0):
    """Soft radial light, quantised to 4 alpha steps with ordered dithering so
    it stays pixel-art instead of showing hard concentric rings."""
    y = np.arange(H)[:, None].astype(float)
    x = np.arange(W)[None, :].astype(float)
    d = np.sqrt((x - cx) ** 2 + ((y - cy) / squash) ** 2) / r
    a = np.clip(1 - d, 0, 1) ** 1.6
    levels = np.array([0, max_alpha * 0.33, max_alpha * 0.66, max_alpha], dtype=float)
    thresh = np.tile(BAYER4, (H // 4 + 1, W // 4 + 1))[:H, :W]
    sc = a * (len(levels) - 1)
    idx = np.clip(np.floor(sc) + ((sc - np.floor(sc)) > thresh), 0, len(levels) - 1).astype(int)
    out = np.zeros((H, W, 4), dtype=np.uint8)
    out[:, :, :3] = colour
    out[:, :, 3] = levels[idx].astype(np.uint8)
    img.alpha_composite(Image.fromarray(out, "RGBA"))


def dithered_ramp(values, ramp):
    """Map a 0..1 float field onto a colour ramp with 4x4 ordered dithering."""
    h, w = values.shape
    scaled = np.clip(values, 0, 1) * (len(ramp) - 1)
    lo = np.floor(scaled).astype(int)
    frac = scaled - lo
    thresh = np.tile(BAYER4, (h // 4 + 1, w // 4 + 1))[:h, :w]
    idx = np.clip(lo + (frac > thresh), 0, len(ramp) - 1)
    pal = np.array(ramp, dtype=np.uint8)
    return pal[idx]


def sky_layer(rng):
    y = np.linspace(0, 1, H)[:, None]
    x = np.linspace(0, 1, W)[None, :]
    sun_x, sun_y = SUN[0] / W, SUN[1] / H
    # Base gradient: dark at the top, ember at the horizon (~y 250).
    t = np.clip(y / (252 / H), 0, 1) ** 1.35
    # Warm bloom around the sun, wider horizontally.
    d = np.sqrt(((x - sun_x) * 1.0) ** 2 + ((y - sun_y) * 2.1) ** 2)
    bloom = np.clip(1 - d / 0.62, 0, 1) ** 1.8 * 0.30
    field = np.clip(t + bloom, 0, 1)
    field = np.broadcast_to(field, (H, W)).copy()
    img = Image.fromarray(dithered_ramp(field, SKY), "RGB").convert("RGBA")
    d2 = ImageDraw.Draw(img)

    # Stars, only in the dark top-left where night is arriving.
    for _ in range(70):
        sx, sy = rng.randrange(0, 420), rng.randrange(0, 120)
        if sy > 40 + (sx / 420) * 60:
            continue
        c = STAR if rng.random() < 0.25 else (120, 106, 150)
        d2.point((sx, sy), fill=c + (255,))
    for sx, sy in [(58, 22), (171, 41), (302, 16), (96, 70)]:
        d2.point((sx, sy), fill=STAR + (255,))
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            d2.point((sx + dx, sy + dy), fill=(110, 98, 140, 255))

    # Thin crescent moon, top left, above the menu column.
    mx, my, mr = 116, 44, 11
    moon = _rgba((W, H))
    md = ImageDraw.Draw(moon)
    md.ellipse((mx - mr, my - mr, mx + mr, my + mr), fill=(214, 204, 222, 255))
    md.ellipse((mx - mr + 5, my - mr - 2, mx + mr + 5, my + mr - 2), fill=(0, 0, 0, 0))
    img.alpha_composite(moon)

    # The sun: hazy ember disc sinking into the ruins, haze bands cut through it.
    sx, sy, sr = SUN
    sun = _rgba((W, H))
    sd = ImageDraw.Draw(sun)
    for r, a in ((sr + 14, 30), (sr + 8, 60), (sr + 3, 120)):
        sd.ellipse((sx - r, sy - r, sx + r, sy + r), fill=(240, 130, 58, a))
    sd.ellipse((sx - sr, sy - sr, sx + sr, sy + sr), fill=(252, 180, 90, 255))
    sd.ellipse((sx - sr + 5, sy - sr + 5, sx + sr - 5, sy + sr - 5), fill=(255, 208, 126, 255))
    sd.ellipse((sx - sr + 12, sy - sr + 10, sx + sr - 14, sy + sr - 16), fill=(255, 228, 160, 255))
    for i, by in enumerate(range(sy + 4, sy + sr + 2, 6)):
        sd.rectangle((sx - sr - 6, by, sx + sr + 6, by + 1 + i // 2), fill=(0, 0, 0, 0))
    img.alpha_composite(sun)

    # Cloud banks: layered ragged strata, dark tops, ember-lit undersides
    # that get hotter the closer they sit to the sun.
    clouds = _rgba((W, H))
    cd = ImageDraw.Draw(clouds)
    banks = [(92, 300, 250, 3), (128, 40, 210, 2), (150, 420, 230, 3), (176, 150, 170, 2),
             (196, 520, 160, 2), (60, 470, 190, 2), (214, 10, 140, 1)]
    for cy, cx, length, thick in banks:
        warm = max(0.0, 1 - abs(cx + length / 2 - sx) / 300) * min(1.0, cy / 190)
        top = (34 + int(36 * warm), 20 + int(12 * warm), 44, 240)
        mid = (70 + int(80 * warm), 30 + int(34 * warm), 50, 250)
        under = (150 + int(96 * warm), 58 + int(70 * warm), 44, 255)
        x = cx
        while x < cx + length:
            seg = rng.randrange(14, 40)
            t = thick + rng.choice((0, 0, 1, 1, 2))
            dy = rng.choice((-1, 0, 0, 1))
            cd.rectangle((x, cy + dy - t, x + seg, cy + dy), fill=top)
            cd.rectangle((x + 2, cy + dy + 1, x + seg - 2, cy + dy + 1), fill=mid)
            cd.rectangle((x + 5, cy + dy + 2, x + seg - 6, cy + dy + 2), fill=under)
            x += seg - rng.randrange(2, 8)
        # wisps trailing off both ends
        cd.line((cx - 16, cy, cx, cy), fill=top)
        cd.line((cx + length, cy - 1, cx + length + 22, cy - 1), fill=top)
    img.alpha_composite(clouds)
    return img


def night_sky_layer(rng):
    """Same horizon, hours later: the sun is gone, the burning city lights
    the haze red, and a bright moon hangs over the Horde."""
    y = np.linspace(0, 1, H)[:, None]
    x = np.linspace(0, 1, W)[None, :]
    t = np.clip(y / (262 / H), 0, 1) ** 2.2
    d = np.sqrt(((x - 0.72) * 0.9) ** 2 + ((y - 0.72) * 2.4) ** 2)
    fire_glow = np.clip(1 - d / 0.55, 0, 1) ** 2 * 0.22
    field = np.broadcast_to(np.clip(t + fire_glow, 0, 1), (H, W)).copy()
    img = Image.fromarray(dithered_ramp(field, NIGHT_SKY), "RGB").convert("RGBA")
    d2 = ImageDraw.Draw(img)
    for _ in range(260):
        sx, sy = rng.randrange(0, W), rng.randrange(0, 200)
        if rng.random() < sy / 230:
            continue
        c = STAR if rng.random() < 0.2 else (84, 80, 116)
        d2.point((sx, sy), fill=c + (255,))
    for sx, sy in [(58, 22), (171, 41), (302, 16), (96, 70), (380, 30), (612, 18), (238, 88)]:
        d2.point((sx, sy), fill=STAR + (255,))
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            d2.point((sx + dx, sy + dy), fill=(96, 92, 132, 255))
    # Full moon over the Horde: cold halo, pale disc, shaded limb, maria.
    mx, my, mr = 520, 64, 14
    glow(img, mx, my, mr * 3.2, (150, 164, 220), 70)
    moon = _rgba((W, H))
    md = ImageDraw.Draw(moon)
    md.ellipse((mx - mr, my - mr, mx + mr, my + mr), fill=(206, 206, 226, 255))
    md.ellipse((mx - mr + 2, my - mr + 1, mx + mr - 1, my + mr - 2), fill=(232, 230, 242, 255))
    for cx, cy, rx, ry in ((mx - 5, my - 4, 4, 3), (mx + 3, my + 2, 5, 4), (mx - 2, my + 7, 3, 2),
                           (mx + 6, my - 7, 2, 2)):
        md.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=(190, 190, 214, 255))
    img.alpha_composite(moon)
    # Thin clouds with moonlit edges.
    clouds = _rgba((W, H))
    cd = ImageDraw.Draw(clouds)
    for cy, cx, length, thick in [(92, 300, 250, 3), (128, 40, 210, 2), (150, 420, 230, 3),
                                  (176, 150, 170, 2), (60, 470, 190, 2)]:
        cool = max(0.0, 1 - abs(cx + length / 2 - mx) / 260)
        top = (14 + int(20 * cool), 13 + int(20 * cool), 28 + int(34 * cool), 235)
        edge = (40 + int(60 * cool), 40 + int(62 * cool), 70 + int(80 * cool), 255)
        x = cx
        while x < cx + length:
            seg = rng.randrange(14, 40)
            t2 = thick + rng.choice((0, 0, 1, 1, 2))
            dy = rng.choice((-1, 0, 0, 1))
            cd.rectangle((x, cy + dy - t2, x + seg, cy + dy), fill=top)
            cd.rectangle((x + 3, cy + dy - t2, x + seg - 4, cy + dy - t2), fill=edge)
            x += seg - rng.randrange(2, 8)
    img.alpha_composite(clouds)
    return img


def _building(draw, rng, x, base, w, h, col, lit_col=None, lit_chance=0.0):
    top = base - h
    pts = [(x, base), (x, top)]
    # Broken, jagged roofline.
    cx = x
    while cx < x + w:
        step = rng.randrange(2, 6)
        cx = min(x + w, cx + step)
        pts.append((cx, top + rng.choice((0, 0, 1, 2, 4, 7))))
    pts.append((x + w, base))
    draw.polygon(pts, fill=col)
    # Collapsed corner on some.
    if rng.random() < 0.4:
        cw = rng.randrange(4, max(5, w // 2))
        ch = rng.randrange(6, max(7, h // 2))
        if rng.random() < 0.5:
            draw.polygon([(x - 1, top - 1), (x + cw, top - 1), (x - 1, top + ch)], fill=(0, 0, 0, 0))
        else:
            draw.polygon([(x + w + 1, top - 1), (x + w - cw, top - 1), (x + w + 1, top + ch)], fill=(0, 0, 0, 0))
    # Exposed girders poking out of the break.
    if rng.random() < 0.35:
        gx = x + rng.randrange(1, max(2, w - 1))
        draw.line((gx, top, gx + rng.choice((-2, 0, 1)), top - rng.randrange(3, 9)), fill=col)
    # Hollow windows: a few burning, the rest punched through to the haze.
    if lit_col is not None:
        for wy in range(top + 5, base - 3, 5):
            for wx in range(x + 2, x + w - 2, 4):
                r = rng.random()
                if r < lit_chance:
                    draw.rectangle((wx, wy, wx + 1, wy + 1), fill=lit_col)
                elif r < lit_chance + 0.10:
                    draw.rectangle((wx, wy, wx + 1, wy + 1), fill=FAR_CITY_HAZE + (255,))


def far_city_layer(rng):
    img = _rgba((W, H))
    d = ImageDraw.Draw(img)
    base = 262
    # A tall broken cluster behind the sun, lower sprawl elsewhere.
    x = -10
    while x < W + 10:
        w = rng.randrange(10, 30)
        centre = abs(x + w / 2 - 470)
        if abs(x + w / 2 - SUN[0]) < 22:
            h = rng.randrange(10, 30)  # low rubble so the sun shows between towers
        elif centre < 90:
            h = rng.randrange(38, 92)
        elif x > 330:
            h = rng.randrange(18, 52)
        else:
            h = rng.randrange(6, 26)
        if rng.random() < 0.18:
            x += rng.randrange(4, 14)  # gap in the skyline
            continue
        _building(d, rng, x, base, w, h, T['city'] + (255,), FIRE[1] + (255,), T['lit'])
        x += w + rng.choice((0, 0, 1, 2))
    # A snapped radio mast leaning off the tallest block.
    d.line((497, 176, 505, 132), fill=T['city'] + (255,))
    d.line((505, 132, 511, 137), fill=T['city'] + (255,))
    for yy in range(140, 176, 8):
        d.line((497 + (176 - yy) * 8 // 44 - 3, yy, 497 + (176 - yy) * 8 // 44 + 3, yy), fill=T['city'] + (255,))
    # Haze band along the horizon so the city sits back.
    haze = _rgba((W, H))
    hd = ImageDraw.Draw(haze)
    for i, a in enumerate((70, 55, 40, 28, 16)):
        hd.rectangle((0, base - 4 - i * 3, W, base - 2 - i * 3), fill=T['haze'] + (a,))
    img.alpha_composite(haze)
    img = Image.composite(img, _rgba((W, H)), img)  # keep alpha from buildings+haze
    return img


def smoke_layer(rng):
    img = _rgba((W, H))
    d = ImageDraw.Draw(img)
    for ox, oy, drift, n in ((402, 214, -1.1, 26), (560, 236, -0.8, 18), (318, 250, -1.3, 14)):
        for i in range(n):
            t = i / n
            cx = ox + drift * i * 4 + rng.randrange(-2, 3)
            cy = oy - i * 5.2
            r = 3 + t * 11 + rng.random() * 2
            a = int(215 * (1 - t) ** 0.8)
            col = T['smoke'] if i > 2 else T['smoke_base']
            d.ellipse((cx - r, cy - r * 0.8, cx + r, cy + r * 0.8), fill=col + (a,))
        # fire at the base of the column
        d.rectangle((ox - 2, oy - 1, ox + 2, oy + 1), fill=FIRE[1] + (255,))
        d.point((ox, oy - 2), fill=FIRE[0] + (255,))
    return img


def beacon_layer():
    """Faint airdrop beacon beam on the far right horizon."""
    img = _rgba((W, H))
    d = ImageDraw.Draw(img)
    bx = 596
    for y in range(0, 258):
        a = int(10 + T['beam'] * 0.8 * (y / 258) ** 2)
        d.point((bx, y), fill=BEAM + (a,))
        d.point((bx + 1, y), fill=BEAM + (a // 2,))
        d.point((bx - 1, y), fill=(255, 255, 255, a // 5))
    d.rectangle((bx - 1, 256, bx + 2, 259), fill=(230, 242, 255, 200))
    return img


def ridge(xs, base, parts):
    y = np.full_like(xs, base, dtype=float)
    for amp, freq, phase in parts:
        y += amp * np.sin(xs * freq + phase)
    return y


def mid_layer(rng):
    img = _rgba((W, H))
    d = ImageDraw.Draw(img)
    xs = np.arange(W + 1, dtype=float)
    # Far wasteland ridge.
    far = ridge(xs, 268, [(4, 0.021, 0.3), (2, 0.057, 1.7), (1, 0.13, 0.2)])
    d.polygon([(0, H)] + [(int(x), int(y)) for x, y in zip(xs, far)] + [(W, H)], fill=T['hill_dark'] + (255,))
    # The Watchpost's rise: a hill peaking around x 290.
    hill = ridge(xs, 292, [(3, 0.03, 0.9), (1.5, 0.09, 2.2)])
    hill -= 46 * np.exp(-((xs - 292) / 70) ** 2)
    d.polygon([(0, H)] + [(int(x), int(y)) for x, y in zip(xs, hill)] + [(W, H)], fill=T['hill'] + (255,))
    # Rim of dusk light along the hill crest on the sun side.
    for x in range(292, 420):
        y = int(hill[x])
        if rng.random() < 0.7:
            d.point((x, y), fill=T['crest'] + (255,))
    # Power line poles marching off toward the horizon on the left.
    poles = [(24, 300, 34), (86, 290, 26), (140, 280, 19), (184, 272, 14), (216, 267, 10)]
    for px, py, ph in poles:
        top = py - ph
        d.line((px, py, px, top), fill=T['hill_dark'] + (255,))
        d.line((px - ph // 5 - 1, top + 2, px + ph // 5 + 1, top + 2), fill=T['hill_dark'] + (255,))
    for (ax, ay, ah), (bx, by, bh) in zip(poles, poles[1:]):
        for off in (-1, 1):
            x0, y0 = ax + off * (ah // 5), ay - ah + 2
            x1, y1 = bx + off * (bh // 5), by - bh + 2
            sag = 3 + (x1 - x0) // 14
            prev = (x0, y0)
            for i in range(1, 21):
                t = i / 20
                px = x0 + (x1 - x0) * t
                py = y0 + (y1 - y0) * t + sag * math.sin(math.pi * t)
                d.line((prev, (px, py)), fill=(44, 26, 46, 255))
                prev = (px, py)
    # One snapped pole leaning.
    d.line((250, 268, 256, 256), fill=T['hill_dark'] + (255,))
    # Dead trees on the far ridge.
    for tx in (60, 118, 205, 372, 404, 540):
        ty = int(far[tx]) + 1
        h = rng.randrange(8, 15)
        d.line((tx, ty, tx, ty - h), fill=T['hill_dark'] + (255,))
        for _ in range(3):
            by = ty - rng.randrange(h // 3, h)
            dx = rng.choice((-1, 1)) * rng.randrange(2, 5)
            d.line((tx, by, tx + dx, by - rng.randrange(2, 4)), fill=T['hill_dark'] + (255,))
    return img, hill


def watchpost_layer(hill):
    """The fort on its rise: palisade, gatehouse, watchtower, lanterns."""
    img = _rgba((W, H))
    glow_img = _rgba((W, H))
    d = ImageDraw.Draw(img)
    wall = (20, 13, 24, 255)
    cx = 292
    ground = int(hill[cx]) + 2
    # Palisade: sharpened logs along the crest.
    for x in range(cx - 44, cx + 45, 2):
        gy = int(hill[x]) + 2
        top = min(gy, ground) - 13 - (1 if (x // 2) % 3 == 0 else 0)
        d.rectangle((x, top, x + 1, gy), fill=wall)
        d.point((x, top - 1), fill=wall)
    # Gate gap, lit from inside.
    d.rectangle((cx - 4, ground - 11, cx + 3, ground), fill=(88, 40, 30, 255))
    d.rectangle((cx - 3, ground - 9, cx + 2, ground), fill=(180, 84, 38, 255))
    # Watchtower (left of the gate) with a lit window and a roof.
    tx = cx - 26
    d.rectangle((tx, ground - 40, tx + 9, ground - 12), fill=wall)
    d.line((tx - 2, ground - 12, tx + 1, ground - 40), fill=wall)
    d.line((tx + 11, ground - 12, tx + 8, ground - 40), fill=wall)
    d.polygon([(tx - 3, ground - 40), (tx + 12, ground - 40), (tx + 4, ground - 49)], fill=wall)
    d.rectangle((tx + 3, ground - 36, tx + 6, ground - 33), fill=FIRE[1] + (255,))
    d.point((tx + 4, ground - 35), fill=FIRE[0] + (255,))
    # Brick house roofline behind the wall (the command post).
    hx = cx + 8
    d.rectangle((hx, ground - 22, hx + 22, ground - 12), fill=wall)
    d.polygon([(hx - 2, ground - 22), (hx + 24, ground - 22), (hx + 11, ground - 30)], fill=wall)
    d.rectangle((hx + 16, ground - 33, hx + 18, ground - 26), fill=wall)  # chimney
    d.rectangle((hx + 4, ground - 19, hx + 6, ground - 16), fill=FIRE[2] + (255,))
    # Flag on the tower.
    d.line((tx + 4, ground - 49, tx + 4, ground - 58), fill=wall)
    d.polygon([(tx + 5, ground - 58), (tx + 12, ground - 56), (tx + 5, ground - 54)], fill=(126, 34, 30, 255))
    # Lanterns on the wall with warm halos.
    for lx in (cx - 44, cx - 12, cx + 12, cx + 44):
        ly = int(hill[lx]) - 13
        d.rectangle((lx, ly - 2, lx + 1, ly), fill=FIRE[0] + (255,))
        glow(glow_img, lx, ly, 9 * T['halo'], (255, 150, 60), 80)
    glow(glow_img, tx + 4, ground - 35, 16 * T['halo'], (255, 150, 60), 70)
    glow(glow_img, cx, ground - 6, 14 * T['halo'], (255, 130, 50), 70)
    glow_img.alpha_composite(img)
    return glow_img


# Horde sprites, all facing left (toward the Watchpost). '#' = body.
SPRITES = {
    "walker": [
        "...####...",
        "...####...",
        "...####...",
        "....###...",
        "#######...",
        "########..",
        "....###...",
        "....####..",
        "....###...",
        "....###...",
        "....#.##..",
        "...##..#..",
        "...#...#..",
        "..##...##.",
        "..#.....#.",
        "..#.....#.",
    ],
    "hunched": [
        "..####.....",
        "..####.....",
        "..#####....",
        "########...",
        "#########..",
        ".....####..",
        ".....####..",
        "......###..",
        "......###..",
        "......#.##.",
        ".....##..#.",
        ".....#...#.",
        "....##...##",
        "....#.....#",
        "....#.....#",
    ],
    "lurcher": [
        "...####...",
        "...####...",
        "...####...",
        "....###...",
        "########..",
        "....####..",
        "....####..",
        "....#####.",
        "....###.#.",
        "....###.#.",
        "....##.#..",
        "....#..#..",
        "...##..#..",
        "...#...#..",
        "...#...##.",
        "..##......",
    ],
    "boomer": [
        "....####....",
        "....####....",
        "....####....",
        "..#######...",
        "##########..",
        "###########.",
        ".##########.",
        ".##########.",
        ".##########.",
        "..########..",
        "...######...",
        "....##.##...",
        "....#...#...",
        "...##...#...",
        "...#....##..",
        "...#.....#..",
    ],
    "brute": [
        "........#######...",
        ".....###########..",
        "...##############.",
        ".################.",
        "####.############.",
        "####.############.",
        "####..###########.",
        "###...###########.",
        "###....#########..",
        "###....#########..",
        "###.....#######...",
        "###.....#######...",
        "###.....###.###...",
        "####....###..##...",
        "####....###..##...",
        ".......###...###..",
        ".......###...###..",
        "......####...####.",
    ],
    "crawler": [
        "####..........",
        "####...#####.#",
        "##############",
        ".###########..",
        ".#.#......#.#.",
        "#...#....#...#",
    ],
    "far1": [
        ".##..",
        ".##..",
        "####.",
        "..#..",
        "..#..",
        ".#.#.",
        ".#.#.",
        "#...#",
    ],
    "far2": [
        "..##.",
        "..##.",
        "####.",
        "..##.",
        "..#..",
        "..##.",
        ".#..#",
        ".#..#",
    ],
}


def _sprite(name):
    return np.array([[ch == "#" for ch in row] for row in SPRITES[name]], dtype=bool)


def scale2x(m):
    """Scale2x/EPX: doubles a pixel mask while keeping diagonals clean, so
    the near Horde gets real 1px detail instead of 2x2 blocks."""
    p = np.pad(m, 1)
    P = p[1:-1, 1:-1]
    A, B, C, D = p[:-2, 1:-1], p[1:-1, 2:], p[1:-1, :-2], p[2:, 1:-1]
    e0 = np.where((C == A) & (C != D) & (A != B), C, P)
    e1 = np.where((A == B) & (A != C) & (B != D), A, P)
    e2 = np.where((D == C) & (D != B) & (C != A), D, P)
    e3 = np.where((B == D) & (B != A) & (D != C), B, P)
    out = np.zeros((m.shape[0] * 2, m.shape[1] * 2), dtype=bool)
    out[0::2, 0::2], out[0::2, 1::2], out[1::2, 0::2], out[1::2, 1::2] = e0, e1, e2, e3
    return out


def _stamp(mask, name, x, feet_y, big=False):
    """Stamp sprite `name` into boolean `mask` with its feet at feet_y."""
    spr = _sprite(name)
    if big:
        spr = scale2x(spr)
    h, w = spr.shape
    y0 = feet_y - h
    ys, xs = np.nonzero(spr)
    ys, xs = ys + y0, xs + x
    ok = (xs >= 0) & (xs < W) & (ys >= 0) & (ys < H)
    mask[ys[ok], xs[ok]] = True
    return w


def _silhouette(mask, colour, rim_colour=None):
    """Mask -> RGBA silhouette; pixels with open sky directly above get a
    1px back-light rim (heads, shoulders, outstretched arms)."""
    out = np.zeros((H, W, 4), dtype=np.uint8)
    out[mask] = colour + (255,)
    if rim_colour is not None:
        above = np.zeros_like(mask)
        above[1:, :] = mask[1:, :] & ~mask[:-1, :]
        out[above] = rim_colour + (255,)
    return out


def dust_layer():
    """Sunlit dust kicked up behind the Horde, so the silhouettes read."""
    y = np.arange(H)[:, None].astype(float)
    x = np.arange(W)[None, :].astype(float)
    d = ((x - 548) / 190) ** 2 + ((y - 272) / 24) ** 2
    a = np.clip(1 - d, 0, 1) ** 1.2
    a = a * np.clip((x - 360) / 80, 0, 1)
    # quantise to 4 alpha steps with ordered dithering (keeps it pixel-art)
    levels = np.array(T['dust_alpha'], dtype=np.uint8)
    thresh = np.tile(BAYER4, (H // 4 + 1, W // 4 + 1))[:H, :W]
    s = a * (len(levels) - 1)
    idx = np.clip(np.floor(s) + ((s - np.floor(s)) > thresh), 0, len(levels) - 1).astype(int)
    out = np.zeros((H, W, 4), dtype=np.uint8)
    out[:, :, 0], out[:, :, 1], out[:, :, 2] = T['dust']
    out[:, :, 3] = levels[idx]
    return Image.fromarray(out, "RGBA")


def horde_layer(rng):
    xs = np.arange(W + 1, dtype=float)
    # Near ridge: low under the menu column, climbing to a crest on the right
    # so the Horde stands against the sunset glow and their own dust.
    near = 336 - 44 * np.clip((xs - 330) / 170, 0, 1) ** 1.3
    near += ridge(xs, 0, [(2.5, 0.021, 2.4), (1.2, 0.07, 0.4)])
    near += 10 * np.exp(-((xs - 140) / 110) ** 2)

    behind = np.zeros((H, W), dtype=bool)
    front = np.zeros((H, W), dtype=bool)

    # Stragglers coming over the crest: feet hidden behind the ridge.
    x = 452
    while x < W + 4:
        k = rng.choice(("walker", "hunched", "lurcher", "far1", "far2", "walker"))
        w = _stamp(behind, k, x, int(near[min(W, x)]) + rng.randrange(4, 9))
        x += max(4, w - rng.randrange(1, 6))
    # The main line on the crest, drawn large.
    x = 392
    kinds = ["walker", "hunched", "lurcher", "boomer", "walker", "brute", "hunched",
             "crawler", "walker", "lurcher", "brute", "walker", "hunched"]
    for k in kinds:
        if x > W + 6:
            break
        width = len(SPRITES[k][0]) * 2
        _stamp(front, k, x, int(near[min(W, x + width // 2)]) + 2, big=True)
        x += width + rng.randrange(-5, 3)

    img = dust_layer()
    img.alpha_composite(Image.fromarray(_silhouette(behind, (30, 14, 24), T['rim_far']), "RGBA"))
    d = ImageDraw.Draw(img)
    d.polygon([(0, H)] + [(int(x), int(y)) for x, y in zip(xs, near)] + [(W, H)], fill=NEAR + (255,))
    # Dead grass on the crest.
    for gx in range(0, W, 2):
        if rng.random() < 0.45:
            gy = int(near[gx])
            d.line((gx, gy, gx + rng.choice((-1, 0, 1)), gy - rng.randrange(1, 4)), fill=NEAR + (255,))
    img.alpha_composite(Image.fromarray(_silhouette(front, BLACK, T['rim']), "RGBA"))

    # Ground darkens toward the bottom edge.
    y = np.arange(H)[:, None]
    shade = np.zeros((H, W, 4), dtype=np.uint8)
    shade[:, :, 3] = (np.clip((y - 318) / 42, 0, 1) * 150).astype(np.uint8)
    img.alpha_composite(Image.fromarray(shade, "RGBA"))
    return img


def barricade(d, hill, rng):
    """Crossed stakes on the slope between the Watchpost and the Horde."""
    col = (18, 12, 22, 255)
    for bx in range(338, 384, 9):
        gy = int(hill[bx]) + 1
        d.line((bx - 3, gy, bx + 3, gy - 7), fill=col)
        d.line((bx + 3, gy, bx - 3, gy - 7), fill=col)
        d.line((bx - 4, gy - 3, bx + 4, gy - 4), fill=col)


def vignette_layer():
    y = np.linspace(-1, 1, H)[:, None]
    x = np.linspace(-1, 1, W)[None, :]
    r = np.sqrt((x * 0.9) ** 2 + (y * 1.1) ** 2)
    a = (np.clip((r - 0.75) / 0.6, 0, 1) ** 1.6 * T['vignette']).astype(np.uint8)
    out = np.zeros((H, W, 4), dtype=np.uint8)
    out[:, :, 3] = a
    return Image.fromarray(out, "RGBA")


def build(seed=1886, variant="dusk"):
    global T
    T = THEMES[variant]
    rng = random.Random(seed)
    layers = {}
    layers["sky"] = sky_layer(rng)  # always run: keeps the rng stream identical
    if variant == "night":
        layers["sky"] = night_sky_layer(random.Random(seed + 1))
    city = far_city_layer(rng)
    city.alpha_composite(smoke_layer(rng))
    city.alpha_composite(beacon_layer())
    layers["city"] = city
    mid, hill = mid_layer(rng)
    mid.alpha_composite(watchpost_layer(hill))
    barricade(ImageDraw.Draw(mid), hill, rng)
    layers["mid"] = mid
    layers["near"] = horde_layer(rng)
    layers["vignette"] = vignette_layer()
    return layers


def flatten(layers, order=("sky", "city", "mid", "near", "vignette")):
    out = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    for k in order:
        out.alpha_composite(layers[k])
    return out
