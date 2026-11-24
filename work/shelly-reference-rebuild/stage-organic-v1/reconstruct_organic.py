"""Staged public TRELLIS.2 image-to-3D reconstruction for organic Shelly (stage-organic-v1).
No token or paid endpoint. Writes only under work/shelly-reference-rebuild/stage-organic-v1/.
"""
import json
import shutil
import time
from pathlib import Path
from gradio_client import Client, handle_file
from huggingface_hub import get_token

STAGE = Path(__file__).resolve().parent
INPUT = STAGE / "input-shelly-clean.png"
TARGET = STAGE / "shelly-trellis-raw.glb"
STATUS = STAGE / "reconstruction-status.json"

report = {
    "service": "microsoft/TRELLIS.2",
    "input": str(INPUT),
    "seed": 17,
    "resolution": "1024",
    "decimation_target": 100000,
    "texture_size": 2048,
    "status": "starting",
}


def save():
    STATUS.write_text(json.dumps(report, indent=2) + "\n")


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
    token = get_token()
    assert token, "Missing local HF token"
    save()
    t_start = time.time()
    try:
        client = Client("microsoft/TRELLIS.2", token=token, verbose=False, download_files=str(STAGE / "downloads"))
        print("Connected to microsoft/TRELLIS.2 (authenticated)", flush=True)
        client.predict(api_name="/start_session")

        report["status"] = "preprocessing"
        save()
        processed = wait(client.submit(handle_file(str(INPUT)), api_name="/preprocess_image"), "preprocess")
        if isinstance(processed, str) and Path(processed).exists():
            shutil.copy2(processed, STAGE / "trellis-preprocessed.png")
            report["preprocessed"] = str(STAGE / "trellis-preprocessed.png")

        report["status"] = "generating"
        save()
        preview = wait(
            client.submit(
                image=handle_file(processed),
                seed=17,
                resolution="1024",
                api_name="/image_to_3d",
            ),
            "image_to_3d",
        )
        (STAGE / "remote-preview.html").write_text(preview if isinstance(preview, str) else str(preview))

        report["status"] = "extracting"
        save()
        outputs = wait(
            client.submit(
                decimation_target=100000,
                texture_size=2048,
                api_name="/extract_glb",
            ),
            "extract_glb",
        )
        files = outputs if isinstance(outputs, (list, tuple)) else [outputs]
        source = next(Path(v) for v in files if isinstance(v, str) and v.endswith(".glb"))
        shutil.copy2(source, TARGET)
        report.update(
            status="completed",
            glb=str(TARGET),
            bytes=TARGET.stat().st_size,
            elapsed_seconds=round(time.time() - t_start, 2),
        )
        save()
        print(f"Saved GLB: {TARGET} ({report['bytes']:,} bytes) in {report['elapsed_seconds']}s", flush=True)
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
