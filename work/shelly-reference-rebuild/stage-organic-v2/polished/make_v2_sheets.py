"""Build 7-angle contact sheet and side-by-side comparison vs APPROVED-organic-shelly-and-stone-glass-world.png."""
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

POL = Path(__file__).resolve().parent
ST1 = POL.parents[1] / "stage-organic-v1"
BRAIN = Path("/mnt/c/Users/20750/.gemini/antigravity/brain/d166c57a-61c7-4fac-a88e-e23166d364f3/scratch")
VIEWS = ["front", "quarter", "game", "side", "other-side", "back", "top"]


def load_font(size):
    for p in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ):
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def contain(img, w, h, bg=(225, 234, 236)):
    im = img.convert("RGB")
    im.thumbnail((w, h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (w, h), bg)
    canvas.paste(im, ((w - im.width) // 2, (h - im.height) // 2))
    return canvas


def build_7_sheet():
    tile = 320
    pad = 14
    header_h = 56
    label_h = 30
    w = pad + len(VIEWS) * (tile + pad)
    h = header_h + 2 * (label_h + tile + pad) + pad
    sheet = Image.new("RGB", (w, h), (242, 246, 247))
    draw = ImageDraw.Draw(sheet)
    tf = load_font(22)
    sf = load_font(15)
    lf = load_font(16)

    draw.text((pad, 12), "Shelly stage-organic-v2 Polished (Blender 4.3.2 Cycles, unrigged, yaw=0)", fill=(24, 46, 56), font=tf)
    draw.text((pad, 38), "Symmetric pose + gentle smile + tapered flippers + palette/PBR match  |  Top: Color  |  Bottom: Clay", fill=(78, 98, 108), font=sf)

    for r_idx, (tag, folder, suf) in enumerate([("Color", POL / "inspect-color", ""), ("Clay", POL / "inspect-clay", "-clay")]):
        y0 = header_h + r_idx * (label_h + tile + pad)
        for c_idx, name in enumerate(VIEWS):
            x0 = pad + c_idx * (tile + pad)
            img = Image.open(folder / f"{name}{suf}.png").convert("RGB").resize((tile, tile), Image.Resampling.LANCZOS)
            draw.text((x0 + 4, y0 + 5), f"{name} ({tag})", fill=(32, 58, 68), font=lf)
            sheet.paste(img, (x0, y0 + label_h))

    out = POL / "contact-sheet-7views.png"
    sheet.save(out, format="PNG", optimize=True)
    shutil.copy2(out, BRAIN / "shelly-organic-v2-sheet.png")
    print(f"Saved {out} and scratch copy")


def build_comparison():
    pw, ph = 380, 340
    pad = 16
    header_h = 58
    label_h = 28
    cols = 4
    w = pad + cols * (pw + pad)
    h = header_h + 2 * (label_h + ph + pad) + pad
    canvas = Image.new("RGB", (w, h), (242, 246, 247))
    draw = ImageDraw.Draw(canvas)
    tf = load_font(22)
    sf = load_font(14)
    lf = load_font(15)

    draw.text((pad, 12), "Shelly Visual Likeness Comparison: Approved Concept vs v1 Raw vs v2 Polished", fill=(24, 46, 56), font=tf)
    draw.text((pad, 38), "All 3D images are offline Blender 4.3.2 Cycles renders (not yet rigged or in-game)", fill=(78, 98, 108), font=sf)

    approved = Image.open(BRAIN / "approved-shelly-crop.png")
    panels = [
        [
            ("Approved Target (2D concept crop)", contain(approved, pw, ph, (218, 232, 236))),
            ("v1 Raw TRELLIS (quarter)", contain(Image.open(ST1 / "inspect-color" / "quarter.png"), pw, ph, (132, 148, 152))),
            ("v2 Polished (quarter)", contain(Image.open(POL / "inspect-color" / "quarter.png"), pw, ph, (132, 148, 152))),
            ("v2 Polished (warm 3/4 daylight)", contain(Image.open(POL / "matched-target-angle.png"), pw, ph, (140, 190, 204))),
        ],
        [
            ("v1 Raw (front)", contain(Image.open(ST1 / "inspect-color" / "front.png"), pw, ph, (132, 148, 152))),
            ("v2 Polished (front)", contain(Image.open(POL / "inspect-color" / "front.png"), pw, ph, (132, 148, 152))),
            ("v2 Polished (game angle)", contain(Image.open(POL / "inspect-color" / "game.png"), pw, ph, (132, 148, 152))),
            ("v2 Polished (top-down)", contain(Image.open(POL / "inspect-color" / "top.png"), pw, ph, (132, 148, 152))),
        ],
    ]

    for r_idx, row in enumerate(panels):
        y0 = header_h + r_idx * (label_h + ph + pad)
        for c_idx, (title, im) in enumerate(row):
            x0 = pad + c_idx * (pw + pad)
            draw.text((x0 + 4, y0 + 4), title, fill=(32, 58, 68), font=lf)
            canvas.paste(im, (x0, y0 + label_h))

    out = POL / "comparison-vs-approved.png"
    canvas.save(out, format="PNG", optimize=True)
    shutil.copy2(out, BRAIN / "shelly-v2-vs-approved.png")
    print(f"Saved {out} and scratch copy")


def main():
    build_7_sheet()
    build_comparison()


if __name__ == "__main__":
    main()
