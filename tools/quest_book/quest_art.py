"""Quest book art (quest book v4, Phase 3): act banners and two diagrams.

Writes PNGs to pack/kubejs/assets/kubejs/textures/quests/, which KubeJS serves
as client resources. The palette is the menu art's (tools/menu_art): dusk
violet-black, bone and ember. Run from the repo root:
    python tools/quest_book/quest_art.py
build_v4.py places the banners (chapter images) and the diagrams ({image:}
lines in quest descriptions).
"""
import math
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'pack', 'kubejs', 'assets', 'kubejs', 'textures', 'quests')
FONTS = 'C:/Windows/Fonts/'

DUSK = (30, 20, 38, 235)
DUSK_DEEP = (19, 13, 24, 235)
BONE = (233, 220, 196, 255)
EMBER = (214, 104, 58, 255)
DUSTY = (185, 138, 110, 255)
DIM = (167, 156, 176, 255)


def font(name, size):
    return ImageFont.truetype(FONTS + name, size)


def panel(w, h, border=EMBER):
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for y in range(h):  # vertical dusk gradient
        t = y / max(1, h - 1)
        c = tuple(int(DUSK[i] * (1 - t) + DUSK_DEEP[i] * t) for i in range(4))
        d.line([(0, y), (w, y)], fill=c)
    d.rectangle([2, 2, w - 3, h - 3], outline=border, width=4)
    d.rectangle([9, 9, w - 10, h - 10], outline=(border[0], border[1], border[2], 90), width=2)
    return img, d


def banner(name, roman, title, sub):
    img, d = panel(640, 160)
    d.text((34, 22), f'ACT {roman}', font=font('bahnschrift.ttf', 30), fill=EMBER)
    d.text((32, 52), title, font=font('impact.ttf', 74), fill=BONE)
    d.text((608, 128), sub, font=font('bahnschrift.ttf', 24), fill=DUSTY, anchor='rs')
    img.save(os.path.join(OUT, name + '.png'))


def hud():
    img, d = panel(480, 140, border=DUSTY)
    sym = font('seguisym.ttf', 26)
    txt = font('consolab.ttf', 24)
    rows = [((255, 85, 85, 255), '\u2694', 'Wave 3 \u2014 Hostiles remaining: 7', 'a wave is on'),
            ((85, 255, 255, 255), '\u23f1', 'Next Wave 4 in: 9:42', 'build time'),
            ((255, 85, 85, 255), '', 'THE PEDESTAL IS UNDER ATTACK', 'go home')]
    y = 18
    for color, s, text, note in rows:
        x = 22
        if s:
            d.text((x, y - 2), s, font=sym, fill=color)
            x += 32
        d.text((x, y), text, font=txt, fill=color)
        y += 38
    img.save(os.path.join(OUT, 'hud.png'))


def shape_points(kind, cx, cy, r):
    if kind == 'circle':
        return None
    if kind == 'gear':
        return [(cx + (r if i % 2 == 0 else r * 0.78) * math.cos(i * math.pi / 8),
                 cy + (r if i % 2 == 0 else r * 0.78) * math.sin(i * math.pi / 8)) for i in range(16)]
    n, a0 = {'hexagon': (6, 0), 'pentagon': (5, -math.pi / 2), 'diamond': (4, -math.pi / 2),
             'octagon': (8, math.pi / 8)}[kind]
    return [(cx + r * math.cos(a0 + i * 2 * math.pi / n), cy + r * math.sin(a0 + i * 2 * math.pi / n)) for i in range(n)]


def legend():
    img, d = panel(560, 230, border=DUSTY)
    lab = font('bahnschrift.ttf', 22)
    items = [('rsquare', 'Story'), ('gear', 'New act'), ('hexagon', 'Craft'), ('pentagon', 'Beyond'),
             ('circle', 'Field note'), ('diamond', 'Field test'), ('octagon', 'Challenge')]
    for i, (kind, name) in enumerate(items):
        row, col = divmod(i, 4)
        cx = 70 + col * 135 + (row * 67)
        cy = 58 + row * 100
        r = 24
        if kind == 'rsquare':
            d.rounded_rectangle([cx - r, cy - r, cx + r, cy + r], radius=9, fill=DUSK_DEEP, outline=BONE, width=3)
        elif kind == 'circle':
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=DUSK_DEEP, outline=BONE, width=3)
        elif kind == 'gear':
            for k in range(8):  # teeth, then the body over them
                a = k * math.pi / 4
                tx, ty = cx + r * 0.92 * math.cos(a), cy + r * 0.92 * math.sin(a)
                d.rectangle([tx - 5, ty - 5, tx + 5, ty + 5], fill=BONE)
            d.ellipse([cx - r * 0.78, cy - r * 0.78, cx + r * 0.78, cy + r * 0.78], fill=DUSK_DEEP, outline=BONE, width=3)
        else:
            pts = shape_points(kind, cx, cy, r)
            d.polygon(pts, fill=DUSK_DEEP, outline=BONE, width=3)
        d.text((cx, cy + r + 6), name, font=lab, fill=BONE, anchor='mt')
    img.save(os.path.join(OUT, 'legend.png'))


def main():
    os.makedirs(OUT, exist_ok=True)
    banner('act1', 'I', 'ARRIVAL', 'to the first bag')
    banner('act2', 'II', 'DIG IN', 'waves 1 to 8')
    banner('act3', 'III', 'POWER', 'waves 9 to 15')
    banner('act4', 'IV', 'HORDES', 'no ceiling')
    hud()
    legend()
    print('written:', sorted(os.listdir(OUT)))


if __name__ == '__main__':
    main()
