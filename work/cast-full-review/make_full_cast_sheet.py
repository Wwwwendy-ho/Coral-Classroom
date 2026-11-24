"""Composite all 13 authored 3D characters + 6 procedural/concept-only roster card into full-3d-cast-review.png."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
TILES = HERE / "_tiles"
OUT = HERE / "full-3d-cast-review.png"

ITEMS = [
    ("shelly-v4", "1. Shelly (v4 Eyes)", "Staged Hero"),
    ("cafe-mp", "2. Cafe Seahorse (MP)", "Staged MP Pass"),
    ("shop-octopus", "3. Shop Octopus", "Canonical (Town)"),
    ("jisu", "4. Jisu (Hermit Crab)", "Canonical (Beach)"),
    ("taxi-squid", "5. Taxi Squid", "Canonical (Town)"),
    ("echo", "6. Echo (Beluga)", "Art-Source Candidate"),
    ("pip", "7. Pip (Royal Gramma)", "Art-Source Candidate"),
    ("mira", "8. Mira (Teen Turtle)", "Art-Source Candidate"),
    ("mochi", "9. Kiko Mochi (Crab)", "Generated Board"),
    ("hermit", "10. Kiko Hermit (Crab)", "Generated Board"),
    ("bok", "11. Bok (Puffer)", "Generated Board"),
    ("hana", "12. Keeper Hana (Jelly)", "Generated Board"),
    ("captain-bay", "13. Captain Bay (Walrus)", "Generated Board"),
]


def load_font(size):
    for p in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
    ):
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

    draw.text((pad, pad), "Coral Classroom — Full 19-Character Cast Visual Review (All 13 Authored 3D Models)", fill=(18, 48, 52), font=f_title)
    draw.text((pad, pad + 34), "Identical neutral daylight Cycles renders for uniform cuteness & Mario-Party style comparison", fill=(65, 92, 96), font=f_sub)

    for idx, (slug, name, tag) in enumerate(ITEMS):
        r = idx // cols
        c = idx % cols
        x = pad + c * (cell + gap)
        y = pad + top_h + r * (cell + label_h + gap)
        draw.text((x + 4, y + 4), name, fill=(18, 48, 52), font=f_name)
        draw.text((x + 4, y + 26), tag, fill=(65, 96, 102), font=f_tag)
        im = Image.open(TILES / f"{slug}.png").convert("RGB").resize((cell, cell), Image.Resampling.LANCZOS)
        canvas.paste(im, (x, y + label_h))

    # Draw clean summary card in slots 14..15 for remaining 6 procedural/concept-only roles
    rx = pad + 3 * (cell + gap)
    ry = pad + top_h + 2 * (cell + label_h + gap) + label_h
    rw = 2 * cell + gap
    rh = cell
    draw.rectangle((rx, ry, rx + rw, ry + rh), fill=(224, 234, 236), outline=(145, 172, 178), width=2)
    draw.text((rx + 22, ry + 24), "Remaining 6 Cast Roles (Procedural / Concept-Only):", fill=(18, 48, 52), font=f_name)
    notes = [
        "14. Subway Guide (Spotted Eagle Ray) — town procedural + concept",
        "15. Server (Sea Otter) — restaurant procedural + concept",
        "16. Hotel Clerk (Whale) — hotel procedural + concept",
        "17. Pharmacist (Shrimp) — pharmacy procedural + concept",
        "18. Friend (Seal) — beach friend procedural + concept",
        "19. Lumi (Anglerfish) — concept lineup only",
        "",
        "Also: board companion crabs re-use Kiko Mochi / Hermit designs.",
    ]
    yy = ry + 64
    for line in notes:
        draw.text((rx + 22, yy), line, fill=(40, 68, 74), font=f_tag)
        yy += 28

    canvas.save(OUT, format="PNG", optimize=True)
    print("Wrote", OUT)


if __name__ == "__main__":
    main()
