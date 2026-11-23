"""Build the taxi character review page, using the externally hosted game GLB."""
from pathlib import Path
import argparse
import json
import math
from html import escape

ROOT = Path(__file__).resolve().parents[2]


def build(output, name='Taxi squid', model_url='game/assets/models/taxi-squid-close.glb', caption=None, yaw_degrees=0, face_target_y=1.02):
    html = '''<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Taxi squid · Character review</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#eaf5ee;color:#163e40;font:16px system-ui,sans-serif}
main{max-width:1000px;margin:auto;padding:28px}nav{display:flex;gap:18px;flex-wrap:wrap}a{color:#205c60}h1{font-size:clamp(28px,5vw,42px);margin:22px 0 8px}p{line-height:1.5;margin:8px 0}
.stage{height:min(62vh,580px);min-height:300px;margin-top:20px;border-radius:24px;overflow:hidden;background:radial-gradient(ellipse at 50% 80%,#f5eed8,#b9ded5 65%,#94c9ce)}
canvas{width:100%;height:100%;display:block;touch-action:none;cursor:grab}canvas:active{cursor:grabbing}canvas:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid #a05b37;outline-offset:3px}
.controls{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}button{font:inherit;min-height:44px;border:1px solid #b1c9bd;background:#fffdf3;color:#224b49;border-radius:12px;padding:10px 16px;cursor:pointer}button[aria-pressed=true]{background:#215f60;color:white;border-color:#215f60}button:disabled{opacity:.5;cursor:default}.caption{color:#365f5e}#status{min-height:1.5em}
@media(max-width:600px){main{padding:20px 14px}.stage{height:52vh}button{padding:10px 12px}}
</style><main><nav aria-label="Navigation"><a href="index.html">Back to review</a><a href="game/index.html?shelly=storybook&amp;v=20261116-resident-openings">Play the game</a></nav>
<h1>Taxi squid</h1><p>Inspect the actual 3D character from every side. Drag the model or use the angle buttons.</p>
<section class="stage" aria-label="Interactive 3D taxi squid"><canvas id="view" tabindex="0" aria-label="Taxi squid in 3D. Drag or use arrow keys to rotate; use the angle buttons for preset views."></canvas></section>
<p id="status" role="status" aria-live="polite">Loading the taxi squid…</p>
<div class="controls" role="group" aria-label="View angle"><button data-view="front">Front</button><button data-view="quarter">Three-quarter</button><button data-view="left">Left</button><button data-view="right">Right</button><button data-view="back">Back</button><button data-view="face">Face</button></div>
<div class="controls" role="group" aria-label="Animation"><button data-clip="Idle" aria-pressed="false">Idle</button><button data-clip="React" aria-pressed="false">React</button><button id="motion">Pause animation</button></div>
<p class="caption">The bored eyelids and flat mouth are fixed sculpted features. The authored motion is a body nod and sway.</p></main>
<script>__THREE__</script><script>__LOADER__</script><script>__VIEWER__</script></html>'''
    html = html.replace('Taxi squid',escape(name)).replace('taxi squid',escape(name.lower()))
    html = html.replace('<button data-clip="React"', '<button data-clip="Listen" aria-pressed="false">Listen</button><button data-clip="React"')
    if caption is not None:
        html = html.replace('The bored eyelids and flat mouth are fixed sculpted features. The authored motion is a body nod and sway.',escape(caption))
    config='window.REGION_RESIDENT_PREVIEW='+json.dumps({'modelUrl':model_url,'yawOffset':math.radians(yaw_degrees),'faceTargetY':face_target_y}).replace('<','\\u003c')+';\n'
    html = html.replace('__THREE__', (ROOT / 'three.min.js').read_text()).replace('__LOADER__', (ROOT / 'src/js/vendor/three-gltfloader.js').read_text()).replace('__VIEWER__', config + (ROOT / 'tools/art/resident_preview.js').read_text())
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html)
    print(f'{name} preview: {output} ({output.stat().st_size:,} bytes)')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', nargs='?', default='/workspace/work/npc-production/taxi-preview.html')
    parser.add_argument('--name',default='Taxi squid')
    parser.add_argument('--model-url',default='game/assets/models/taxi-squid-close.glb')
    parser.add_argument('--caption')
    parser.add_argument('--yaw-degrees',type=float,default=0)
    parser.add_argument('--face-target-y',type=float,default=1.02)
    args=parser.parse_args()
    build(args.output,args.name,args.model_url,args.caption,args.yaw_degrees,args.face_target_y)
