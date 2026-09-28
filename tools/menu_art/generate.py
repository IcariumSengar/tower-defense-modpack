"""Builds every menu-screen asset into pack/config/fancymenu/assets/td/.

Usage (from the repo root):  python tools/menu_art/generate.py [--preview DIR]

Everything is drawn procedurally at 640x360 (1 art px = 1 GUI px at GUI
scale 3 on 1080p) and saved at UPSCALE x with nearest-neighbour so the pixel
art stays crisp whatever filtering the renderer applies. --preview also
writes 1920x1080 mock-ups of each screen for eyeballing.
"""

import argparse
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import embers  # noqa: E402
import logo  # noqa: E402
import scene  # noqa: E402
import ui  # noqa: E402

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(REPO, "pack", "config", "fancymenu", "assets", "td")
UPSCALE = 1


def up(img, k=None):
    k = k or UPSCALE
    return img if k == 1 else img.resize((img.width * k, img.height * k), Image.NEAREST)


def dim(img, amount=0.55, desat=0.35):
    """Darkened, desaturated copy for screens with lists/text on top."""
    a = np.asarray(img.convert("RGB")).astype(float)
    grey = a.mean(axis=2, keepdims=True)
    a = a * (1 - desat) + grey * desat
    a = a * (1 - amount)
    return Image.fromarray(a.clip(0, 255).astype(np.uint8), "RGB").convert("RGBA")


def build_all(out=OUT):
    os.makedirs(out, exist_ok=True)
    files = {}
    dusk = scene.build(variant="dusk")
    night = scene.build(variant="night")
    files["bg_dusk.png"] = scene.flatten(dusk)
    files["bg_night.png"] = scene.flatten(night)
    files["bg_dusk_dim.png"] = dim(files["bg_dusk.png"])
    files["bg_night_dim.png"] = dim(files["bg_night.png"], amount=0.35, desat=0.2)
    files["logo.png"] = logo.build()
    files["logo_small.png"] = logo.build_small()
    files["icon16.png"] = ui.window_icon(16)
    files["icon32.png"] = ui.window_icon(32)
    files["column.png"] = ui.column()
    files["rule.png"] = ui.rule()
    for state in ("normal", "hover", "inactive"):
        files[f"button_{state}.png"] = ui.button(state)
    files["bar_background.png"] = ui.bar_background()
    files["bar_progress.png"] = ui.bar_progress()
    files["shade.png"] = ui.shade()
    files["tip_plate.png"] = ui.tip_plate()
    files["tip_plate_solid.png"] = ui.tip_plate(solid=True)
    for name, img in files.items():
        up(img).save(os.path.join(out, name), optimize=True)
    # Animated overlay (APNG). Covers embers.REGION of the 640x360 scene.
    embers.save_apng(os.path.join(out, "embers.apng"))
    files["embers.apng"] = None
    return files


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=OUT)
    ap.add_argument("--preview", default=None, help="also write 1080p mock-ups here")
    args = ap.parse_args()
    files = build_all(args.out)
    total = sum(os.path.getsize(os.path.join(args.out, n)) for n in files)
    print(f"wrote {len(files)} assets to {args.out} ({total / 1024:.0f} KiB)")
    if args.preview:
        os.makedirs(args.preview, exist_ok=True)
        for n in ("bg_dusk.png", "bg_night.png", "bg_dusk_dim.png"):
            files[n].resize((1920, 1080), Image.NEAREST).save(os.path.join(args.preview, "preview_" + n))


if __name__ == "__main__":
    main()
