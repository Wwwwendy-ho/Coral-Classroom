"""Build the hosted viewer of the exact organic model used by the game preview."""
from pathlib import Path
import subprocess

source=Path('/workspace/coral-classroom')
out=Path('/workspace/sites/coral-classroom-redesign-artbook/dist/shelly.html')
subprocess.run(['python3',str(source/'tools/art/build_shelly_preview.py'),str(out),
                '--model-url','play/assets/models/crafted-shelly.glb?v=organic-3'],check=True)
text=out.read_text()
text=text.replace('<title>Shelly · Storybook prototype</title>','<title>Shelly · Organic character review</title>')
text=text.replace('Character prototype · Checkpoint 2','Organic Shelly · Live 3D')
text=text.replace('<main><header>','<main><p style="margin-bottom:18px"><a style="color:#224b49" href="index.html#play">Back to the art book</a></p><header>')
text=text.replace('<h1>Meet Shelly.</h1>','<h1>Meet the new Shelly.</h1>')
text=text.replace('<button data-view="game">Elevated game angle</button>','<button data-view="game">Board camera</button><button data-view="top">From above</button>')
text=text.replace('face:[0,.10,2.55,1.02]', 'top:[0,1.40,3.4,.74],face:[0,.10,1.8,1.05]')
text=text.replace('var azimuth=.55,elevation=.24,distance=3.4,targetY=.74', 'var azimuth=.15,elevation=.86,distance=3.4,targetY=.74')
text=text.replace('var scale=1.48/(size.y||1);', 'var scale=Math.min(1.48/(size.y||1),2.05/(size.x||1),2.2/(size.z||1));')
text=text.replace("preset('quarter');});", "preset('game');});")
text=text.replace("play('Idle',false);", "play('Idle',false);preset(new URLSearchParams(location.search).get('angle')==='top'?'top':'game');")
text=text.replace('function positionCamera(){camera.position.set(Math.sin(azimuth)*Math.cos(elevation)*distance,Math.sin(elevation)*distance+targetY,Math.cos(azimuth)*Math.cos(elevation)*distance);',
                  'function positionCamera(){var d=distance*(camera.aspect<1?1/Math.max(.5,camera.aspect):1);camera.position.set(Math.sin(azimuth)*Math.cos(elevation)*d,Math.sin(elevation)*d+targetY,Math.cos(azimuth)*Math.cos(elevation)*d);')
comparison='''<details style="margin-top:24px"><summary>Compare the eyes at board and overhead angles</summary><figure style="margin:16px 0"><a href="assets/shelly-eye-angle-comparison.png"><img loading="lazy" width="502" height="422" style="max-width:100%;height:auto" src="assets/shelly-eye-angle-comparison.png" alt="Previous and revised Shelly at the same board camera and overhead angle. The revised pupils remain visibly round from above."></a><figcaption style="font-size:14px">Offline renders of the actual previous and revised models at matching camera angles.</figcaption></figure></details>'''
text=text.replace('</footer></main>','</footer>'+comparison+'</main>')
out.write_text(text)
