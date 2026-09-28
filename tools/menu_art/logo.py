"""TOWER DEFENSE wordmark: chunky block letters in weathered, sunset-lit
plate metal with chips, cracks, bullet holes and rust runs. Drawn on the same
1 art px = 1 GUI px grid as the scene."""

import random

import numpy as np
from PIL import Image

S = 6          # stroke width
GW, GH = 22, 30  # glyph box

OUTLINE = (13, 9, 18)
SHADOW = (0, 0, 0)
TOP = np.array((246, 230, 196), dtype=float)      # bone, lit from the sky
BOTTOM = np.array((196, 92, 44), dtype=float)     # rust, lit from the sun
HILITE = (255, 244, 214)
SHADE = (104, 40, 26)
RUST = (122, 50, 30)
HOLE = (24, 14, 20)


def _glyph(ch):
    g = np.zeros((GH, GW), dtype=bool)

    def r(x, y, w, h):
        g[y:y + h, x:x + w] = True

    s, m = S, (GH - S) // 2
    if ch == "T":
        r(0, 0, GW, s); r((GW - s) // 2, 0, s, GH)
    elif ch == "O":
        r(0, 0, GW, s); r(0, GH - s, GW, s); r(0, 0, s, GH); r(GW - s, 0, s, GH)
        for x, y in ((0, 0), (GW - 1, 0), (0, GH - 1), (GW - 1, GH - 1)):
            g[y, x] = False
    elif ch == "W":
        r(0, 0, s, GH); r(GW - s, 0, s, GH); r((GW - s) // 2, 11, s, GH - 11); r(0, GH - s, GW, s)
        g[GH - 1, 0] = g[GH - 1, GW - 1] = False
    elif ch == "E":
        r(0, 0, s, GH); r(0, 0, GW, s); r(0, m, GW - 4, s); r(0, GH - s, GW, s)
    elif ch == "F":
        r(0, 0, s, GH); r(0, 0, GW, s); r(0, m, GW - 4, s)
    elif ch == "R":
        # bowl on top, then a diagonal leg kicking out to the bottom right
        r(0, 0, s, GH); r(0, 0, GW - 3, s); r(GW - s, 2, s, m - 1); r(0, m, GW - 3, s)
        for i in range(3):
            r(GW - s - 2 + i, i + 1, 1, s)
            r(GW - s - 2 + i, m + s - i - 2 - s + 1, 1, s)
        for y in range(m + s, GH):
            t = (y - m - s) / (GH - m - s - 1)
            x = int(round(s + 3 + t * (GW - 2 * s - 3)))
            r(x, y, s, 1)
    elif ch == "D":
        r(0, 0, s, GH); r(0, 0, GW - 3, s); r(0, GH - s, GW - 3, s); r(GW - s, 3, s, GH - 6)
        for i in range(3):
            r(GW - s - 2 + i, i + 1, 1, s); r(GW - s - 2 + i, GH - s - i - 1, 1, s)
    elif ch == "N":
        r(0, 0, s, GH); r(GW - s, 0, s, GH)
        for y in range(GH):
            x = s + int(round((GW - 2 * s - 1) * y / (GH - 1))) - 2
            r(max(0, x), y, s - 1, 1)
    elif ch == "S":
        r(0, 0, GW, s); r(0, 0, s, m + s); r(0, m, GW, s); r(GW - s, m, s, GH - m); r(0, GH - s, GW, s)
        g[0, 0] = g[GH - 1, GW - 1] = False
        if s > 3:  # serifs close the counters at small sizes
            r(GW - s, s, s, 3)   # top-right serif
            r(0, GH - s - 3, s, 3)  # bottom-left serif
    elif ch == " ":
        pass
    return g


def _word(text, gap=3):
    parts = []
    for i, ch in enumerate(text):
        g = _glyph(ch) if ch != " " else np.zeros((GH, GW // 2), dtype=bool)
        parts.append(g)
        if i < len(text) - 1:
            parts.append(np.zeros((GH, gap), dtype=bool))
    return np.concatenate(parts, axis=1)


def _shift(m, dx, dy):
    out = np.zeros_like(m)
    h, w = m.shape
    ys = slice(max(0, dy), min(h, h + dy)), slice(max(0, -dy), min(h, h - dy))
    xs = slice(max(0, dx), min(w, w + dx)), slice(max(0, -dx), min(w, w - dx))
    out[ys[0], xs[0]] = m[ys[1], xs[1]]
    return out


def build_small(lines=("TOWER", "DEFENSE"), seed=7):
    """Half-size wordmark (3px strokes) for screens where vanilla text sits
    near the top. Drawn natively, not downscaled, so the letters stay even."""
    global S, GW, GH
    saved = S, GW, GH
    S, GW, GH = 3, 11, 15
    try:
        return build(lines, seed, line_gap=3, pad=4, outline_r=1, shadow=2, chip_every=30)
    finally:
        S, GW, GH = saved


def build(lines=("TOWER", "DEFENSE"), seed=7, line_gap=6, pad=6, outline_r=2, shadow=3, chip_every=14):
    rng = random.Random(seed)
    words = [_word(t) for t in lines]
    width = max(w.shape[1] for w in words)
    height = sum(w.shape[0] for w in words) + line_gap * (len(words) - 1)
    body = np.zeros((height, width), dtype=bool)
    y = 0
    for w in words:
        body[y:y + w.shape[0], :w.shape[1]] = w
        y += w.shape[0] + line_gap
    body = np.pad(body, pad)
    h, w = body.shape

    # Chip the plate: bite small notches out of exposed edges.
    edge = body & ~(_shift(body, 1, 0) & _shift(body, -1, 0) & _shift(body, 0, 1) & _shift(body, 0, -1))
    ys, xs = np.nonzero(edge)
    for i in rng.sample(range(len(ys)), k=len(ys) // chip_every):
        cy, cx = ys[i], xs[i]
        body[cy:cy + rng.choice((1, 1, 2)), cx:cx + rng.choice((1, 2))] = False

    outline = np.zeros_like(body)
    rr = range(-outline_r, outline_r + 1)
    for dx in rr:
        for dy in rr:
            if abs(dx) + abs(dy) <= outline_r + 1:
                outline |= _shift(body, dx, dy)
    outline &= ~body
    drop = (_shift(body | outline, shadow, shadow)) & ~(body | outline)

    img = np.zeros((h, w, 4), dtype=np.uint8)
    img[drop] = SHADOW + (150,)
    img[outline] = OUTLINE + (255,)

    # Fill: per-line vertical gradient bone -> rust, stepped into 5 bands.
    ygrid = np.zeros((h, w))
    y0 = pad
    for word in words:
        t = np.clip((np.arange(h) - y0) / (word.shape[0] - 1), 0, 1)
        band = np.floor(t * 5) / 4
        rows = slice(y0, y0 + word.shape[0])
        ygrid[rows, :] = np.clip(band[rows], 0, 1)[:, None]
        y0 += word.shape[0] + line_gap
    col = TOP[None, None, :] * (1 - ygrid[:, :, None]) + BOTTOM[None, None, :] * ygrid[:, :, None]
    fill = np.concatenate([col, np.full((h, w, 1), 255.0)], axis=2).astype(np.uint8)
    img[body] = fill[body]

    # Bevel: light on top/left inner edges, dark on bottom/right.
    top_edge = body & ~_shift(body, 0, 1)
    left_edge = body & ~_shift(body, 1, 0)
    bot_edge = body & ~_shift(body, 0, -1)
    right_edge = body & ~_shift(body, -1, 0)
    img[top_edge | left_edge] = HILITE + (255,)
    img[bot_edge | right_edge] = SHADE + (255,)

    # Rust runs dripping down from the bottom of a few strokes.
    ys, xs = np.nonzero(bot_edge)
    for i in rng.sample(range(len(ys)), k=max(1, len(ys) // 22)):
        x, y = xs[i], ys[i]
        for dy in range(rng.randrange(2, 7)):
            if y - dy >= 0 and body[y - dy, x]:
                img[y - dy, x] = RUST + (255,)
        if y + 1 < h and not body[y + 1, x] and rng.random() < 0.5:
            img[y + 1, x] = RUST + (255,)  # a drip hanging off the edge
    # Cracks: short jagged dark lines.
    inner = body & ~(top_edge | left_edge | bot_edge | right_edge)
    ys, xs = np.nonzero(inner)
    for _ in range(6 if S > 3 else 2):
        i = rng.randrange(len(ys))
        x, y = xs[i], ys[i]
        for _ in range(rng.randrange(3, 7)):
            if 0 <= y < h and 0 <= x < w and body[y, x]:
                img[y, x] = SHADE + (255,)
            x += rng.choice((-1, 0, 1)); y += 1
    # Bullet holes: dark 2x2 with a bright torn lip.
    for _ in range(3 if S > 3 else 0):
        i = rng.randrange(len(ys))
        x, y = xs[i], ys[i]
        if inner[y:y + 2, x:x + 2].all():
            img[y:y + 2, x:x + 2] = HOLE + (255,)
            if y - 1 >= 0 and body[y - 1, x]:
                img[y - 1, x] = HILITE + (255,)
    return Image.fromarray(img, "RGBA")
