"""Convert 5 approved concepts to PNG and run sequential TRELLIS.2 reconstructions."""
import subprocess
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
WSL_PY = "/home/wendy/.venvs/coral-classroom/bin/python"
BRAIN = Path("/mnt/c/Users/20750/.gemini/antigravity/brain")

CONCEPTS = [
    ("echo", BRAIN / "d166c57a-61c7-4fac-a88e-e23166d364f3" / "echo_concept_mp_v2_1795418989200.jpg"),
    ("taxi-squid", BRAIN / "d166c57a-61c7-4fac-a88e-e23166d364f3" / "taxi_squid_concept_mp_1795418971972.jpg"),
    ("bok", BRAIN / "d166c57a-61c7-4fac-a88e-e23166d364f3" / "bok_concept_mp_1795418970315.jpg"),
    ("hana", BRAIN / "d166c57a-61c7-4fac-a88e-e23166d364f3" / "hana_concept_mp_1795418971612.jpg"),
    ("captain-bay", BRAIN / "d166c57a-61c7-4fac-a88e-e23166d364f3" / "captain_bay_concept_mp_1795418974443.jpg"),
]


def main():
    for slug, src in CONCEPTS:
        d = HERE / slug
        d.mkdir(parents=True, exist_ok=True)
        out_png = d / "concept-mp.png"
        Image.open(src).convert("RGB").save(out_png, format="PNG", optimize=True)
        print(f"Prepared {out_png}", flush=True)

    for slug, _ in CONCEPTS:
        d = HERE / slug
        out_glb = d / "raw-trellis.glb"
        if out_glb.exists() and out_glb.stat().st_size > 100000:
            print(f"Skipping existing {out_glb}", flush=True)
            continue
        print(f"\n=== RECONSTRUCTING {slug} ===", flush=True)
        subprocess.run(
            [WSL_PY, str(HERE / "reconstruct_character.py"), "--input", str(d / "concept-mp.png"), "--output", str(out_glb), "--seed", "17"],
            check=True,
        )
    print("\nALL 5 TRELLIS RECONSTRUCTIONS COMPLETE", flush=True)


if __name__ == "__main__":
    main()
