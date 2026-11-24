"""Composite all 13 Mario-Party 3D characters + 6 procedural roster card into full-3d-cast-review-v2.png."""
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
TILES = HERE / "_tiles_v2"
OUT = HERE / "full-3d-cast-review-v2.png"
SCRATCH = Path("/mnt/c/Users/20750/.gemini/antigravity/brain/d166c57a-61c7-4fac-a88e-e23166d364f3/scratch") / "full-3d-cast-review-v2.png"

ITEMS = [
    ("shelly-v4", "1. Shelly (v4 Eyes)", "Hero (Board & Close)"),
    ("cafe-mp", "2. Cafe Seahorse (MP)", "Town Cafe"),
    ("shop-octopus", "3. Shop Octopus (MP)", "Town Shop"),
    ("jisu", "4. Jisu (MP)", "Bottle Beach"),
    ("taxi-squid", "5. Taxi Squid (Rework)", "Town Cab"),
    ("echo", "6. Echo (Rework)", "Echo Caves"),
    ("pip", "7. Pip (MP)", "Pattern Reef"),
    ("mira", "8. Mira (MP)", "Coral Lagoon"),
    ("mochi", "9. Kiko Mochi (MP)", "Companion Crab"),
    ("hermit", "10. Kiko Hermit (MP)", "Companion Crab"),
    ("bok", "11. Bok (Rework)", "Shopkeeper"),
    ("hana", "12. Keeper Hana (Rework)", "Lighthouse"),
    ("captain-bay", "13. Captain Bay (Rework)", "Captain's Deck"),
]


def load_font(size):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "C:/Windows/Fonts/segoeui.ttf"):
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def main():
    cols = 5
    rows = 3
    cell = 340
    label_h = 54
    gap = 14
    pad = 24
    top_h = 84

    W = pad * 2 + cols * cell + (cols - 1) * gap
    H = pad * 2 + top_h + rows * (cell + label_h) + (rows - 1) * gap

    canvas = Image.new("RGB", (W, H), (240, 245, 246))
    draw = ImageDraw.Draw(canvas)
    f_title = load_font(26)
    f_sub = load_font(15)
    f_name = load_font(17)
    f_tag = load_font(14)

    draw.text((pad, pad), "Coral Classroom — Unified Mario-Party Cast Review (All 13 Authored 3D Models)", fill=(18, 48, 52), font=f_title)
    draw.text((pad, pad + 34), "Visual Gate #4: Identical neutral daylight Cycles renders (smooth satin-matte surfaces + expressive luminous eyes)", fill=(65, 92, 96), font=f_sub)

    for idx, (slug, name, tag) in enumerate(ITEMS):
        r = idx // cols
        c = idx % cols
        x = pad + c * (cell + gap)
        y = pad + top_h + r * (cell + label_h + gap)
        draw.text((x + 4, y + 4), name, fill=(18, 48, 52), font=f_name)
        draw.text((x + 4, y + 26), tag, fill=(65, 96, 102), font=f_tag)
        im = Image.open(TILES / f"{slug}.png").convert("RGB").resize((cell, cell), Image.Resampling.LANCZOS)
        canvas.paste(im, (x, y + label_h))

    rx = pad + 3 * (cell + gap)
    ry = pad + top_h + 2 * (cell + label_h + gap) + label_h
    rw = 2 * cell + gap
    rh = cell
    draw.rectangle((rx, ry, rx + rw, ry + rh), fill=(224, 234, 236), outline=(145, 172, 178), width=2)
    draw.text((rx + 22, ry + 24), "All 13 Authored 3D Characters Upgraded:", fill=(18, 48, 52), font=f_name)
    notes = [
        "- Shelly v4 + loading icon + Mira smooth teen turtle",
        "- Smooth MP passes: Cafe Seahorse, Octopus, Jisu, Pip, Kikos",
        "- Full Hunyuan3D MP reworks: Echo, Taxi Squid, Bok, Hana, Bay",
        "",
        "Remaining town procedural NPCs (ray, otter, whale, shrimp, seal)",
        "stay aligned cleanly in pastel Mario-Party harmony.",
    ]
    yy = ry + 64
    for line in notes:
        draw.text((rx + 22, yy), line, fill=(40, 68, 74), font=f_tag)
        yy += 28

    SCRATCH.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUT, format="PNG", optimize=True)
    shutil.copy2(OUT, SCRATCH)
    print(f"Wrote {OUT} and {SCRATCH}")


if __name__ == "__main__":
    main()
