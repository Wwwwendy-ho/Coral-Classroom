"""Staged public Hunyuan3D-2 image-to-3D reconstruction for organic Shelly (stage-organic-v1).
No token or paid endpoint. Writes only under work/shelly-reference-rebuild/stage-organic-v1/.
"""
import json
import shutil
import time
from pathlib import Path
from gradio_client import Client, handle_file

STAGE = Path(__file__).resolve().parent
INPUT = STAGE / "input-shelly-clean.png"
SHAPE_TARGET = STAGE / "shelly-hunyuan-shape.glb"
TARGET = STAGE / "shelly-hunyuan-raw.glb"
STATUS = STAGE / "reconstruction-status.json"

report = {
    "service": "tencent/Hunyuan3D-2",
    "endpoint": "/generation_all",
    "input": str(INPUT),
    "steps": 30,
    "guidance_scale": 5.0,
    "seed": 17,
    "octree_resolution": 256,
    "check_box_rembg": True,
    "num_chunks": 8000,
    "randomize_seed": False,
    "status": "starting",
}


def save():
    STATUS.write_text(json.dumps(report, indent=2) + "\n")


def unwrap_path(item):
    if isinstance(item, str):
        return item
    if isinstance(item, dict):
        for key in ("value", "path", "name", "url"):
            val = item.get(key)
            if isinstance(val, str) and val:
                return val
            if isinstance(val, dict):
                nested = unwrap_path(val)
                if nested:
                    return nested
    return None


def wait(job, label):
    last = None
    t0 = time.time()
    while not job.done():
        s = job.status()
        state = str(s.code)
        if state != last:
            print(f"{label}: {state} ({time.time() - t0:.1f}s)", flush=True)
            last = state
        time.sleep(3)
    res = job.result()
    print(f"{label}: done in {time.time() - t0:.1f}s", flush=True)
    return res


def main():
    if not INPUT.exists():
        raise FileNotFoundError(f"Missing clean input image: {INPUT}")
    save()
    t_start = time.time()
    try:
        client = Client("tencent/Hunyuan3D-2", verbose=False, download_files=str(STAGE / "downloads"))
        print("Connected to tencent/Hunyuan3D-2", flush=True)
        report["status"] = "generating"
        save()
        outputs = wait(
            client.submit(
                caption=None,
                image=handle_file(str(INPUT)),
                mv_image_front=None,
                mv_image_back=None,
                mv_image_left=None,
                mv_image_right=None,
                steps=30,
                guidance_scale=5.0,
                seed=17,
                octree_resolution=256,
                check_box_rembg=True,
                num_chunks=8000,
                randomize_seed=False,
                api_name="/generation_all",
            ),
            "generation_all",
        )
        items = list(outputs) if isinstance(outputs, (list, tuple)) else [outputs]
        shape_path = unwrap_path(items[0]) if len(items) > 0 else None
        tex_path = unwrap_path(items[1]) if len(items) > 1 else None
        if shape_path and Path(shape_path).exists():
            shutil.copy2(shape_path, SHAPE_TARGET)
            report["shape_glb"] = str(SHAPE_TARGET)
            report["shape_bytes"] = SHAPE_TARGET.stat().st_size
        if not tex_path or not Path(tex_path).exists():
            raise RuntimeError(f"Missing textured mesh output in items[1]: {items[1] if len(items) > 1 else items}")
        shutil.copy2(tex_path, TARGET)
        if len(items) > 3:
            report["stats"] = items[3]
        if len(items) > 4:
            report["returned_seed"] = items[4]
        report.update(
            status="completed",
            glb=str(TARGET),
            bytes=TARGET.stat().st_size,
            elapsed_seconds=round(time.time() - t_start, 2),
        )
        save()
        print(f"Saved textured GLB: {TARGET} ({report['bytes']:,} bytes) in {report['elapsed_seconds']}s", flush=True)
    except Exception as exc:
        report.update(
            status="failed",
            error=f"{type(exc).__name__}: {exc}",
            elapsed_seconds=round(time.time() - t_start, 2),
        )
        save()
        print(f"FAILED: {report['error']}", flush=True)
        raise


if __name__ == "__main__":
    main()
