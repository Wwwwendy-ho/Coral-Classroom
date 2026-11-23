#!/usr/bin/env python3
"""Serve the handoff locally. Run from any working directory; Ctrl+C stops."""
import argparse
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

parser=argparse.ArgumentParser()
parser.add_argument('--port',type=int,default=8820)
args=parser.parse_args()
root=Path(__file__).resolve().parent.parent
class HandoffHandler(SimpleHTTPRequestHandler):
    def translate_path(self,path):
        original=Path(super().translate_path(path))
        # The original hosted preview only bundled a subset of runtime assets.
        # Reuse the complete canonical assets without duplicating 54 MB of voice.
        if not original.exists():
            try:relative=original.relative_to(root/'review-site'/'play')
            except ValueError:return str(original)
            shared=root/'game'/relative
            if shared.exists():return str(shared)
        return str(original)

handler=partial(HandoffHandler,directory=str(root))
server=ThreadingHTTPServer(('127.0.0.1',args.port),handler)
print(f'Coral Classroom handoff: http://localhost:{args.port}/',flush=True)
try:server.serve_forever()
except KeyboardInterrupt:pass
finally:server.server_close()
