"""Stitch concept cutout + 4-angle clay turnarounds into raw-shapes-turnaround.png."""
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
TILES = HERE / "_shape_tiles"
OUT = HERE / "raw-shapes-turnaround.png"
SCRATCH = Path("/mnt/c/Users/20750/.gemini/antigravity/brain/d166c57a-61c7-4fac-a88e-e23166d364f3/scratch") / "raw-shapes-turnaround.png"
SLUGS = ["echo", "taxi-squid", "bok", "hana", "captain-bay"]


def load_font(size):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "C:/Windows/Fonts/segoeui.ttf"):
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def main():
    rows = [s for s in SLUGS if (TILES / f"{s}_yaw0.png").exists()]
    cols = [
        ("cutout", "Concept Cutout"),
        ("yaw0", "yaw0 (-Y Cam)"),
        ("yaw90", "yaw90 (+X Cam)"),
        ("yaw180", "yaw180 (+Y Cam)"),
        ("yaw270", "yaw270 (-X Cam)"),
    ]
    cell = 280
    left_w = 155
    top_h = 84
    gap = 12
    pad = 20
    W = pad * 2 + left_w + len(cols) * cell + (len(cols) - 1) * gap
    H = pad * 2 + top_h + len(rows) * cell + (len(rows) - 1) * gap

    canvas = Image.new("RGB", (W, H), (242, 246, 247))
    draw = ImageDraw.Draw(canvas)
    f_title = load_font(22)
    f_hdr = load_font(16)

    draw.text((pad, pad), "Visual Gate #2: Local Hunyuan3D-2mini Clay Mesh Turnarounds", fill=(18, 48, 52), font=f_title)
    draw.text((pad, pad + 30), "Concept cutout vs 4 camera azimuths around raw-shape.glb (identifies exact forward yaw offset)", fill=(65, 92, 96), font=f_hdr)

    for ci, (_, label) in enumerate(cols):
        x = pad + left_w + ci * (cell + gap)
        draw.text((x + 4, pad + top_h - 26), label, fill=(24, 62, 66), font=f_hdr)

    for ri, slug in enumerate(rows):
        y = pad + top_h + ri * (cell + gap)
        draw.text((pad + 4, y + cell // 2 - 12), slug, fill=(24, 52, 56), font=f_hdr)
        for ci, (ckey, _) in enumerate(cols):
            x = pad + left_w + ci * (cell + gap)
            if ckey == "cutout":
                bg = Image.new("RGBA", (cell, cell), (185, 200, 206, 255))
                fg = Image.open(HERE / slug / "concept-cutout.png").convert("RGBA").resize((cell, cell), Image.Resampling.LANCZOS)
                im = Image.alpha_composite(bg, fg).convert("RGB")
            else:
                im = Image.open(TILES / f"{slug}_{ckey}.png").convert("RGB").resize((cell, cell), Image.Resampling.LANCZOS)
            canvas.paste(im, (x, y))

    SCRATCH.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUT, format="PNG", optimize=True)
    shutil.copy2(OUT, SCRATCH)
    print(f"Wrote {OUT} and {SCRATCH}")


if __name__ == "__main__":
    main()
