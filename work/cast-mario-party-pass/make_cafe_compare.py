"""Composite 2x3 Before (Canonical) vs After (Mario-Party Pass) sheet for Café Seahorse."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent / "cafe-seahorse-mp"
TILES = HERE / "_tiles"
OUT = HERE / "cafe-seahorse-mp-compare.png"


def load_font(size):
    for p in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
    ):
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def main():
    cols = [("front", "Face Front"), ("quarter", "Encounter Quarter"), ("body", "Full Body")]
    rows = [("before", "BEFORE\nCanonical"), ("after", "AFTER\nMario-Party Pass")]

    cell = 440
    left_w = 210
    top_h = 84
    gap = 14
    pad = 24

    W = pad * 2 + left_w + len(cols) * cell + (len(cols) - 1) * gap
    H = pad * 2 + top_h + len(rows) * cell + (len(rows) - 1) * gap

    canvas = Image.new("RGB", (W, H), (240, 245, 246))
    draw = ImageDraw.Draw(canvas)
    f_title = load_font(26)
    f_sub = load_font(15)
    f_hdr = load_font(19)

    draw.text((pad, pad), "Café Seahorse: Canonical Before vs True Mario-Party Pass After", fill=(18, 48, 52), font=f_title)
    draw.text((pad, pad + 34), "Parametric open-eye polish geometry + silky coral-peach skin, glowing amber iris, clean vanilla apron (close LOD, Cycles)", fill=(65, 92, 96), font=f_sub)

    for ci, (_, c_title) in enumerate(cols):
        x = pad + left_w + ci * (cell + gap)
        draw.text((x + 6, pad + top_h - 32), c_title, fill=(24, 62, 66), font=f_hdr)

    for ri, (r_key, r_label) in enumerate(rows):
        y = pad + top_h + ri * (cell + gap)
        draw.multiline_text((pad + 6, y + cell // 2 - 28), r_label, fill=(24, 52, 56), font=f_hdr, spacing=6)
        for ci, (c_key, _) in enumerate(cols):
            x = pad + left_w + ci * (cell + gap)
            im = Image.open(TILES / f"{r_key}-{c_key}.png").convert("RGB").resize((cell, cell), Image.Resampling.LANCZOS)
            canvas.paste(im, (x, y))

    canvas.save(OUT, format="PNG", optimize=True)
    print("Wrote", OUT)


if __name__ == "__main__":
    main()
