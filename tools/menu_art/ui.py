"""Menu chrome in the scene's palette: nine-slice button plates (normal /
hover / inactive), the dark column the title menu sits in, and the loading
bar frame + fill."""

import random

import numpy as np
from PIL import Image

from scene import BAYER4

BORDER = 4  # nine-slice border the layouts declare for the button textures


def _img(a):
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def button(state="normal", w=200, h=20, seed=3):
    """Riveted charcoal plate. Hover lights the rim and a notch in ember;
    inactive is a flat, cold, darker plate."""
    rng = random.Random(seed)
    a = np.zeros((h, w, 4), dtype=np.uint8)
    if state == "normal":
        face_top, face_bot = (46, 32, 50), (30, 20, 34)
        rim, hi, lo, rivet = (10, 7, 14), (74, 54, 76), (70, 34, 30), (120, 96, 110)
    elif state == "hover":
        face_top, face_bot = (92, 44, 40), (58, 26, 30)
        rim, hi, lo, rivet = (28, 10, 8), (236, 140, 72), (150, 58, 34), (255, 214, 150)
    else:
        face_top, face_bot = (34, 30, 38), (26, 23, 30)
        rim, hi, lo, rivet = (12, 10, 14), (44, 40, 48), (32, 28, 36), (58, 54, 62)
    # stepped vertical face gradient
    for y in range(h):
        t = min(1.0, max(0.0, (y - 1) / (h - 3)))
        t = np.floor(t * 4) / 3
        c = [int(face_top[i] * (1 - t) + face_bot[i] * t) for i in range(3)]
        a[y, :, :3] = c
        a[y, :, 3] = 255
    # scratches on the plate
    if state != "inactive":
        for _ in range(w // 18):
            x, y = rng.randrange(6, w - 10), rng.randrange(4, h - 4)
            for i in range(rng.randrange(3, 8)):
                if 2 < x + i < w - 3:
                    a[y, x + i, :3] = np.clip(a[y, x + i, :3].astype(int) + 14, 0, 255)
    # bevel
    a[1, 1:w - 1, :3] = hi
    a[1:h - 1, 1, :3] = hi
    a[h - 2, 1:w - 1, :3] = lo
    a[1:h - 1, w - 2, :3] = lo
    # hard outer rim, corners knocked off
    a[0, :, :3] = rim; a[h - 1, :, :3] = rim; a[:, 0, :3] = rim; a[:, w - 1, :3] = rim
    for x, y in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        a[y, x, 3] = 0
    # corner rivets (inside the nine-slice border so they never stretch)
    for x, y in ((3, 3), (w - 4, 3), (3, h - 4), (w - 4, h - 4)):
        a[y, x, :3] = rivet
    if state == "hover":
        # ember notch on the left edge, pointing at the label
        for y in range(5, h - 5):
            a[y, 2:4, :3] = (255, 170, 80)
    return _img(a)


def column(w=220, h=360):
    """Dark fade the title menu column sits in (left -> right). Smooth alpha:
    at the 4K auto GUI scale one art px is 8 screen px, and dithered alpha
    reads as a coarse dot screen over the sky."""
    x = np.arange(w)[None, :].astype(float)
    y = np.arange(h)[:, None].astype(float)
    t = np.clip(1 - x / (w - 1), 0, 1) ** 1.25
    t = t * (0.92 + 0.08 * np.cos((y / h - 0.45) * np.pi))
    a = np.zeros((h, w, 4), dtype=np.uint8)
    a[:, :, 0], a[:, :, 1], a[:, :, 2] = 10, 7, 14
    a[:, :, 3] = (np.broadcast_to(t, (h, w)) * 210).astype(np.uint8)
    return _img(a)


def rule(w=150):
    """Thin ember rule with a notch, under the wordmark."""
    a = np.zeros((3, w, 4), dtype=np.uint8)
    for x in range(w):
        fade = 1 - x / w
        a[1, x] = (214, 104, 50, int(255 * fade))
        a[0, x] = (10, 7, 14, int(160 * fade))
        a[2, x] = (10, 7, 14, int(160 * fade))
    a[0:3, 0:4] = (246, 176, 96, 255)
    return _img(a)


def bar_background(w=204, h=10):
    a = np.zeros((h, w, 4), dtype=np.uint8)
    a[:, :] = (22, 15, 26, 255)
    a[0, :, :3] = a[h - 1, :, :3] = (8, 6, 10)
    a[:, 0, :3] = a[:, w - 1, :3] = (8, 6, 10)
    a[1, 1:w - 1, :3] = (10, 8, 14)             # inset shadow
    a[h - 2, 1:w - 1, :3] = (58, 40, 60)          # inset lip
    for x in range(8, w - 8, 25):                 # tick marks
        a[2:h - 2, x, :3] = (34, 24, 38)
    for x, y in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        a[y, x, 3] = 0
    return _img(a)


def bar_progress(w=204, h=10):
    """Ember fill: hot core line, darker edges, diagonal hazard striping."""
    a = np.zeros((h, w, 4), dtype=np.uint8)
    for y in range(h):
        t = abs((y - (h - 1) / 2) / ((h - 1) / 2))
        c = np.array((255, 196, 108)) * (1 - t) + np.array((170, 58, 30)) * t
        a[y, :, :3] = c
        a[y, :, 3] = 255
    for y in range(1, h - 1):
        for x in range(w):
            if ((x + y) // 4) % 2 == 0:
                a[y, x, :3] = (a[y, x, :3].astype(int) * 0.86).astype(np.uint8)
    a[0, :, :3] = a[h - 1, :, :3] = (8, 6, 10)
    a[:, 0, :3] = a[:, w - 1, :3] = (8, 6, 10)
    a[1, 1:w - 1, :3] = (255, 232, 170)
    return _img(a)


def shade(w=640, h=360):
    """Pause-screen backdrop: the world stays visible through the middle,
    edges fall into dusk-tinted dark. Smooth alpha (see column())."""
    x = np.linspace(-1, 1, w)[None, :]
    y = np.linspace(-1, 1, h)[:, None]
    r = np.sqrt((x * 0.85) ** 2 + (y * 1.05) ** 2)
    t = np.clip((r - 0.2) / 1.0, 0, 1) ** 1.3 * 0.75 + 0.25
    a = np.zeros((h, w, 4), dtype=np.uint8)
    a[:, :, 0], a[:, :, 1], a[:, :, 2] = 14, 8, 16
    a[:, :, 3] = (70 + t * 145).astype(np.uint8)
    return _img(a)


def tip_plate(w=400, h=26, solid=False):
    """Dark band the loading tips sit on, ember hairlines fading out at both
    ends. solid=True (pause screen) hides the HUD hotbar/hearts underneath."""
    x = np.linspace(-1, 1, w)[None, :]
    fade = np.clip((1 - np.abs(x)) / 0.25, 0, 1)
    a = np.zeros((h, w, 4), dtype=np.uint8)
    a[:, :, :3] = (10, 7, 14)
    a[:, :, 3] = (fade * (238 if solid else 170)).astype(np.uint8)
    for y in (0, h - 1):
        a[y, :, :3] = (214, 104, 50)
        a[y, :, 3] = (fade[0] * 200).astype(np.uint8)
    return _img(a)


def window_icon(size=32):
    """Watchtower on a dusk tile, for the game window / taskbar."""
    n = size
    a = np.zeros((n, n, 4), dtype=np.uint8)
    top, bot = np.array((46, 26, 62)), np.array((226, 110, 50))
    for y in range(n):
        t = np.floor((y / (n - 1)) * 4) / 3
        a[y, :, :3] = (top * (1 - min(t, 1)) + bot * min(t, 1)).astype(np.uint8)
    a[:, :, 3] = 255
    r = max(2, n // 8)  # rounded corners
    for y in range(n):
        for x in range(n):
            cx = min(x, n - 1 - x)
            cy = min(y, n - 1 - y)
            if cx < r and cy < r and (r - cx - 0.5) ** 2 + (r - cy - 0.5) ** 2 > r * r:
                a[y, x, 3] = 0
    k = n / 32.0
    ink = (12, 8, 16)

    def rect(x0, y0, x1, y1, c=ink):
        a[int(y0 * k):int(y1 * k), int(x0 * k):int(x1 * k), :3] = c

    rect(0, 27, 32, 32)            # ground
    rect(12, 11, 20, 28)           # tower shaft
    rect(10, 9, 22, 12)            # platform
    rect(9, 7, 11, 9); rect(21, 7, 23, 9)   # posts
    for i in range(6):             # roof
        rect(10 + i, 7 - i, 22 - i, 8 - i)
    rect(15, 1, 16, 4)             # flagpole
    rect(16, 1, 19, 3, (150, 36, 30))  # flag
    rect(15, 14, 17, 17, (255, 190, 90))  # lit window
    rect(3, 24, 5, 28); rect(27, 23, 29, 28)  # palisade stubs
    return _img(a)
