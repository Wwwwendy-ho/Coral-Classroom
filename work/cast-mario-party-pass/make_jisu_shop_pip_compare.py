"""Stitch 3x3 Before vs After comparison grid for Jisu, Shop Octopus, and Pip."""
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
TILES = HERE / "_tiles_jsp"
OUT = HERE / "jisu-shop-pip-compare.png"
SCRATCH = Path("/mnt/c/Users/20750/.gemini/antigravity/brain/d166c57a-61c7-4fac-a88e-e23166d364f3/scratch") / "jisu-shop-pip-compare.png"


def load_font(size):
    for p in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
    ):
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def main():
    rows = [
        ("jisu", "Jisu\n(Hermit Crab)"),
        ("shop-octopus", "Shop Octopus\n(Town Shop)"),
        ("pip", "Pip\n(Royal Gramma)"),
    ]
    cols = [
        ("before_hero", "BEFORE\n(Original 3/4 Hero)"),
        ("after_hero", "AFTER\n(MP Pass 3/4 Hero)"),
        ("after_front", "AFTER\n(MP Pass Front Face)"),
    ]

    cell = 420
    left_w = 195
    top_h = 112
    gap = 16
    pad = 24
    W = pad * 2 + left_w + len(cols) * cell + (len(cols) - 1) * gap
    H = pad * 2 + top_h + len(rows) * cell + (len(rows) - 1) * gap

    canvas = Image.new("RGB", (W, H), (242, 246, 247))
    draw = ImageDraw.Draw(canvas)
    f_title = load_font(26)
    f_sub = load_font(15)
    f_hdr = load_font(18)

    draw.text((pad, pad), "Phase 1 Visual Gate: Jisu, Shop Octopus & Pip Mario-Party Pass", fill=(18, 48, 52), font=f_title)
    draw.text((pad, pad + 34), "Offline Blender 4.3.2 Cycles renders: smooth gradients, clean sclera/irises/catchlights, zero mottled noise", fill=(65, 92, 96), font=f_sub)

    for ci, (_, c_title) in enumerate(cols):
        x = pad + left_w + ci * (cell + gap)
        draw.multiline_text((x + 6, pad + top_h - 46), c_title, fill=(24, 62, 66), font=f_hdr, spacing=2)

    for ri, (r_key, r_label) in enumerate(rows):
        y = pad + top_h + ri * (cell + gap)
        draw.multiline_text((pad + 4, y + cell // 2 - 26), r_label, fill=(24, 52, 56), font=f_hdr, spacing=4)
        for ci, (c_key, _) in enumerate(cols):
            x = pad + left_w + ci * (cell + gap)
            im = Image.open(TILES / f"{r_key}_{c_key}.png").convert("RGB").resize((cell, cell), Image.Resampling.LANCZOS)
            canvas.paste(im, (x, y))

    SCRATCH.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUT, format="PNG", optimize=True)
    shutil.copy2(OUT, SCRATCH)
    print(f"Wrote {OUT} and {SCRATCH}")


if __name__ == "__main__":
    main()
