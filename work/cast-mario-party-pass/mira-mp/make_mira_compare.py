"""Composite 4-panel Old Spiky Mira vs New Smooth Teen Mira vs Shelly v4 comparison sheet."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
TILES = HERE / "_tiles"
OUT = HERE / "mira-mp-compare.png"


def load_font(size):
    for p in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
    ):
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def main():
    cols = [
        ("old", "BEFORE: Old Spiky Mira\n(derived from pre-MP shelly.blend)"),
        ("new_q", "AFTER: Smooth Teen Mira MP\n(3/4 Hero — goggles & satchel)"),
        ("new_f", "AFTER: Smooth Teen Mira MP\n(Front Face — lash & aqua eyes)"),
        ("shelly", "FAMILY MATCH: Shelly (v4)\n(Child Turtle Style Bar)"),
    ]
    cell = 410
    top_h = 112
    gap = 14
    pad = 24
    W = pad * 2 + len(cols) * cell + (len(cols) - 1) * gap
    H = pad * 2 + top_h + cell

    canvas = Image.new("RGB", (W, H), (240, 245, 246))
    draw = ImageDraw.Draw(canvas)
    f_title = load_font(26)
    f_sub = load_font(15)
    f_hdr = load_font(16)

    draw.text((pad, pad), "Mira Rebuild: Eliminating Old Spikes & Matching Shelly's Smooth Teenage Turtle Family", fill=(18, 48, 52), font=f_title)
    draw.text((pad, pad + 34), "Rebuilt on smooth organic Shelly mesh with sleek teen proportions, coastal slate-teal shell, turquoise eyes, goggles & satchel", fill=(65, 92, 96), font=f_sub)

    for ci, (key, title) in enumerate(cols):
        x = pad + ci * (cell + gap)
        draw.multiline_text((x + 6, pad + 64), title, fill=(24, 56, 60), font=f_hdr, spacing=4)
        im = Image.open(TILES / f"{key}.png").convert("RGB").resize((cell, cell), Image.Resampling.LANCZOS)
        canvas.paste(im, (x, pad + top_h))

    canvas.save(OUT, format="PNG", optimize=True)
    print("Wrote", OUT)


if __name__ == "__main__":
    main()
