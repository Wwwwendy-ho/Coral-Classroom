"""Build a labeled 2x7 color + clay contact sheet from Blender inspect_mesh.py outputs."""
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

STAGE = Path(__file__).resolve().parent
COLOR_DIR = STAGE / "inspect-color"
CLAY_DIR = STAGE / "inspect-clay"
OUT = STAGE / "contact-sheet-7views.png"
BRAIN_COPY = Path("/mnt/c/Users/20750/.gemini/antigravity/brain/d166c57a-61c7-4fac-a88e-e23166d364f3/scratch/shelly-organic-v1-sheet.png")

VIEWS = ["front", "quarter", "game", "side", "other-side", "back", "top"]


def load_font(size):
    for candidate in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ):
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def main():
    tile = 320
    pad = 14
    header_h = 56
    label_h = 30
    cols = len(VIEWS)
    width = pad + cols * (tile + pad)
    height = header_h + 2 * (label_h + tile + pad) + pad
    sheet = Image.new("RGB", (width, height), (242, 246, 247))
    draw = ImageDraw.Draw(sheet)

    title_font = load_font(22)
    sub_font = load_font(15)
    label_font = load_font(16)

    draw.text(
        (pad, 12),
        "Shelly stage-organic-v1 (Raw TRELLIS.2, unrigged, offline Blender 4.3.2 Cycles, yaw=0)",
        fill=(24, 46, 56),
        font=title_font,
    )
    draw.text(
        (pad, 38),
        "Top row: textured color renders  |  Bottom row: neutral clay silhouette & topology check",
        fill=(78, 98, 108),
        font=sub_font,
    )

    rows = [
        ("Color", COLOR_DIR, ""),
        ("Clay", CLAY_DIR, "-clay"),
    ]
    for r_idx, (row_tag, folder, suffix) in enumerate(rows):
        y0 = header_h + r_idx * (label_h + tile + pad)
        for c_idx, name in enumerate(VIEWS):
            x0 = pad + c_idx * (tile + pad)
            img_path = folder / f"{name}{suffix}.png"
            img = Image.open(img_path).convert("RGB").resize((tile, tile), Image.Resampling.LANCZOS)
            draw.text((x0 + 4, y0 + 5), f"{name} ({row_tag})", fill=(32, 58, 68), font=label_font)
            sheet.paste(img, (x0, y0 + label_h))

    sheet.save(OUT, format="PNG", optimize=True)
    BRAIN_COPY.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(OUT, BRAIN_COPY)
    print(f"Saved contact sheet: {OUT} ({sheet.size})")
    print(f"Copied to scratch: {BRAIN_COPY}")


if __name__ == "__main__":
    main()
