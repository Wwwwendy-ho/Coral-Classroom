"""Public TRELLIS.2 image-to-3D trial for the original Shelly concept.
No token or paid endpoint. Save outputs locally; never print returned HTML/base64.
"""
from gradio_client import Client, handle_file
from pathlib import Path
import json
import shutil
import time

ROOT=Path('/workspace/work/shelly-pearl/workflow')
ROOT.mkdir(parents=True,exist_ok=True)
IMAGE='/workspace/generated_images/exec-8dc38e31-d010-47c0-8cbb-535df0233759.png'
report={'service':'microsoft/TRELLIS.2','input':IMAGE,'status':'starting'}
def save():
    (ROOT/'reconstruction-status.json').write_text(json.dumps(report,indent=2))
def wait(job,label):
    last=None
    while not job.done():
        s=job.status();state=str(s.code)
        if state!=last:
            print(label,state,flush=True);last=state
        time.sleep(3)
    return job.result()
try:
    client=Client('microsoft/TRELLIS.2',verbose=False,download_files=str(ROOT/'downloads'))
    print('Public API connected',flush=True)
    client.predict(api_name='/start_session')
    report['status']='preprocessing';save()
    processed=wait(client.submit(handle_file(IMAGE),api_name='/preprocess_image'),'preprocess')
    print('Preprocessing complete',flush=True)
    report['status']='generating';save()
    preview=wait(client.submit(image=handle_file(processed),seed=17,resolution='1024',api_name='/image_to_3d'),'generate')
    # The server's session state holds the 3D latents for extraction.
    (ROOT/'remote-preview.html').write_text(preview if isinstance(preview,str) else str(preview))
    print('3D generation complete; extracting GLB',flush=True)
    report['status']='extracting';save()
    outputs=wait(client.submit(decimation_target=100000,texture_size=2048,api_name='/extract_glb'),'extract')
    files=outputs if isinstance(outputs,(list,tuple)) else [outputs]
    source=next(Path(v) for v in files if isinstance(v,str) and v.endswith('.glb'))
    target=ROOT/'shelly-trellis-source.glb';shutil.copy2(source,target)
    report.update(status='completed',glb=str(target),bytes=target.stat().st_size);save()
    print('Saved GLB',target,report['bytes'],flush=True)
except Exception as e:
    report.update(status='failed',error=f'{type(e).__name__}: {e}');save()
    print(report['error'],flush=True)
    raise
