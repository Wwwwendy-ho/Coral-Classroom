import numpy as np
from PIL import Image

ap = np.array(Image.open("/mnt/c/Users/20750/.gemini/antigravity/scratch/Coral-Classroom/work/shelly-reference-rebuild/stage-organic-v1/input-shelly-clean.png").convert("RGB"), dtype=np.float32)
tx = np.array(Image.open("/mnt/c/Users/20750/.gemini/antigravity/scratch/Coral-Classroom/work/shelly-reference-rebuild/stage-organic-v1/raw-tex-0.webp").convert("RGB"), dtype=np.float32)
mr = np.array(Image.open("/mnt/c/Users/20750/.gemini/antigravity/scratch/Coral-Classroom/work/shelly-reference-rebuild/stage-organic-v1/raw-tex-1.webp").convert("RGB"), dtype=np.float32)

def summarize(name, arr):
    nonwhite = arr[np.min(arr, axis=-1) < 250]
    r, g, b = nonwhite[..., 0], nonwhite[..., 1], nonwhite[..., 2]
    shell = nonwhite[(b > g * 1.05) & (b > 110) & (r > 90)]
    skin = nonwhite[(g > r + 8) & (g > b * 0.90) & (g > 90)]
    cream = nonwhite[(r > 180) & (g > 160) & (b < g * 0.90)]
    rose = nonwhite[(r > g + 25) & (r > 100) & (b > 70) & (b < r + 20)]
    print("===", name, "===")
    for k, sub in [("shell", shell), ("skin", skin), ("cream", cream), ("rose_iris", rose)]:
        if len(sub):
            med = np.median(sub, axis=0).astype(int).tolist()
            p85 = np.percentile(sub, 85, axis=0).astype(int).tolist()
            print(" ", k, "n=", len(sub), "median=", med, "p85=", p85)

summarize("CLEAN_REF", ap)
summarize("RAW_TEX_0", tx)
print("RAW_MR min/median/max:", mr.min(axis=(0,1)).astype(int).tolist(), np.median(mr, axis=(0,1)).astype(int).tolist(), mr.max(axis=(0,1)).astype(int).tolist())
