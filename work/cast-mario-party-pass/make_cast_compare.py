"""Stitch Before (Canonical) vs After (Mario-Party Pass) cast sheet and copy to brain scratch."""
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
TILES = HERE / "_tiles"
BRAIN = Path("/mnt/c/Users/20750/.gemini/antigravity/brain/d166c57a-61c7-4fac-a88e-e23166d364f3/scratch")

COLS = [
    ("jisu", "Jisu\n(Hermit Crab)"),
    ("cafe-seahorse", "Cafe\nSeahorse"),
    ("shop-octopus", "Shop\nOctopus"),
    ("taxi-squid", "Taxi\nSquid"),
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
    tile = 320
    pad = 16
    row_lbl_w = 135
    header_h = 58
    col_hdr_h = 46
    cols = len(COLS) + 1  # +1 for Shelly anchor column
    w = pad + row_lbl_w + cols * (tile + pad)
    h = header_h + col_hdr_h + 2 * (tile + pad) + pad
    sheet = Image.new("RGB", (w, h), (242, 246, 247))
    draw = ImageDraw.Draw(sheet)
    tf = load_font(22)
    sf = load_font(14)
    lf = load_font(15)

    draw.text((pad, 12), "Cast Unification Pass: Canonical Before vs Mario-Party After", fill=(24, 46, 56), font=tf)
    draw.text((pad, 38), "Offline Blender 4.3.2 Cycles renders under identical lighting (rig/weights/OctopusSkinMask alpha preserved)", fill=(78, 98, 108), font=sf)

    # Column headers (cols 0..3 residents, col 4 = Shelly anchor)
    for c_idx, (_, title) in enumerate(COLS):
        x0 = pad + row_lbl_w + c_idx * (tile + pad)
        draw.multiline_text((x0 + 4, header_h + 4), title, fill=(32, 58, 68), font=lf, spacing=2)
    sx0 = pad + row_lbl_w + len(COLS) * (tile + pad)
    draw.multiline_text((sx0 + 4, header_h + 4), "Shelly\n(MP Style Bar)", fill=(20, 92, 92), font=lf, spacing=2)

    for r_idx, (r_label, suf) in enumerate([("BEFORE\n(Canonical)", "before"), ("AFTER\n(Mario-Party\nPass)", "after")]):
        y0 = header_h + col_hdr_h + r_idx * (tile + pad)
        draw.multiline_text((pad, y0 + tile // 2 - 28), r_label, fill=(32, 58, 68), font=lf, spacing=4)
        for c_idx, (slug, _) in enumerate(COLS):
            x0 = pad + row_lbl_w + c_idx * (tile + pad)
            im = Image.open(TILES / f"{slug}-{suf}.png").convert("RGB").resize((tile, tile), Image.Resampling.LANCZOS)
            sheet.paste(im, (x0, y0))

    # Paste Shelly anchor alongside row 1 (After) for direct comparison
    sh_y = header_h + col_hdr_h + (tile + pad)
    sh_im = Image.open(TILES / "shelly-mp.png").convert("RGB").resize((tile, tile), Image.Resampling.LANCZOS)
    draw.rectangle([sx0 - 3, sh_y - 3, sx0 + tile + 2, sh_y + tile + 2], outline=(33, 95, 96), width=3)
    sheet.paste(sh_im, (sx0, sh_y))

    out = HERE / "cast-before-after.png"
    sheet.save(out, format="PNG", optimize=True)
    shutil.copy2(out, BRAIN / "cast-before-after.png")
    print(f"Saved {out} and scratch copy")


if __name__ == "__main__":
    main()
