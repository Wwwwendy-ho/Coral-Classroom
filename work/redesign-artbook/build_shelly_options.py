#!/usr/bin/env python3
"""Build the standalone Shelly proportion survey page after all renders arrive."""

from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

ROOT = Path('/workspace/sites/coral-classroom-redesign-artbook')
ASSET_DIR = ROOT / "dist" / "assets" / "shelly-options"
OUT = ROOT / "dist" / "shelly-options.html"
ART_MANIFEST = Path("/workspace/work/shelly-cuteness-survey/manifest.json")
WEB_MANIFEST = Path("/workspace/work/shelly-cuteness-survey/web-manifest.json")


def load_manifest(path: Path):
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"Cannot read {path}: {exc}")
    return data if isinstance(data, (dict, list)) else {}


def find_entry(manifest, number):
    """Accept the small common JSON shapes used by the render and web manifests."""
    rows = manifest if isinstance(manifest, list) else manifest.get("options", manifest.get("images", []))
    if isinstance(rows, dict):
        rows = list(rows.values())
    for row in rows if isinstance(rows, list) else []:
        if not isinstance(row, dict):
            continue
        ident = str(row.get("id", row.get("number", row.get("option", ""))))
        if ident in (str(number), f"{number:02d}", f"option-{number}", f"option-{number:02d}"):
            return row
    return {}


def dimensions(path):
    try:
        from PIL import Image
        with Image.open(path) as im:
            return im.size
    except ImportError:
        raise SystemExit("Pillow is required to read image dimensions (python -m pip install Pillow).")
    except Exception as exc:
        raise SystemExit(f"Cannot read image metadata from {path}: {exc}")


def build():
    files = [ASSET_DIR / f"{n:02d}-{view}.webp" for n in range(1, 11) for view in ("normal", "top")]
    missing = [str(p) for p in files if not p.is_file()]
    if missing:
        raise SystemExit("Survey build stopped: required render assets are missing:\n  " + "\n  ".join(missing))

    art = load_manifest(ART_MANIFEST)
    web = load_manifest(WEB_MANIFEST)
    # Use dimensions from the generated deliverable files as authoritative metadata.
    dims = {p.name: dimensions(p) for p in files}
    web_rows = {}
    for n in range(1, 11):
        entry = find_entry(web, n)
        for view in ("normal", "top"):
            key = f"{n:02d}-{view}.webp"
            web_rows[key] = entry

    cards = []
    for n in range(1, 11):
        entry = find_entry(art, n)
        title = str(entry.get("title", f"Option {n}"))
        desc = str(entry.get("description", "A progressively rounder, more baby-like proportion option."))
        figures = []
        for view, label in (("normal", "Normal view"), ("top", "Top-down view")):
            filename = f"{n:02d}-{view}.webp"
            width, height = dims[filename]
            url = "assets/shelly-options/" + filename
            alt = f"Shelly option {n}, {label.lower()}: {desc}"
            figures.append(f'''<figure>
              <figcaption>{label}</figcaption>
              <a class="image-link" href="{url}" target="_blank" rel="noopener" aria-label="Open full-size {html.escape(label.lower())} for option {n}">
                <img src="{url}" width="{width}" height="{height}" alt="{html.escape(alt, quote=True)}" loading="{'eager' if n == 1 else 'lazy'}" decoding="async">
              </a>
            </figure>''')
        cards.append(f'''<article class="option-card" id="option-{n}" aria-labelledby="title-{n}">
          <header class="card-heading"><div><p class="eyebrow">OPTION {n:02d} OF 10</p><h2 id="title-{n}">{html.escape(title)}</h2></div>
          <button class="pick" type="button" data-option="{n}" aria-pressed="false" aria-label="Choose option {n}">Choose {n}</button></header>
          <p class="description">{html.escape(desc)}</p>
          <div class="views">{' '.join(figures)}</div>
        </article>''')

    page = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#173b55"><title>Choose Shelly’s proportions</title>
