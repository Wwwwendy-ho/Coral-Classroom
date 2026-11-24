"""Inspect and prepare a clean, white-background square input from UNAPPROVED-isolated-shelly-reference.png."""
from pathlib import Path
import numpy as np
from PIL import Image

STAGE = Path(__file__).resolve().parent
REPO = STAGE.parents[2]
SRC = REPO / "references" / "UNAPPROVED-isolated-shelly-reference.png"
OUT = STAGE / "input-shelly-clean.png"


def main():
    img = Image.open(SRC)
    print(f"Source: {SRC}")
    print(f"Size: {img.size}, Mode: {img.mode}")
    rgba = np.array(img.convert("RGBA"), dtype=np.float32)
    alpha = rgba[..., 3]
    for thresh in (1, 10, 32, 64, 128, 200, 245, 254):
        ys, xs = np.where(alpha >= thresh)
        pct = 100.0 * np.mean(alpha >= thresh)
        bbox = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())) if len(xs) else None
        print(f"  alpha >= {thresh:3d}: {pct:5.2f}% pixels, bbox={bbox}")

    # Soft glow/feather pixels below alpha=18 make noisy fringes in image-to-3D,
    # while the body interior sits around alpha=245..254. Preserve full interior opacity.
    a_norm = np.clip((alpha - 18.0) / (245.0 - 18.0), 0.0, 1.0)
    rgb = rgba[..., :3]
    comp = rgb * a_norm[..., None] + 255.0 * (1.0 - a_norm[..., None])
    comp_u8 = np.clip(np.round(comp), 0, 255).astype(np.uint8)

    ys, xs = np.where(a_norm > 0.05)
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    crop = Image.fromarray(comp_u8[y0:y1, x0:x1], mode="RGB")

    w, h = crop.size
    side = int(round(max(w, h) / 0.84))  # ~8% margin on each side
    canvas = Image.new("RGB", (side, side), (255, 255, 255))
    ox = (side - w) // 2
    oy = (side - h) // 2
    canvas.paste(crop, (ox, oy))
    canvas.save(OUT, format="PNG", optimize=True)
    print(f"Saved clean input: {OUT} ({canvas.size}, cropped {w}x{h} into {side}x{side})")


if __name__ == "__main__":
    main()
