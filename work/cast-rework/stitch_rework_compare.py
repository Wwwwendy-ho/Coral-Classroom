"""Stitch 5x3 Old vs New Front 3/4 vs New Back/Side 3/4 grid into rework-5-compare.png."""
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
TILES = HERE / "_compare_tiles"
OUT = HERE / "rework-5-compare.png"
SCRATCH = Path("/mnt/c/Users/20750/.gemini/antigravity/brain/d166c57a-61c7-4fac-a88e-e23166d364f3/scratch") / "rework-5-compare.png"

ROWS = [
    ("echo", "Echo\n(Beluga Whale)"),
    ("taxi-squid", "Taxi Squid\n(Town Cab)"),
    ("bok", "Bok\n(Puffer Merchant)"),
    ("hana", "Keeper Hana\n(Jellyfish)"),
    ("captain-bay", "Captain Bay\n(Walrus Captain)"),
]
COLS = [
    ("old", "BEFORE\n(Old Model)"),
    ("new_front", "AFTER\n(MP Front 3/4)"),
    ("new_back", "AFTER\n(MP Back / Side)"),
]


def load_font(size):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "C:/Windows/Fonts/segoeui.ttf"):
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def main():
    cell = 340
    left_w = 195
    top_h = 98
    gap = 14
    pad = 22
    W = pad * 2 + left_w + len(COLS) * cell + (len(COLS) - 1) * gap
    H = pad * 2 + top_h + len(ROWS) * cell + (len(ROWS) - 1) * gap

    canvas = Image.new("RGB", (W, H), (242, 246, 247))
    draw = ImageDraw.Draw(canvas)
    f_title = load_font(25)
    f_sub = load_font(15)
    f_hdr = load_font(18)

    draw.text((pad, pad), "Visual Gate #3: Full Organic Rework (Echo, Taxi Squid, Bok, Hana, Captain Bay)", fill=(18, 48, 52), font=f_title)
    draw.text((pad, pad + 32), "Offline Blender 4.3.2 Cycles renders of exported -close.glb assets under identical neutral daylight", fill=(65, 92, 96), font=f_sub)

    for ci, (_, c_title) in enumerate(COLS):
        x = pad + left_w + ci * (cell + gap)
        draw.multiline_text((x + 6, pad + top_h - 46), c_title, fill=(24, 62, 66), font=f_hdr, spacing=2)

    for ri, (slug, r_label) in enumerate(ROWS):
        y = pad + top_h + ri * (cell + gap)
        draw.multiline_text((pad + 4, y + cell // 2 - 22), r_label, fill=(24, 52, 56), font=f_hdr, spacing=4)
        for ci, (ckey, _) in enumerate(COLS):
            x = pad + left_w + ci * (cell + gap)
            im = Image.open(TILES / f"{slug}_{ckey}.png").convert("RGB").resize((cell, cell), Image.Resampling.LANCZOS)
            canvas.paste(im, (x, y))

    SCRATCH.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUT, format="PNG", optimize=True)
    shutil.copy2(OUT, SCRATCH)
    print(f"Wrote {OUT} and {SCRATCH}")


if __name__ == "__main__":
    main()
