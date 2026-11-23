#!/usr/bin/env python3
"""Build a privacy-safe, isolated copy of the real game for art direction review.

Run only after the production source has been built. It never edits the source repo.
"""
from pathlib import Path
import json
import re
import shutil

ROOT = Path('/workspace')
SOURCE = ROOT / 'coral-classroom'
WORK = ROOT / 'work' / 'redesign-artbook'
SITE = ROOT / 'sites' / 'coral-classroom-redesign-artbook' / 'dist'
DEST = SITE / 'play'

def copy_file(src: Path, rel: str):
    out = DEST / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, out)

def demo_seed():
    now = 1795132800000
    pid = 'crafted-preview-explorer'
    data = {
      f'profiles/{pid}': {'name':'Demo Explorer','mode':'child','initialMode':'child','photoId':'','photoUrl':'','order':0,'createdAt':now,'themeMode':'light','oceanTheme':True,'wordBankOn':True},
      f'profiles/{pid}/stats/summary': {'streak':0,'stars':0,'lastReviewDateISO':None,'totalReviews':0,'unlockedSounds':[]},
      f'profiles/{pid}/settings/study': {'sessionActive':False,'sessionStartedAt':None,'algorithm':'sm2_speed','difficulty':'medium','readingSupport':False},
      'settings/parent': {'algorithm':'sm2_speed','difficulty':'medium','sessionActive':False,'sessionStartedAt':None},
    }
    decks = [
      ('hello-korea','🇰🇷','At the Café','korean',[
        ('안녕하세요','Hello!','A friendly greeting.'),('커피 주세요','Coffee, please.','A simple café request.'),('물 주세요','Water, please.','A useful phrase.'),('감사합니다','Thank you.','A polite thank-you.'),('맛있어요','It is delicious.','Say this about food.')]),
      ('ocean-words','🐚','Ocean Words','korean',[
        ('바다','sea','A wide body of salt water.'),('물','water','We swim in water.'),('거북이','turtle','A sea turtle swims by.'),('물고기','fish','A fish has fins.'),('조개','shell','A shell rests on the sand.')])
    ]
    for order, (did, emoji, name, subject, words) in enumerate(decks):
        base = f'profiles/{pid}/decks/{did}'
        data[base] = {'name':name,'emoji':emoji,'subject':subject,'order':order,'archived':False,'createdAt':now}
        for i,(front,back,note) in enumerate(words,1):
            data[f'{base}/cards/v{i}'] = {'front':front,'back':back,'note':note,'mode':'flip','createdAt':now+i,'due':now,'ease':2.5,'interval':0,'lapses':0,'reps':0,'state':'new','choices':[],'category':'','photoId':'','photoUrl':'','blendChunks':[]}
    return "window.CORAL_COVE_SEED_VERSION='crafted-preview-1';\nwindow.CORAL_COVE_SEED=" + json.dumps(data, ensure_ascii=False, separators=(',',':')) + ';\n'

def main():
    if not (SOURCE / 'index.html').is_file():
        raise SystemExit('Missing built source index.html; build Coral Classroom first.')
    DEST.mkdir(parents=True, exist_ok=True)
    html = (SOURCE / 'index.html').read_text(encoding='utf-8')
    html = re.sub(r"<script>if\('serviceWorker' in navigator\).*?</script>", '', html, flags=re.S)
    # Force the storybook Shelly model path before the engine initializes.
    html = html.replace('<head>', '<head>\n<script>window.REEF_SHELLY_PREVIEW=true;</script>', 1)
    html = html.replace('<body>', '<body>\n<div id="craftedPreviewNotice"><span><strong>In-engine prototype</strong> · Crafted art direction preview</span><div class="craftedPreviewActions"><button type="button" id="craftedSaveWorldImage">Save world image</button><a href="../#approach">Preview / Art book</a></div></div>', 1)
    # Keep the game code and state in its own IIFE while allowing a narrow demo-only launch hook.
    iife_end = html.rfind('})();\n</script>')
    if iife_end < 0:
        raise SystemExit('Could not locate the shared game IIFE closing point.')
    html = html[:iife_end] + '\n' + (WORK / 'preview-bootstrap.js').read_text(encoding='utf-8') + '\n' + html[iife_end:]
    styles_end = html.rfind('</style>')
    if styles_end < 0:
        raise SystemExit('Could not locate compiled stylesheet.')
    html = html[:styles_end] + '\n' + (WORK / 'preview.css').read_text(encoding='utf-8') + '\n' + html[styles_end:]
    # Replace production seed with newly authored demo-only learner content.
    (DEST / 'seed-data.js').write_text(demo_seed(), encoding='utf-8')
    # localStorage database key is isolated from the production app's origin data.
    storage = (SOURCE / 'storage.js').read_text(encoding='utf-8')
    if "var KEY = 'coralCove.db.v1';" not in storage:
        raise SystemExit('Storage database key changed; review preview namespace patch.')
    storage = storage.replace("var KEY = 'coralCove.db.v1';", "var KEY = 'coralCove.craftedPreview.db.v1';", 1)
    (DEST / 'storage.js').write_text(storage, encoding='utf-8')
    # Only the hero and base world textures are loaded for this first gameplay preview.
    copies = [
      'audio-clips.js','library.js','words.js','words-data.js','three.min.js','reef-models.js',
      'assets/models/shelly.glb','assets/models/shelly-view.glb',
      'assets/world/world-surfaces.jpg','assets/world/shellstone-color.jpg',
      'icon-180.png','icon-192.png','icon-512.png','manifest.webmanifest',
      'day-song.mp3','lobby-song.mp3','game-song.mp3','deck-song.mp3','win.mp3'
    ]
    for rel in copies:
        path = SOURCE / rel
        if path.is_file(): copy_file(path, rel)
    # The crafted preview uses a separately authored organic Shelly. Requiring
    # these exact files prevents silently shipping the old model again.
    candidate = SOURCE / 'assets' / 'models'
    crafted_models = ['crafted-shelly.glb', 'crafted-shelly-view.glb']
    for name in crafted_models:
        path = candidate / name
        if not path.is_file(): raise SystemExit('Missing crafted Shelly candidate: ' + name)
        copy_file(path, 'assets/models/' + name)
    copy_file(candidate / 'crafted-shelly-loading.webp', 'assets/models/crafted-shelly-loading.webp')
    (DEST / 'index.html').write_text(html, encoding='utf-8')
    # A small machine-readable audit makes accidental private-file expansion visible.
    report = {'preview':'crafted in-engine demo','seedProfile':'Demo Explorer','storageKey':'coralCove.craftedPreview.db.v1','copiedRuntimeFiles':copies + ['assets/models/' + name for name in crafted_models] + ['assets/models/crafted-shelly-loading.webp'],'shellyVariant':'crafted-organic-3','serviceWorkerRegistrationRemoved':"serviceWorker.register" not in html}
    (DEST / 'preview-build.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(f'Prepared {DEST / "index.html"}')

if __name__ == '__main__':
    main()
