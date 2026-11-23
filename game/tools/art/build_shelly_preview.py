"""Build a character-review page, embedded/offline by default; optionally share a hosted model URL."""
import base64
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]


def build(output, model_path=None, model_url=None):
    three = (ROOT / 'three.min.js').read_text()
    loader = (ROOT / 'src/js/vendor/three-gltfloader.js').read_text()
    if model_path is not None and model_url is not None:
        raise ValueError('Choose an embedded model path or a hosted model URL, not both')
    if model_url is not None:
        if not str(model_url).strip():
            raise ValueError('The hosted model URL must not be empty')
        model_source = {'url': str(model_url)}
    else:
        model_path = pathlib.Path(model_path) if model_path else ROOT / 'assets/models/shelly.glb'
        model_source = {'embedded': base64.b64encode(model_path.read_bytes()).decode('ascii')}
    # A URL is data inside an inline script, including when it contains quotes
    # or HTML-significant characters. Keep it from ending the script element.
    source_json = json.dumps(model_source, ensure_ascii=True).replace('<', '\\u003c')
    html = '''<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shelly · Storybook prototype</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#eaf5ee;color:#163e40;font:16px system-ui,sans-serif}
main{max-width:1100px;margin:auto;padding:28px}header{display:flex;align-items:end;justify-content:space-between;gap:20px}
h1{font-size:clamp(28px,5vw,44px);letter-spacing:-1.5px;margin:0 0 8px}p{margin:0;line-height:1.6;color:#496a69}
.badge{font-size:12px;border:1px solid #b2cfc6;padding:8px 12px;border-radius:30px;white-space:nowrap}
.stage{height:min(65vh,620px);min-height:300px;margin-top:24px;border-radius:28px;overflow:hidden;position:relative;background:radial-gradient(ellipse at 50% 80%,#f6efd2,#b9ded5 65%,#94c9ce)}
canvas{width:100%;height:100%;display:block;touch-action:none;cursor:grab}canvas:active{cursor:grabbing}
.hint{position:absolute;left:20px;bottom:16px;color:#385f60;font-size:13px;pointer-events:none}
.controls{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0 12px}button{font:inherit;border:1px solid #b1c9bd;background:#fffdf3;color:#224b49;border-radius:14px;padding:11px 16px;cursor:pointer}
button[aria-pressed=true]{background:#215f60;color:white;border-color:#215f60}button:focus-visible{outline:3px solid #c77b4f;outline-offset:3px}
.motion{margin-left:auto}footer{font-size:13px;line-height:1.7;color:#537271;margin-top:20px}
@media(max-width:600px){main{padding:20px 14px}header{display:block}.badge{display:inline-block;margin-top:12px}.motion{margin-left:0}.stage{height:54vh}button{padding:10px 12px}}
</style>
<main><header><div><h1>Meet Shelly.</h1><p>A pastel sea turtle for Coral Classroom.</p></div><span class="badge">Character prototype · Checkpoint 2</span></header>
<section class="stage" aria-label="Interactive three-dimensional Shelly preview"><canvas id="view" aria-label="Shelly character. Drag to rotate the view." tabindex="0"></canvas><span class="hint" id="status">Loading Shelly…</span></section>
<div class="controls" aria-label="Animation clips"><button data-clip="Idle" aria-pressed="true">Idle</button><button data-clip="Swim" aria-pressed="false">Swim</button><button data-clip="Turn" aria-pressed="false">Turn</button><button data-clip="Happy" aria-pressed="false">Happy</button><button data-clip="Curious" aria-pressed="false">Curious</button><button data-clip="Celebrate" aria-pressed="false">Celebrate</button><button class="motion" id="motion">Pause motion</button><button id="reset">Reset view</button></div>
<div class="controls" aria-label="Inspect character angles"><button data-view="front">Front</button><button data-view="quarter">Three-quarter</button><button data-view="left">Left</button><button data-view="right">Right</button><button data-view="back">Back</button><button data-view="game">Elevated game angle</button><button data-view="face">Face view</button></div>
<div class="controls" aria-label="Preview detail"><button data-quality="smooth" aria-pressed="true">Smooth preview</button><button data-quality="fine" aria-pressed="false">Fine detail</button></div>
<footer>Select a gesture to play it. Happy and Curious open a closer view of the eyes and head. Drag to explore other angles, or pause to inspect a pose.</footer></main>
<script>__THREE__</script><script>__LOADER__</script><script>__VIEWER__</script></html>'''
    viewer = (ROOT / 'tools/art/shelly_preview.js').read_text()
    html = html.replace('__VIEWER__', viewer).replace('__THREE__', three).replace('__LOADER__', loader).replace('__MODEL_SOURCE__', source_json)
    output = pathlib.Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html)
    print(f'Shelly preview: {output} ({output.stat().st_size:,} bytes)')


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', nargs='?', default=ROOT / 'build/shelly-preview.html')
    source = parser.add_mutually_exclusive_group()
    source.add_argument('--model', type=pathlib.Path, help='Embed a candidate without replacing the game asset')
    source.add_argument('--model-url', help='Hosted viewer only: load a shared GLB URL instead of embedding its bytes')
    args = parser.parse_args()
    if args.model_url is not None and not args.model_url.strip():
        parser.error('--model-url must not be empty')
    build(args.output, args.model, args.model_url)
