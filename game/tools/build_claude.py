"""Builds the Claude version of Coral Cove from this repository (the GitHub copy is the main one).

The Claude app shows one self-contained page: it can't load the side files GitHub Pages serves, and it runs
scripts only from a few CDNs. So this script takes index.html and:
  - removes the side-file scripts that only the GitHub copy uses (seed data, on-device storage, offline
    support, Home Screen icons). Inside Claude the app saves to the artifact's own database instead;
  - loads three.js from cdnjs instead of the local three.min.js;
  - puts inside the page what the GitHub copy loads from files: the scenery atlas (512-square JPEG), tile art,
    the 3D models (reef-models.js), the Library
    (library.js), Ask Shelly's word help (words.js and its dictionary words-data.js) and the songs. The songs
    are re-encoded at 56 kbps (40 or 32 kbps when needed) with ffmpeg so the page stays under Claude's 16 MB limit (the GitHub copy keeps
    full quality); without ffmpeg the originals are used, if they fit.
The voice packs (voice/) stay out: inside Claude the app falls back to the device's own voice.

Usage:  python3 tools/build_claude.py [output.html]        (default: build/coral-cove-claude.html)
Then publish the output to the Coral Cove artifact (see ARCHITECTURE.md, "The two copies").
"""
import base64, io, json, os, re, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
SONGS = ['day-song', 'night-song', 'lobby-song', 'deck-song', 'timer-song', 'game-song', 'win'] + ['region-' + region + '-song' for region in ['town','lagoon','caves','patterns','beach','light','captain']]
LIMIT = 16 * 1024 * 1024


def read(name):
    with open(os.path.join(ROOT, name), encoding='utf8') as f:
        return f.read()


def replace_once(html, old, new, what):
    n = html.count(old)
    if n != 1:
        sys.exit(f'build_claude: expected "{what}" exactly once in index.html, found {n}. Update this script.')
    return html.replace(old, new)


def script(code, what):
    if '</script' in code.lower():
        sys.exit(f'build_claude: {what} contains "</script", which would end the inline script early.')
    return '<script>\n' + code + '\n</script>\n'


def song_b64(name, tmp, bitrate='56k'):
    src = os.path.join(ROOT, name + '.mp3')
    out = os.path.join(tmp, name + '-' + bitrate + '.mp3')
    if name != 'win' and shutil.which('ffmpeg'):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-codec:a', 'libmp3lame', '-b:a', bitrate, '-ac', '2', '-ar', '44100', out], check=True)
    else:
        out = src
    with open(out, 'rb') as f:
        return base64.b64encode(f.read()).decode()


def world_surface_data():
    """The portable copy uses the same atlas layout at 512 square, without changing the source art."""
    src = os.path.join(ROOT, 'assets', 'world', 'world-surfaces.jpg')
    try:
        from PIL import Image
    except ImportError:
        Image = None
    if Image:
        with Image.open(src) as source:
            if source.size not in ((512, 512), (1024, 1024)):
                sys.exit('build_claude: world surface source must match the square 512/1024 atlas contract.')
            image = source.convert('RGB').resize((512, 512), Image.Resampling.LANCZOS)
            buffer = io.BytesIO()
            image.save(buffer, 'JPEG', quality=70, optimize=True)
            pixels = buffer.getvalue()
        dimension = 512
    elif shutil.which('ffmpeg'):
        pixels = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', src, '-vf', 'scale=512:512',
            '-frames:v', '1', '-q:v', '4', '-f', 'image2pipe', '-vcodec', 'mjpeg', 'pipe:1'])
        dimension = 512
    else:
        with open(src, 'rb') as f:
            pixels = f.read()
        dimension = 1024
    return 'data:image/jpeg;base64,' + base64.b64encode(pixels).decode('ascii'), dimension, len(pixels)


