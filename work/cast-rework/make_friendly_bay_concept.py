"""Build a clean, warm cocoa-taupe, whisker-spike-free friendly Captain Bay concept PNG from the base studio concept."""
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

SRC = Path("/mnt/c/Users/20750/.gemini/antigravity/brain/d166c57a-61c7-4fac-a88e-e23166d364f3/captain_bay_concept_mp_1795418974443.jpg")
DST = Path("/mnt/c/Users/20750/.gemini/antigravity/scratch/Coral-Classroom/work/cast-rework/captain-bay/concept-mp.png")


def main():
    bgr = cv2.imread(str(SRC), cv2.IMREAD_COLOR)
    assert bgr is not None, f"Failed to read {SRC}"
    H, W = bgr.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W]
    xn = xx / float(W)
    yn = yy / float(H)

    # 1. Remove ALL protruding whiskers cleanly (left needles sticking out to x>=0.25, right needles over cheek/bg)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]

    # Left side: studio grey has very low saturation (s < 12). Any whisker pixel outside the puff ellipse:
    left_puff_ellipse = ((xn - 0.352) / 0.055) ** 2 + ((yn - 0.352) / 0.058) ** 2 <= 1.0
    left_stick_outer = (xn >= 0.24) & (xn <= 0.300) & (yn >= 0.310) & (yn <= 0.425) & (~left_puff_ellipse) & (s > 10)
    # Fill outer left whisker tips directly with clean studio grey so inpaint never smears cream outward
    bg_patch = np.median(bgr[int(0.05 * H) : int(0.15 * H), int(0.05 * W) : int(0.15 * W)].reshape(-1, 3), axis=0).astype(np.uint8)
    left_outer_dil = cv2.dilate(left_stick_outer.astype(np.uint8) * 255, np.ones((7, 7), np.uint8), iterations=1) > 0
    bgr[left_outer_dil] = bg_patch

    # Right side whiskers sit at xn in [0.46, 0.545], yn in [0.31, 0.415] with warm bright pixels (v > 135, h < 35)
    right_puff_ellipse = ((xn - 0.435) / 0.050) ** 2 + ((yn - 0.352) / 0.056) ** 2 <= 1.0
    right_box = (xn >= 0.460) & (xn <= 0.545) & (yn >= 0.310) & (yn <= 0.415) & (~right_puff_ellipse) & (h < 35) & (v > 135)

    whisker_mask = right_box.astype(np.uint8) * 255
    whisker_mask = cv2.dilate(whisker_mask, np.ones((7, 7), np.uint8), iterations=1)
    bgr = cv2.inpaint(bgr, whisker_mask, 6, cv2.INPAINT_TELEA)

    # Smooth any remaining faint whisker ridges inside the plump cream puffs
    hsv2 = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    in_puffs = (left_puff_ellipse | right_puff_ellipse) & (hsv2[..., 0] < 35) & (hsv2[..., 2] > 140)
    smooth_bgr = cv2.bilateralFilter(bgr, d=17, sigmaColor=48, sigmaSpace=16)
    puff_soft = cv2.GaussianBlur(in_puffs.astype(np.float32), (11, 11), 3.0)[..., None]
    bgr = np.clip(bgr.astype(np.float32) * (1.0 - puff_soft * 0.88) + smooth_bgr.astype(np.float32) * (puff_soft * 0.88), 0, 255).astype(np.uint8)

    # 2. Lift ONLY the deep black pocket right between the tusks into soft warm cocoa smile shadow
    hsv3 = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    dark_gap = (xn >= 0.35) & (xn <= 0.44) & (yn >= 0.388) & (yn <= 0.435) & (hsv3[..., 2] < 88)
    gap_soft = cv2.GaussianBlur(dark_gap.astype(np.float32), (9, 9), 2.5)[..., None]
    warm_gap = np.array([104, 118, 146], dtype=np.float32)
    bgr = np.clip(bgr.astype(np.float32) * (1.0 - gap_soft * 0.72) + np.maximum(bgr.astype(np.float32), warm_gap) * (gap_soft * 0.72), 0, 255).astype(np.uint8)

    # 3. Shift ONLY cool slate-blue walrus skin to warm cocoa-taupe (#a6806c), strictly protecting navy hat band & sailor collar!
    hsv4 = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    h4, s4, v4 = hsv4[..., 0], hsv4[..., 1], hsv4[..., 2]

    # Slate-blue skin: hue [92, 130], low-moderate saturation [14, 110]
    # Navy uniform: high saturation (s4 > 110)
    is_blue_hue = (h4 >= 92) & (h4 <= 130) & (s4 >= 14)
    is_navy = s4 > 110

    skin_mask = (is_blue_hue & (~is_navy)).astype(np.float32)
    skin_mask = cv2.GaussianBlur(skin_mask, (7, 7), 1.6)

    rgb_f = bgr[..., ::-1].astype(np.float32) / 255.0
    lum = (0.2126 * rgb_f[..., 0] + 0.7152 * rgb_f[..., 1] + 0.0722 * rgb_f[..., 2])[..., None]
    target_cocoa = np.array([0.651, 0.502, 0.424], dtype=np.float32)  # #a6806c
    warm_rgb = np.clip(target_cocoa * (lum / 0.533), 0.0, 1.0)
    out_rgb = rgb_f * (1.0 - skin_mask[..., None]) + warm_rgb * skin_mask[..., None]
    out_u8 = np.clip(out_rgb * 255.0, 0, 255).astype(np.uint8)

    DST.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(out_u8, mode="RGB").save(DST, format="PNG")
    print(f"Saved clean friendly Captain Bay concept -> {DST}", flush=True)


if __name__ == "__main__":
    main()
