#!/usr/bin/env python3
"""Local preview server on port 8821 serving staged rigged Shelly GLBs without touching canonical files."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SERVE_DIR = HERE


class StagedPreviewHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        path_only = self.path.split("?", 1)[0]
        if path_only.endswith("/crafted-shelly.glb") or path_only.endswith("/crafted-shelly-view.glb"):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def translate_path(self, path):
        path_only = path.split("?", 1)[0]
        if path_only.endswith("/crafted-shelly.glb"):
            return str(SERVE_DIR / "crafted-shelly.glb")
        if path_only.endswith("/crafted-shelly-view.glb"):
            return str(SERVE_DIR / "crafted-shelly-view.glb")

        original = Path(super().translate_path(path))
        if not original.exists():
            try:
                relative = original.relative_to(ROOT / "review-site" / "play")
            except ValueError:
                return str(original)
            shared = ROOT / "game" / relative
            if shared.exists():
                return str(shared)
        return str(original)


def main():
    global SERVE_DIR
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8821)
    parser.add_argument("--dir", type=Path, default=HERE)
    args = parser.parse_args()
    SERVE_DIR = args.dir.resolve()
    handler = partial(StagedPreviewHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    print(f"Coral Classroom staged Shelly preview ({SERVE_DIR.name}): http://localhost:{args.port}/", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
