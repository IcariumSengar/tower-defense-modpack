"""Seamless looping embers drifting up from the Horde's dust and the burning
city, as animation frames over the right side of the title scene.

Every ember completes exactly one rise over the loop and its sway period
divides the loop, so frame N wraps cleanly back to frame 0.
"""

import math
import random

from PIL import Image, ImageDraw

# Region of the 640x360 scene the overlay covers (x, y, w, h).
REGION = (320, 96, 320, 224)
FRAMES = 40
FRAME_MS = 90

COLOURS = [(255, 236, 170), (255, 196, 96), (244, 132, 58), (196, 76, 38)]


def frames(seed=11, count=72):
    rng = random.Random(seed)
    _, _, w, h = REGION
    embers = []
    for _ in range(count):
        embers.append(dict(
            x0=rng.uniform(40, w - 4),
            y0=rng.uniform(0, h),
            rise=rng.uniform(0.55, 1.0) * h,     # distance risen per loop
            drift=rng.uniform(18, 60),           # leftward drift per loop
            sway=rng.uniform(1.0, 3.0),
            sway_cycles=rng.choice((1, 2)),
            phase=rng.uniform(0, 1),
            big=rng.random() < 0.3,
            flicker=rng.randrange(0, FRAMES),
        ))
    out = []
    for f in range(FRAMES):
        img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        for e in embers:
            t = (e["phase"] + f / FRAMES) % 1.0
            x = e["x0"] - e["drift"] * t + e["sway"] * math.sin(2 * math.pi * (t * e["sway_cycles"] + e["phase"]))
            y = e["y0"] + h * 0.35 - e["rise"] * t
            y = (y % h)
            # life: bright when born low, cooling and fading as it climbs
            life = t
            ci = min(len(COLOURS) - 1, int(life * len(COLOURS)))
            alpha = int(255 * (1 - life ** 2.2) * min(1.0, life / 0.08))
            if (f + e["flicker"]) % 7 == 0:
                alpha = alpha // 2
            if alpha < 24:
                continue
            c = COLOURS[ci] + (alpha,)
            xi, yi = int(x) % w, int(y)
            d.point((xi, yi), fill=c)
            if e["big"] and ci < 2:
                d.point((xi + 1, yi), fill=COLOURS[ci + 1] + (alpha // 2,))
                d.point((xi, yi + 1), fill=COLOURS[ci + 1] + (alpha // 2,))
        out.append(img)
    return out


def save_apng(path, seed=11):
    fr = frames(seed)
    fr[0].save(path, save_all=True, append_images=fr[1:], duration=FRAME_MS, loop=0,
               disposal=1, blend=0, optimize=False)


def save_gif(path, seed=11):
    """GIF fallback: 1-bit alpha, so dim embers are dropped rather than blended."""
    fr = []
    for img in frames(seed):
        a = img.getchannel("A").point(lambda v: 255 if v >= 128 else 0)
        rgb = img.convert("RGB")
        p = rgb.quantize(colors=15, method=Image.Quantize.MEDIANCUT)
        p.paste(15, mask=Image.eval(a, lambda v: 255 - v))
        p.info["transparency"] = 15
        fr.append(p)
    fr[0].save(path, save_all=True, append_images=fr[1:], duration=FRAME_MS, loop=0,
               transparency=15, disposal=2, optimize=False)
