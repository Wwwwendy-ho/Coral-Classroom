import json
from pathlib import Path
import numpy as np
from PIL import Image

POL = Path(__file__).resolve().parent
ST1 = POL.parents[1] / "stage-organic-v1"
pos = np.load(POL / "uv_pos.npy")
nrm = np.load(POL / "uv_nrm.npy")
tex = np.array(Image.open(ST1 / "raw-tex-0.webp").convert("RGB"), dtype=np.float32)
mr = np.array(Image.open(ST1 / "raw-tex-1.webp").convert("RGB"), dtype=np.float32)
meta = json.loads((POL / "polish-meta.json").read_text())

for name, key in [("eye_L", "eye_L"), ("eye_R", "eye_R")]:
    c = np.array(meta[key], dtype=np.float32)
    d = np.linalg.norm(pos - c, axis=-1)
    m = d < 0.08
    print(name, "d<0.08 count:", int(m.sum()), "RGB median:", np.median(tex[m], axis=0).astype(int).tolist() if m.sum() else None)
    # Also locate actual metallic eye circle in mr[..., 2] > 100 near head!
    head_m = (pos[..., 2] > 1.1) & (pos[..., 1] < -0.9) & (mr[..., 2] > 80)
    if key == "eye_L":
        hm = head_m & (pos[..., 0] < 0)
    else:
        hm = head_m & (pos[..., 0] > 0)
    if hm.sum():
        pts = pos[hm]
        ns = nrm[hm]
        mean_n = ns.mean(axis=0)
        mean_n /= np.linalg.norm(mean_n)
        print("  metallic-eye centroid:", np.round(pts.mean(axis=0), 4).tolist(),
              "min:", np.round(pts.min(axis=0), 4).tolist(),
              "max:", np.round(pts.max(axis=0), 4).tolist(),
              "mean_n:", np.round(mean_n, 4).tolist(),
              "pixels:", int(hm.sum()))

shell_m = (pos[..., 2] > 0.55) & (pos[..., 1] > -0.45) & (pos[..., 1] < 1.35)
print("shell d<0.55 count:", int(shell_m.sum()), "RGB median:", np.median(tex[shell_m], axis=0).astype(int).tolist())