def main(out_path):
    html = read('index.html')

    # 1. side-file scripts and Home Screen tags only the GitHub copy uses
    head_only = [
        r'<meta name="mobile-web-app-capable"[^>]*>\n', r'<meta name="apple-mobile-web-app-status-bar-style"[^>]*>\n',
        r'<meta name="apple-mobile-web-app-title"[^>]*>\n', r'<meta name="theme-color"[^>]*>\n',
        r'<link rel="manifest"[^>]*>\n', r'<link rel="apple-touch-icon"[^>]*>\n', r'<link rel="icon"[^>]*>\n',
        r'<script src="seed-data\.js[^"]*"></script>\n', r'<script src="audio-clips\.js[^"]*"></script>\n',
        r'<script src="storage\.js[^"]*"></script>\n', r'<script src="library\.js[^"]*"[^>]*></script>\n',
        r'<script src="words\.js[^"]*"[^>]*></script>\n', r"<script>if\('serviceWorker' in navigator\).*?</script>\n",
    ]
    for pat in head_only:
        html, n = re.subn(pat, '', html, count=1)
        if n != 1:
            sys.exit(f'build_claude: did not find {pat!r} in index.html. Update this script.')

    # 2. three.js from the CDN
    html = replace_once(html, "var REEF_THREE_URL = 'three.min.js';", f"var REEF_THREE_URL = '{THREE_CDN}';", 'REEF_THREE_URL')

    # 3. what the GitHub copy loads from files, inside the page
    parts = []
    parts.append(script('window.REEF_RESIDENT_INLINE_ONLY = true;', 'embedded resident policy'))
    with open(os.path.join(ROOT, 'assets', 'world', 'shellstone-color.jpg'), 'rb') as f:
        surface = 'data:image/jpeg;base64,' + base64.b64encode(f.read()).decode('ascii')
    parts.append(script('window.REEF_TILE_SURFACE_URL = ' + json.dumps(surface) + ';', 'tile surface'))
    world_surface, world_dimension, world_bytes = world_surface_data()
    parts.append(script('window.REEF_WORLD_SURFACE_URL = ' + json.dumps(world_surface) + ';', 'world surface atlas'))
    parts.append('<script id="reef-models-inline">\n' + read('reef-models.js') + '\n</script>\n')
    # Keep the opt-in Shelly prototype self-contained. Its smaller authored LOD
    # leaves room for the songs within the single-file size limit.
    shelly_path = os.path.join(ROOT, 'assets', 'models', 'shelly-view.glb')
    if not os.path.isfile(shelly_path):
        shelly_path = os.path.join(ROOT, 'assets', 'models', 'shelly.glb')
    with open(shelly_path, 'rb') as f:
        shelly = base64.b64encode(f.read()).decode('ascii')
    parts.append('<script type="text/plain" id="reef-shelly-inline">' + shelly + '</script>\n')
    # Keep the first authored resident self-contained too. The smaller texture
    # copy preserves the same sculpt and clips within the artifact byte limit.
    resident_path = os.path.join(ROOT, 'assets', 'models', 'taxi-squid-view.glb')
    with open(resident_path, 'rb') as f:
        resident = base64.b64encode(f.read()).decode('ascii')
    parts.append('<script type="text/plain" id="reef-resident-inline-taxi">' + resident + '</script>\n')
    parts.append(script('/* The Library (library.js, inlined: the Claude app cannot load side scripts) */\n' + read('library.js'), 'library.js'))
    data = read('words-data.js')
    data = data[data.index('window.CORAL_WORDS = ') + len('window.CORAL_WORDS = '):data.rindex(';')]
    json.loads(data)   # it must be plain JSON to go into a JSON script tag
    parts.append('<script type="application/json" id="coralWordsData">' + data.replace('</', '<\\/') + '</script>\n')
    parts.append(script('/* Ask Shelly offline word help (words.js, inlined) */\n' + read('words.js'), 'words.js'))
    end = html.rindex('</body></html>')
    # Keep full songs and the original game audio. Only the self-contained
    # viewing copy needs a smaller bitrate when its embedded assets grow.
    with tempfile.TemporaryDirectory() as tmp:
        for bitrate in ['56k', '40k', '32k']:
            songs = [f'<script type="text/plain" id="reef-song-{name}" data-type="audio/mpeg">{song_b64(name, tmp, bitrate)}</script>\n' for name in SONGS]
            candidate = html[:end] + ''.join(parts) + ''.join(songs) + html[end:]
            if len(candidate.encode('utf8')) <= LIMIT:
                break
        html = candidate

    size = len(html.encode('utf8'))
    if size > LIMIT:
        sys.exit(f'build_claude: the page is {size / 1e6:.1f} MB, over the 16 MB limit for Claude artifacts.')
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, 'w', encoding='utf8') as f:
        f.write(html)
    print(f'build_claude: wrote {out_path} ({size:,} bytes; {LIMIT - size:,} bytes below {LIMIT:,}-byte / 16 MiB limit; songs {bitrate})')
    print(f'build_claude: world atlas {world_dimension}x{world_dimension}, {world_bytes:,} JPEG bytes; tile surface preserved')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'build', 'coral-cove-claude.html'))