<style>
:root{color-scheme:light;--navy:#173b55;--ink:#203b4b;--muted:#587181;--ivory:#fffaf0;--aqua:#dff5f1;--coral:#ef8e7b;--line:#d9e8e5;--white:#fff}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:7rem}body{margin:0;background:var(--ivory);color:var(--ink);font:17px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}.topbar{background:var(--navy);color:white;padding:1rem clamp(1rem,4vw,3rem);display:flex;align-items:center;justify-content:space-between;gap:1rem}.brand{font-size:1.05rem;font-weight:750;letter-spacing:.02em}.topbar a{color:#e4f7f4;text-underline-offset:3px}.wrap{max-width:1100px;margin:auto;padding:2rem clamp(1rem,4vw,2.5rem) 8rem}.intro{background:var(--aqua);border:1px solid #c8e7e1;border-radius:24px;padding:clamp(1.2rem,4vw,2.3rem);margin-bottom:1.7rem}.kicker,.eyebrow{margin:0;color:#397184;font-weight:800;letter-spacing:.1em;font-size:.86rem}.intro h1{margin:.35rem 0 .6rem;color:var(--navy);font-size:clamp(1.8rem,4.6vw,3rem);line-height:1.1}.intro p{max-width:70ch;margin:.4rem 0}.navlinks{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1rem}.navlinks a{font-weight:700;color:var(--navy);text-underline-offset:3px}.jump{display:flex;gap:.45rem;flex-wrap:wrap;margin:1rem 0 1.5rem}.jump a{display:grid;place-items:center;width:42px;height:42px;border:1px solid #bdd7d6;border-radius:50%;background:white;color:var(--navy);font-weight:750;text-decoration:none}.jump a:hover,.jump a:focus-visible{background:var(--aqua);outline:3px solid #72bdbc;outline-offset:2px}.option-card{background:white;border:1px solid var(--line);border-radius:20px;padding:clamp(1rem,3vw,1.5rem);margin:1.1rem 0;box-shadow:0 5px 18px #173b550c}.card-heading{display:flex;align-items:center;justify-content:space-between;gap:1rem}.card-heading h2{margin:.1rem 0;color:var(--navy);font-size:1.5rem}.description{margin:.3rem 0 1rem;color:var(--muted)}.views{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}.views figure{margin:0;min-width:0}.views figcaption{font-size:1rem;font-weight:750;margin-bottom:.35rem;color:#31596a}.image-link{display:block;border-radius:14px;background:#f3faf8;border:1px solid var(--line);overflow:hidden}.views img{display:block;width:100%;height:auto}.pick,.copy{font:inherit;font-size:1rem;font-weight:750;border:2px solid var(--navy);border-radius:12px;background:white;color:var(--navy);padding:.65rem 1rem;cursor:pointer;min-height:46px}.pick[aria-pressed="true"]{background:var(--navy);color:white;border-color:var(--coral);box-shadow:0 0 0 3px #ef8e7b55}.pick:hover,.copy:hover{background:var(--aqua)}.pick[aria-pressed="true"]:hover{background:#235878}.sticky{position:fixed;z-index:3;bottom:0;left:0;right:0;background:#fffdf7f5;border-top:1px solid var(--line);box-shadow:0 -5px 20px #173b5514;padding:.75rem max(1rem,calc((100vw - 1100px)/2 + 2.5rem));display:flex;align-items:center;justify-content:space-between;gap:1rem;backdrop-filter:blur(8px)}.selection{font-weight:700}.selection strong{color:var(--navy)}.copy:disabled{opacity:.5;cursor:not-allowed}.status{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}:focus-visible{outline:3px solid #d76d5f;outline-offset:3px}footer{color:var(--muted);font-size:.95rem;margin-top:2rem}@media(max-width:620px){.topbar{align-items:flex-start}.views{grid-template-columns:1fr}.sticky{align-items:flex-start;flex-direction:column}.copy{width:100%}.wrap{padding-bottom:10rem}}
.pick,.copy{min-height:44px}.sticky{backdrop-filter:none;background:#fffdf7;flex-wrap:wrap}.status{position:static;width:auto;height:auto;clip:auto;white-space:normal;margin:0;flex-basis:100%;font-size:.875rem;color:var(--muted)}.status:empty{display:none}.wrap{padding-bottom:13rem}
</style></head><body>
<nav class="topbar" aria-label="Main navigation"><span class="brand">Coral Classroom · Artbook</span><span><a href="index.html">Back to artbook</a> · <a href="shelly.html?v=organic-3">Open current 3D Shelly</a></span></nav>
<main class="wrap"><section class="intro" aria-labelledby="page-title"><p class="kicker">DESIGN PICKER</p><h1 id="page-title">Which Shelly feels cutest?</h1>
<p>These are ten versions of Shelly’s actual 3D model, ordered from the mildest change to the most baby-like proportions. Her palette, lighting and camera angles stay consistent. Compare the normal and top-down views, then choose the number you like best.</p>
<p>This is a design survey for the character. The current game remains unchanged.</p><div class="navlinks"><a href="assets/shelly-options/overview.webp" target="_blank" rel="noopener">All ten at a glance</a><a href="index.html">Return to the classroom artbook</a><a href="shelly.html?v=organic-3">View current Shelly in 3D</a></div></section>
<nav class="jump" aria-label="Jump to an option">JUMP TO:'''+''.join(f'<a href="#option-{n}" aria-label="Jump to option {n}">{n}</a>' for n in range(1,11))+'''</nav>
<section aria-label="Shelly proportion options">'''+''.join(cards)+'''</section>
<footer>Both views link to their uncropped full-size image. Your selection is saved only in this browser on this device.</footer></main>
<aside class="sticky" aria-label="Your selection"><div class="selection" aria-live="polite">Selected option: <strong id="selected">None yet</strong><div id="instruction">Choose a number above, then reply with this number in chat.</div></div><button class="copy" id="copy" type="button" disabled>Copy choice</button><span class="status" id="status" role="status"></span></aside>
<script>
(()=>{const KEY='cc-shelly-baby-survey-v1';const buttons=[...document.querySelectorAll('.pick')];const selected=document.getElementById('selected');const copy=document.getElementById('copy');const status=document.getElementById('status');let choice=null;try{const saved=localStorage.getItem(KEY);if(saved&&/^(?:[1-9]|10)$/.test(saved))choice=Number(saved)}catch{}function render(){buttons.forEach(b=>{const yes=Number(b.dataset.option)===choice;b.setAttribute('aria-pressed',String(yes));b.textContent=yes?'Selected ✓':`Choose ${b.dataset.option}`});selected.textContent=choice===null?'None yet':String(choice);copy.disabled=choice===null}document.addEventListener('click',event=>{const b=event.target.closest('.pick');if(!b)return;choice=Number(b.dataset.option);try{localStorage.setItem(KEY,String(choice))}catch{status.textContent='Browser storage is unavailable; the selection is held for this page only.'}render()});copy.addEventListener('click',async()=>{if(choice===null)return;try{await navigator.clipboard.writeText(String(choice));status.textContent=`Copied option ${choice}. Reply with ${choice} in chat.`}catch{status.textContent='Could not access the clipboard. Reply with '+choice+' in chat.'}});render()})();
</script></body></html>'''
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(page, encoding="utf-8")
    # Machine-readable build facts for review; this is printed only, no sidecar file.
    print(json.dumps({"output": str(OUT), "options": 10, "image_references": len(files),
                      "dimensions": {name: list(size) for name, size in dims.items()},
                      "art_manifest_found": ART_MANIFEST.is_file(), "web_manifest_found": WEB_MANIFEST.is_file()}, indent=2))


if __name__ == "__main__":
    build()
