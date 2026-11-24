"""Assemble cast-style-lineup.png from 5 rendered cast tiles and copy to brain scratch."""
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ST3 = Path(__file__).resolve().parent
TILES = ST3 / "_cast_tiles"
BRAIN = Path("/mnt/c/Users/20750/.gemini/antigravity/brain/d166c57a-61c7-4fac-a88e-e23166d364f3/scratch")

ITEMS = [
    ("shelly-mp", "Shelly v3-MP (NEW BAR)\n22,199 tris · Clean stylized"),
    ("jisu", "Jisu (Canonical)\n7,738 tris · Hermit crab"),
    ("seahorse", "Cafe Seahorse (Canonical)\n8,040 tris"),
    ("octopus", "Shop Octopus (Canonical)\n8,048 tris"),
    ("squid", "Taxi Squid (Canonical)\n8,319 tris"),
]


def load_font(size):
    for p in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ):
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def main():
    tile = 340
    pad = 16
    header_h = 58
    label_h = 46
    cols = len(ITEMS)
    w = pad + cols * (tile + pad)
    h = header_h + label_h + tile + pad
    sheet = Image.new("RGB", (w, h), (242, 246, 247))
    draw = ImageDraw.Draw(sheet)
    tf = load_font(22)
    sf = load_font(14)
    lf = load_font(14)

    draw.text((pad, 12), "Coral Classroom Resident Cast Lineup vs Mario-Party Shelly v3-MP", fill=(24, 46, 56), font=tf)
    draw.text((pad, 38), "Offline Blender 4.3.2 Cycles 3/4 audit renders under matched lighting (canonical GLBs read-only)", fill=(78, 98, 108), font=sf)

    for idx, (slug, label) in enumerate(ITEMS):
        x0 = pad + idx * (tile + pad)
        y0 = header_h
        im = Image.open(TILES / f"{slug}.png").convert("RGB").resize((tile, tile), Image.Resampling.LANCZOS)
        # Subtle teal frame highlight on Shelly v3-MP anchor card
        if slug == "shelly-mp":
            draw.rectangle([x0 - 3, y0 - 2, x0 + tile + 2, y0 + label_h + tile + 2], outline=(33, 95, 96), width=3)
        draw.multiline_text((x0 + 4, y0 + 4), label, fill=(24, 52, 58), font=lf, spacing=3)
        sheet.paste(im, (x0, y0 + label_h))

    out = ST3 / "cast-style-lineup.png"
    sheet.save(out, format="PNG", optimize=True)
    shutil.copy2(out, BRAIN / "cast-style-lineup.png")
    print(f"Saved {out} and scratch copy")


if __name__ == "__main__":
    main()
