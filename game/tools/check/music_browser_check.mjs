#!/usr/bin/env node
/**
 * Opaque-box headless Chrome CDP verifier for Coral Classroom soundtrack auditioning
 * (review-site/music-review.html) and strictly-muted game runtime (game/index.html).
 *
 * Zero npm dependencies; runs on Node v22+ with native WebSocket + node:http.
 *
 * Usage:
 *   node game/tools/check/music_browser_check.mjs [--strict-upgrade | --baseline-ok] [--tier 1|2|3|4|all] [--json] [--port <n>] [--chrome <path>]
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const EXPECTED_REGION_ORDER = [
  { id: 'cove', day: 'day-song', night: 'night-song', key: 'C maj', meter: '4/4', bpmDay: 104, bpmNight: 80 },
  { id: 'town', day: 'region-town-song', night: 'region-town-night-song', key: 'G maj', meter: '4/4', bpmDay: 118, bpmNight: 88 },
  { id: 'lagoon', day: 'region-lagoon-song', night: 'region-lagoon-night-song', key: 'D maj', meter: '6/8', bpmDay: 90, bpmNight: 72 },
  { id: 'caves', day: 'region-caves-song', night: 'region-caves-night-song', key: 'A Dorian', meter: '4/4', bpmDay: 86, bpmNight: 74 },
  { id: 'patterns', day: 'region-patterns-song', night: 'region-patterns-night-song', key: 'F maj', meter: '4/4', bpmDay: 120, bpmNight: 90 },
  { id: 'beach', day: 'region-beach-song', night: 'region-beach-night-song', key: 'C maj', meter: '4/4', bpmDay: 98, bpmNight: 78 },
  { id: 'light', day: 'region-light-song', night: 'region-light-night-song', key: 'Eb maj', meter: '3/4', bpmDay: 86, bpmNight: 74 },
  { id: 'captain', day: 'region-captain-song', night: 'region-captain-night-song', key: 'D min', meter: '6/8', bpmDay: 124, bpmNight: 92 },
];

const EXPECTED_RM_REGION_IDS = ['town', 'lagoon', 'caves', 'patterns', 'beach', 'light', 'captain'];
const EXPECTED_CORE_SONGS = ['day-song', 'night-song', 'lobby-song', 'deck-song', 'timer-song', 'game-song'];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.mid': 'audio/midi',
  '.midi': 'audio/midi',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
};

function printHelp() {
  console.log(`Usage: node game/tools/check/music_browser_check.mjs [options]
Options:
  --strict-upgrade   Fail on any baseline upgrade gap (default)
  --baseline-ok      Tag known pre-M1..M4 upgrade gaps as BASELINE_GAP and exit 0 if invariants hold
  --tier <1|2|3|4|all>  Filter checks by tier (default: all)
  --json             Emit machine-readable JSON report to stdout
  --port <n>         Local HTTP server port (default: 0 for ephemeral)
  --chrome <path>    Path to Chrome executable
  -h, --help         Show this help`);
}

function parseArgs(argv) {
  const opts = {
    strictUpgrade: true,
    baselineOk: false,
    tier: 'all',
    json: false,
    port: 0,
    chrome: '',
  };
  let sawStrict = false;
  let sawBaseline = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') {
      printHelp();
      process.exit(0);
    } else if (a === '--strict-upgrade') {
      sawStrict = true;
      opts.strictUpgrade = true;
      opts.baselineOk = false;
    } else if (a === '--baseline-ok') {
      sawBaseline = true;
      opts.baselineOk = true;
      opts.strictUpgrade = false;
    } else if (a === '--json') {
      opts.json = true;
    } else if (a === '--tier') {
      const v = argv[++i];
      if (!v || !['1', '2', '3', '4', 'all'].includes(v)) {
        throw new Error(`Invalid --tier value: ${v ?? '(missing)'}`);
      }
      opts.tier = v;
    } else if (a.startsWith('--tier=')) {
      const v = a.slice('--tier='.length);
      if (!['1', '2', '3', '4', 'all'].includes(v)) {
        throw new Error(`Invalid --tier value: ${v}`);
      }
      opts.tier = v;
    } else if (a === '--port') {
      const v = argv[++i];
      const n = Number(v);
      if (!v || !Number.isInteger(n) || n < 0 || n > 65535) {
        throw new Error(`Invalid --port value: ${v ?? '(missing)'}`);
      }
      opts.port = n;
    } else if (a.startsWith('--port=')) {
      const v = a.slice('--port='.length);
      const n = Number(v);
      if (!v || !Number.isInteger(n) || n < 0 || n > 65535) {
        throw new Error(`Invalid --port value: ${v}`);
      }
      opts.port = n;
    } else if (a === '--chrome') {
      const v = argv[++i];
      if (!v) throw new Error('Missing value for --chrome');
      opts.chrome = v;
    } else if (a.startsWith('--chrome=')) {
      opts.chrome = a.slice('--chrome='.length);
      if (!opts.chrome) throw new Error('Missing value for --chrome');
    } else {
      throw new Error(`Unknown CLI option: ${a}`);
    }
  }

  if (sawStrict && sawBaseline) {
    throw new Error('Cannot combine --strict-upgrade and --baseline-ok');
  }
  return opts;
}

function findChrome(explicitPath) {
  const candidates = [];
  if (explicitPath) candidates.push(explicitPath);
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  if (process.platform === 'win32') {
    candidates.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    );
    if (process.env.LOCALAPPDATA) {
      candidates.push(path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    }
  } else {
    candidates.push(
      '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
      '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
    );
  }
  for (const cand of candidates) {
    if (cand && fs.existsSync(cand)) return cand;
  }
  throw new Error(`Chrome executable not found. Checked: ${candidates.filter(Boolean).join(', ')}`);
}

function startStaticServer(rootDir, port = 0) {
  return new Promise((resolve, reject) => {
    const resolvedRoot = path.resolve(rootDir);
    const server = http.createServer((req, res) => {
      try {
        const method = (req.method || 'GET').toUpperCase();
        if (method !== 'GET' && method !== 'HEAD') {
          res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Method Not Allowed');
          return;
        }
        const urlObj = new URL(req.url || '/', 'http://127.0.0.1');
        let relPath = decodeURIComponent(urlObj.pathname);
        if (relPath === '/') relPath = '/index.html';
        const filePath = path.resolve(resolvedRoot, '.' + relPath);
        if (filePath !== resolvedRoot && !filePath.startsWith(resolvedRoot + path.sep)) {
          res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Forbidden');
          return;
        }
        if (!fs.existsSync(filePath)) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Not Found');
          return;
        }
        let stat = fs.statSync(filePath);
        let targetFile = filePath;
        if (stat.isDirectory()) {
          targetFile = path.join(filePath, 'index.html');
          if (!fs.existsSync(targetFile)) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not Found');
            return;
          }
          stat = fs.statSync(targetFile);
        }

        const ext = path.extname(targetFile).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const baseHeaders = {
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-store',
        };

        const rangeHeader = req.headers.range;
        if (rangeHeader && method === 'GET') {
          const m = /^bytes=(\d*)-(\d*)$/i.exec(String(rangeHeader).trim());
          if (!m) {
            res.writeHead(416, { ...baseHeaders, 'Content-Range': `bytes */${stat.size}` });
            res.end();
            return;
          }
          let start = m[1] === '' ? 0 : Number(m[1]);
          let end = m[2] === '' ? stat.size - 1 : Number(m[2]);
          if (m[1] === '' && m[2] !== '') {
            const suffix = Number(m[2]);
            start = Math.max(0, stat.size - suffix);
            end = stat.size - 1;
          }
          if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= stat.size) {
            res.writeHead(416, { ...baseHeaders, 'Content-Range': `bytes */${stat.size}` });
            res.end();
            return;
          }
          end = Math.min(end, stat.size - 1);
          res.writeHead(206, {
            ...baseHeaders,
            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
            'Content-Length': String(end - start + 1),
          });
          const stream = fs.createReadStream(targetFile, { start, end });
          stream.on('error', () => {
            if (!res.headersSent) res.writeHead(500);
            res.end();
          });
          stream.pipe(res);
          return;
        }

        res.writeHead(200, {
          ...baseHeaders,
          'Content-Length': String(stat.size),
        });
        if (method === 'HEAD') {
          res.end();
          return;
        }
        const stream = fs.createReadStream(targetFile);
        stream.on('error', () => {
          if (!res.headersSent) res.writeHead(500);
          res.end();
        });
        stream.pipe(res);
      } catch (err) {
        if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(String(err && err.message ? err.message : err));
      }
    });

    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const addr = server.address();
      resolve({
        server,
        port: typeof addr === 'object' && addr ? addr.port : port,
      });
    });
  });
}

class CdpClient {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.closed = false;

    ws.addEventListener('message', (evt) => {
      let msg;
      try {
        msg = JSON.parse(typeof evt.data === 'string' ? evt.data : Buffer.from(evt.data).toString('utf8'));
      } catch {
        return;
      }
      if (msg.id) {
        const entry = this.pending.get(msg.id);
        if (entry) {
          this.pending.delete(msg.id);
          clearTimeout(entry.timer);
          if (msg.error) {
            entry.reject(new Error(`CDP ${entry.method}: ${msg.error.message || JSON.stringify(msg.error)}`));
          } else {
            entry.resolve(msg.result || {});
          }
        }
      } else if (msg.method) {
        const set = this.listeners.get(msg.method);
        if (set) {
          for (const fn of set) fn(msg.params || {}, msg.sessionId || null);
        }
      }
    });

    ws.addEventListener('close', () => {
      this.closed = true;
      for (const [id, entry] of this.pending.entries()) {
        clearTimeout(entry.timer);
        entry.reject(new Error(`CDP WebSocket closed while waiting for ${entry.method} (id=${id})`));
      }
      this.pending.clear();
    });
  }

  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, new Set());
    this.listeners.get(method).add(fn);
    return () => this.listeners.get(method)?.delete(fn);
  }

  send(method, params = {}, sessionId = undefined, timeoutMs = 30000) {
    if (this.closed) return Promise.reject(new Error(`CDP WebSocket already closed (${method})`));
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP command timed out after ${timeoutMs}ms: ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer, method });
      this.ws.send(JSON.stringify(payload));
    });
  }

  close() {
    if (!this.closed) {
      this.closed = true;
      try {
        this.ws.close();
      } catch {
        // ignore
      }
    }
  }
}

async function launchChrome(chromePath, userDataDir) {
  const args = [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-sync',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--autoplay-policy=no-user-gesture-required',
    'about:blank',
  ];

  const proc = spawn(chromePath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  const wsUrl = await new Promise((resolve, reject) => {
    let stderrBuf = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(`Timed out waiting for Chrome DevTools WS URL. stderr=${stderrBuf.slice(-400)}`));
      }
    }, 15000);

    const onData = (chunk) => {
      stderrBuf += chunk.toString('utf8');
      const m = /DevTools listening on (ws:\/\/[^\r\n]+)/.exec(stderrBuf);
      if (m && !settled) {
        settled = true;
        clearTimeout(timer);
        resolve(m[1].trim());
      }
    };

    proc.stderr.on('data', onData);
    proc.once('error', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    });
    proc.once('exit', (code, sig) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`Chrome exited prematurely (code=${code}, sig=${sig}). stderr=${stderrBuf.slice(-400)}`));
      }
    });
  });

  const ws = await new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    const timer = setTimeout(() => {
      try { socket.close(); } catch {}
      reject(new Error(`Timed out connecting WebSocket to ${wsUrl}`));
    }, 10000);
    socket.addEventListener('open', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.addEventListener('error', (evt) => {
      clearTimeout(timer);
      reject(new Error(`WebSocket connection error: ${evt.message || 'unknown'}`));
    });
  });

  return { proc, cdp: new CdpClient(ws) };
}

async function teardownChrome(proc, cdp, userDataDir) {
  if (cdp) {
    try {
      await Promise.race([
        cdp.send('Browser.close', {}, undefined, 2500),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
    } catch {
      // ignore
    }
    cdp.close();
  }

  if (proc && proc.exitCode === null && proc.signalCode === null) {
    await new Promise((resolve) => {
      const t = setTimeout(() => {
        try { proc.kill('SIGKILL'); } catch {}
        if (process.platform === 'win32' && proc.pid) {
          try {
            execFileSync('taskkill', ['/F', '/T', '/PID', String(proc.pid)], { stdio: 'ignore', timeout: 3000 });
          } catch {
            // ignore
          }
        }
        resolve();
      }, 3000);
      proc.once('exit', () => {
        clearTimeout(t);
        resolve();
      });
    });
  }

  if (userDataDir) {
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 15, retryDelay: 150 });
    } catch {
      // ignore
    }
  }
}

async function createPageSession(cdp, spyScript, extraScripts = []) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);

  const pageErrors = [];
  const consoleErrors = [];
  const offExc = cdp.on('Runtime.exceptionThrown', (params, sid) => {
    if (sid !== sessionId) return;
    const d = params.exceptionDetails || {};
    const txt = d.exception?.description || d.text || 'Runtime exception';
    pageErrors.push(String(txt));
  });
  const offCon = cdp.on('Runtime.consoleAPICalled', (params, sid) => {
    if (sid !== sessionId) return;
    if (params.type === 'error') {
      const msg = (params.args || []).map((a) => a.value ?? a.description ?? a.type).join(' ');
      consoleErrors.push(msg || 'console.error');
    }
  });

  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: spyScript }, sessionId);
  for (const s of extraScripts) {
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: s }, sessionId);
  }

  async function evaluate(expr) {
    const res = await cdp.send(
      'Runtime.evaluate',
      { expression: expr, awaitPromise: true, returnByValue: true },
      sessionId,
      30000,
    );
    if (res.exceptionDetails) {
      const msg = res.exceptionDetails.exception?.description || res.exceptionDetails.text || 'Evaluation failed';
      throw new Error(msg);
    }
    return res.result ? res.result.value : undefined;
  }

  async function navigate(url) {
    let loaded = false;
    const loadPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        off();
        reject(new Error(`Timed out waiting for Page.loadEventFired on ${url}`));
      }, 30000);
      const off = cdp.on('Page.loadEventFired', (_p, sid) => {
        if (sid === sessionId && !loaded) {
          loaded = true;
          clearTimeout(timer);
          off();
          resolve();
        }
      });
    });
    await cdp.send('Page.navigate', { url }, sessionId, 30000);
    await loadPromise;
  }

  async function waitFor(predicateExpr, timeoutMs = 30000, label = predicateExpr) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const val = await evaluate(`Boolean(${predicateExpr})`);
        if (val) return true;
      } catch {
        // retry until timeout
      }
      await new Promise((r) => setTimeout(r, 120));
    }
    throw new Error(`Timed out after ${timeoutMs}ms waiting for: ${label}`);
  }

  async function click(selector) {
    await waitFor(`!!document.querySelector(${JSON.stringify(selector)})`, 20000, `selector ${selector}`);
    const clicked = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      el.scrollIntoView?.({ block: 'center', inline: 'center' });
      try { el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); } catch {}
      el.click();
      return true;
    })()`);
    if (!clicked) throw new Error(`Failed to click selector: ${selector}`);
  }

  async function close() {
    offExc();
    offCon();
    try {
      await cdp.send('Target.closeTarget', { targetId }, undefined, 5000);
    } catch {
      // ignore
    }
  }

  return { targetId, sessionId, pageErrors, consoleErrors, evaluate, navigate, waitFor, click, close };
}

const AUDIO_SPY_SCRIPT = `(() => {
  if (window.__audioSpy) return;
  const spy = {
    audioCtxCount: 0,
    audioNewCount: 0,
    audioEls: [],
    playCalls: [],
    stacks: [],
  };
  const OrigAC = window.AudioContext || window.webkitAudioContext;
  if (OrigAC) {
    const WrappedAC = function(...args) {
      spy.audioCtxCount++;
      try { spy.stacks.push(new Error('AudioContext').stack || ''); } catch {}
      return new OrigAC(...args);
    };
    WrappedAC.prototype = OrigAC.prototype;
    Object.setPrototypeOf(WrappedAC, OrigAC);
    if (window.AudioContext) window.AudioContext = WrappedAC;
    if (window.webkitAudioContext) window.webkitAudioContext = WrappedAC;
  }
  const OrigAudio = window.Audio;
  if (OrigAudio) {
    const WrappedAudio = function(...args) {
      spy.audioNewCount++;
      const el = new OrigAudio(...args);
      spy.audioEls.push(el);
      return el;
    };
    WrappedAudio.prototype = OrigAudio.prototype;
    Object.setPrototypeOf(WrappedAudio, OrigAudio);
    window.Audio = WrappedAudio;
  }
  const origPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function(...args) {
    spy.playCalls.push({
      src: this.currentSrc || this.src || this.getAttribute('data-src') || '',
      autoplay: !!this.autoplay,
    });
    return origPlay.apply(this, args);
  };
  window.__audioSpy = spy;
})();`;

function toWslPath(winPath) {
  return winPath.replace(/^([A-Za-z]):/, (_, d) => `/mnt/${d.toLowerCase()}`).replace(/\\/g, '/');
}

function inspectComposeListJson() {
  const composePath = path.join(REPO_ROOT, 'game', 'tools', 'compose_soundtrack.py');
  if (!fs.existsSync(composePath)) {
    return { supported: false, reason: 'compose_soundtrack.py missing', tracks: null };
  }
  const src = fs.readFileSync(composePath, 'utf8');
  // CRITICAL SAFETY GUARD: baseline compose_soundtrack.py ignores unknown --flags and overwrites all 16 MP3/MIDI files.
  const hasFlag = /--list-json/.test(src);
  const hasFlagDispatch = /argparse|["']--list-json["']\s+in\s+sys\.argv|add_argument\s*\(\s*["']--list-json["']/.test(src);
  if (!hasFlag || !hasFlagDispatch) {
    return {
      supported: false,
      reason: 'compose_soundtrack.py lacks --list-json CLI guard (skipping execution to avoid overwriting assets)',
      tracks: null,
    };
  }

  let raw = '';
  if (process.platform === 'win32') {
    const wslPython = '/home/wendy/.venvs/coral-classroom/bin/python';
    raw = execFileSync('wsl.exe', ['-e', wslPython, toWslPath(composePath), '--list-json'], {
      encoding: 'utf8',
      timeout: 20000,
    });
  } else {
    const py = fs.existsSync('/home/wendy/.venvs/coral-classroom/bin/python')
      ? '/home/wendy/.venvs/coral-classroom/bin/python'
      : 'python3';
    raw = execFileSync(py, [composePath, '--list-json'], {
      encoding: 'utf8',
      timeout: 20000,
    });
  }

  const parsed = JSON.parse(raw);
  const byName = new Map();
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (item && item.name) byName.set(item.name, item);
    }
  } else if (parsed && Array.isArray(parsed.tracks)) {
    for (const item of parsed.tracks) {
      if (item && item.name) byName.set(item.name, item);
    }
  } else if (parsed && typeof parsed === 'object') {
    for (const [k, v] of Object.entries(parsed)) {
      if (v && typeof v === 'object') byName.set(v.name || k, { name: v.name || k, ...v });
    }
  }
  return { supported: true, reason: `loaded ${byName.size} tracks via --list-json`, tracks: byName };
}

function inspectGameHtmlMusicModule(htmlText) {
  const startIdx = htmlText.indexOf('var RM_REGION_IDS');
  if (startIdx < 0) {
    throw new Error('Could not locate var RM_REGION_IDS in served game/index.html');
  }
  const endMarker = htmlText.indexOf('function reefRegionTrack', startIdx);
  if (endMarker < 0) {
    throw new Error('Could not locate function reefRegionTrack after RM_REGION_IDS');
  }
  const declBlock = htmlText.slice(startIdx, endMarker);
  const sandbox = {};
  vm.runInNewContext(declBlock, sandbox, { timeout: 1000 });

  const busStart = htmlText.indexOf('function reefMusicBus', startIdx);
  const endBlock = htmlText.indexOf('var reefMusicScreenWatch', startIdx);
  const musicSection = htmlText.slice(startIdx, endBlock > busStart ? endBlock + 120 : startIdx + 12000);

  return {
    RM_REGION_IDS: sandbox.RM_REGION_IDS,
    RM_REGION_SONGS: sandbox.RM_REGION_SONGS,
    RM_SONGS: sandbox.RM_SONGS,
    RM_ROUTE_OVERRIDES: sandbox.RM_ROUTE_OVERRIDES,
    musicSection,
  };
}

async function runChecks(opts) {
  const checks = [];
  const addCheck = (id, tier, feature, status, detail) => {
    checks.push({ id, tier, feature, status, detail });
  };
  const upgradeStatus = (ok, passDetail, gapDetail) => {
    if (ok) return { status: 'PASS', detail: passDetail };
    return { status: opts.baselineOk ? 'BASELINE_GAP' : 'FAIL', detail: gapDetail };
  };

  const chromePath = findChrome(opts.chrome);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-music-cdp-'));
  const { server, port } = await startStaticServer(REPO_ROOT, opts.port);
  const baseUrl = `http://127.0.0.1:${port}`;

  let proc = null;
  let cdp = null;
  const allErrors = {
    review: { pageErrors: [], consoleErrors: [] },
    game: { pageErrors: [], consoleErrors: [] },
  };

  try {
    ({ proc, cdp } = await launchChrome(chromePath, userDataDir));

    // =========================================================================
    // PART A: review-site/music-review.html
    // =========================================================================
    const reviewUrl = `${baseUrl}/review-site/music-review.html`;
    const reviewHtmlRes = await fetch(reviewUrl);
    const reviewHtmlText = await reviewHtmlRes.text();

    const sessA = await createPageSession(cdp, AUDIO_SPY_SCRIPT);
    try {
      await sessA.navigate(reviewUrl);
      await sessA.waitFor('document.querySelectorAll(".card").length === 8 && !!window.__audioSpy', 15000, '8 review cards');

      const initialAudit = await sessA.evaluate(`(() => {
        const cards = [...document.querySelectorAll('.card')];
        const domAutoplay = document.querySelectorAll('audio[autoplay]').length;
        const focusBtn = document.getElementById('focusToggle');
        const stopBtn = document.getElementById('stopAll');
        const spy = window.__audioSpy;
        const audioStates = spy.audioEls.map(a => ({
          preload: a.preload,
          paused: a.paused,
          autoplay: a.autoplay,
          loop: a.loop,
          dataSrc: a.getAttribute('data-src') || '',
        }));
        const cardSummaries = cards.map(c => ({
          title: c.querySelector('.title')?.textContent?.trim() || '',
          tags: c.querySelector('.tags')?.textContent?.trim() || '',
          desc: c.querySelector('.desc')?.textContent?.trim() || '',
          trackName: c.querySelector('.track-name')?.textContent?.trim() || '',
          midHref: c.querySelector('.mid-link')?.getAttribute('href') || '',
          isNight: c.classList.contains('is-night'),
          activeMode: c.querySelector('.seg button.active')?.getAttribute('data-m') || '',
        }));
        const headerText = document.querySelector('header')?.innerText || '';
        return {
          cardCount: cards.length,
          domAutoplay,
          hasFocusBtn: !!focusBtn,
          hasStopBtn: !!stopBtn,
          focusInit: focusBtn ? {
            pressed: focusBtn.getAttribute('aria-pressed'),
            hasOn: focusBtn.classList.contains('on'),
            text: focusBtn.textContent.trim(),
          } : null,
          spyCounts: {
            audioCtxCount: spy.audioCtxCount,
            audioNewCount: spy.audioNewCount,
            audioElsLen: spy.audioEls.length,
            playCallsLen: spy.playCalls.length,
          },
          audioStates,
          cardSummaries,
          headerText,
        };
      })()`);

      addCheck(
        't1.review.page_loads',
        1,
        'F7',
        reviewHtmlRes.status === 200 && initialAudit.cardCount === 8 && initialAudit.hasFocusBtn && initialAudit.hasStopBtn ? 'PASS' : 'FAIL',
        `HTTP=${reviewHtmlRes.status}, cards=${initialAudit.cardCount}, focusBtn=${initialAudit.hasFocusBtn}, stopBtn=${initialAudit.hasStopBtn}`,
      );

      const allPreloadNone =
        initialAudit.spyCounts.audioElsLen === 8 &&
        initialAudit.audioStates.every((a) => a.preload === 'none');
      addCheck(
        't1.review.audio_instances_8',
        1,
        'F7',
        allPreloadNone ? 'PASS' : 'FAIL',
        `audioEls=${initialAudit.spyCounts.audioElsLen}, preloadNone=${initialAudit.audioStates.filter((a) => a.preload === 'none').length}/8`,
      );

      const zeroAutoplay =
        initialAudit.domAutoplay === 0 &&
        initialAudit.spyCounts.audioElsLen === 8 &&
        initialAudit.audioStates.every((a) => a.paused === true && a.autoplay === false);
      addCheck(
        't2.review.zero_dom_autoplay',
        2,
        'F7',
        zeroAutoplay ? 'PASS' : 'FAIL',
        `domAutoplay=${initialAudit.domAutoplay}, paused=${initialAudit.audioStates.filter((a) => a.paused).length}/8, autoplayFalse=${initialAudit.audioStates.filter((a) => !a.autoplay).length}/8`,
      );

      addCheck(
        't2.review.initial_silence',
        2,
        'F7',
        initialAudit.spyCounts.playCallsLen === 0 && initialAudit.spyCounts.audioCtxCount === 0 ? 'PASS' : 'FAIL',
        `playCalls=${initialAudit.spyCounts.playCallsLen}, audioCtxCount=${initialAudit.spyCounts.audioCtxCount}`,
      );

      // Exercise all 8 cards × Day/Night toggles (16 switches: Day -> Night -> Day)
      const switchResults = await sessA.evaluate(`(() => {
        const cards = [...document.querySelectorAll('.card')];
        const spy = window.__audioSpy;
        const rows = [];
        for (let i = 0; i < cards.length; i++) {
          const c = cards[i];
          const dayBtn = c.querySelector('.seg button[data-m="day"]');
          const nightBtn = c.querySelector('.seg button[data-m="night"]');
          const snap = () => ({
            isNight: c.classList.contains('is-night'),
            activeMode: c.querySelector('.seg button.active')?.getAttribute('data-m') || '',
            trackName: c.querySelector('.track-name')?.textContent?.trim() || '',
            midHref: c.querySelector('.mid-link')?.getAttribute('href') || '',
            desc: c.querySelector('.desc')?.textContent?.trim() || '',
            pausedAll: spy.audioEls.every(a => a.paused === true),
            playCalls: spy.playCalls.length,
            audioCtxCount: spy.audioCtxCount,
          });
          nightBtn.click();
          const nightSnap = snap();
          dayBtn.click();
          const daySnap = snap();
          rows.push({ index: i, nightSnap, daySnap });
        }
        return rows;
      })()`);

      const switchFailures = [];
      for (let i = 0; i < EXPECTED_REGION_ORDER.length; i++) {
        const exp = EXPECTED_REGION_ORDER[i];
        const row = switchResults[i];
        if (!row) {
          switchFailures.push(`card[${i}] missing`);
          continue;
        }
        const n = row.nightSnap;
        const d = row.daySnap;
        if (!n.isNight || n.activeMode !== 'night' || n.trackName !== `${exp.night}.mp3` || !n.midHref.endsWith(`/assets/midi/${exp.night}.mid`) || !n.desc) {
          switchFailures.push(`card[${i}] night mismatch: ${JSON.stringify(n)}`);
        }
        if (d.isNight || d.activeMode !== 'day' || d.trackName !== `${exp.day}.mp3` || !d.midHref.endsWith(`/assets/midi/${exp.day}.mid`) || !d.desc) {
          switchFailures.push(`card[${i}] day mismatch: ${JSON.stringify(d)}`);
        }
        if (n.desc === d.desc) {
          switchFailures.push(`card[${i}] day/night desc identical`);
        }
        if (!n.pausedAll || !d.pausedAll || n.playCalls !== 0 || d.playCalls !== 0 || n.audioCtxCount !== 0 || d.audioCtxCount !== 0) {
          switchFailures.push(`card[${i}] audio triggered during switch`);
        }
      }

      addCheck(
        't3.review.16_day_night_switches',
        3,
        'F7',
        switchFailures.length === 0 ? 'PASS' : 'FAIL',
        switchFailures.length === 0
          ? '16 Day/Night switches across 8 cards updated DOM/links/descriptions with 0 playCalls and 0 AudioContext'
          : switchFailures.slice(0, 3).join('; '),
      );

      // Verify all 32 asset URLs (16 ../game/*.mp3 + 16 ../game/assets/midi/*.mid)
      const assetUrls = [];
      for (const r of EXPECTED_REGION_ORDER) {
        assetUrls.push({ kind: 'mp3', track: r.day, url: `../game/${r.day}.mp3` });
        assetUrls.push({ kind: 'mp3', track: r.night, url: `../game/${r.night}.mp3` });
        assetUrls.push({ kind: 'mid', track: r.day, url: `../game/assets/midi/${r.day}.mid` });
        assetUrls.push({ kind: 'mid', track: r.night, url: `../game/assets/midi/${r.night}.mid` });
      }

      const assetChecks = await sessA.evaluate(`(async (items) => {
        const results = [];
        for (const it of items) {
          const headRes = await fetch(it.url, { method: 'HEAD' });
          const contentLen = Number(headRes.headers.get('content-length') || '0');
          const contentType = headRes.headers.get('content-type') || '';
          let rangeStatus = null;
          let rangeHeader = '';
          if (it.kind === 'mp3') {
            const rRes = await fetch(it.url, { headers: { Range: 'bytes=0-63' } });
            rangeStatus = rRes.status;
            rangeHeader = rRes.headers.get('content-range') || '';
            await rRes.arrayBuffer();
          }
          results.push({ ...it, status: headRes.status, contentLen, contentType, rangeStatus, rangeHeader });
        }
        return results;
      })(${JSON.stringify(assetUrls)})`);

      const badAssets = assetChecks.filter((a) => {
        const typeOk = a.kind === 'mp3' ? /audio\/mpeg/i.test(a.contentType) : /audio\/midi/i.test(a.contentType);
        const rangeOk = a.kind === 'mp3' ? a.rangeStatus === 206 && /^bytes 0-63\/\d+$/.test(a.rangeHeader) : true;
        return a.status !== 200 || !(a.contentLen > 1000) || !typeOk || !rangeOk;
      });

      addCheck(
        't1.review.all_32_assets_http',
        1,
        'F7',
        badAssets.length === 0 ? 'PASS' : 'FAIL',
        badAssets.length === 0
          ? 'All 32 assets (16 MP3 + 16 MIDI) returned HTTP 200, valid MIME, size > 1000B, and 206 Range support'
          : `Bad assets (${badAssets.length}): ${JSON.stringify(badAssets.slice(0, 3))}`,
      );

      addCheck(
        't3.review.cards_match_32_assets',
        3,
        'F7',
        switchFailures.length === 0 && badAssets.length === 0 ? 'PASS' : 'FAIL',
        `8 cards × 2 modes mapped cleanly to ${assetChecks.length - badAssets.length}/32 verified HTTP 200 assets`,
      );

      // Toggle #focusToggle OFF -> ON -> OFF and click #stopAll
      const focusCycle = await sessA.evaluate(`(() => {
        const btn = document.getElementById('focusToggle');
        const stopBtn = document.getElementById('stopAll');
        const read = () => ({
          pressed: btn.getAttribute('aria-pressed'),
          on: btn.classList.contains('on'),
          text: btn.textContent.trim(),
          playCalls: window.__audioSpy.playCalls.length,
          audioCtxCount: window.__audioSpy.audioCtxCount,
        });
        const s0 = read();
        btn.click();
        const s1 = read();
        btn.click();
        const s2 = read();
        stopBtn.click();
        const s3 = read();
        return { s0, s1, s2, s3 };
      })()`);

      const focusCycleOk =
        focusCycle.s0.pressed === 'false' && !focusCycle.s0.on && /2400\s*Hz/i.test(focusCycle.s0.text) && /OFF/.test(focusCycle.s0.text) &&
        focusCycle.s1.pressed === 'true' && focusCycle.s1.on && /2400\s*Hz/i.test(focusCycle.s1.text) && /ON/.test(focusCycle.s1.text) &&
        focusCycle.s2.pressed === 'false' && !focusCycle.s2.on && /OFF/.test(focusCycle.s2.text) &&
        focusCycle.s3.playCalls === 0 && focusCycle.s3.audioCtxCount === 0;

      addCheck(
        't2.review.focus_toggle_cycle',
        2,
        'F7',
        focusCycleOk ? 'PASS' : 'FAIL',
        `OFF(${focusCycle.s0.pressed}) -> ON(${focusCycle.s1.pressed}) -> OFF(${focusCycle.s2.pressed}), ctx=${focusCycle.s3.audioCtxCount}, plays=${focusCycle.s3.playCalls}`,
      );

      addCheck(
        't2.review.stop_all_no_op_safe',
        2,
        'F7',
        focusCycle.s3.playCalls === 0 && focusCycle.s3.audioCtxCount === 0 && sessA.pageErrors.length === 0 ? 'PASS' : 'FAIL',
        `#stopAll safe with 0 errors, 0 playCalls, 0 AudioContext`,
      );

      // Language-neutral Cozy-Oceanic copy check
      const allReviewCopy = [
        initialAudit.headerText,
        ...initialAudit.cardSummaries.map((c) => `${c.title} ${c.tags} ${c.desc}`),
        ...switchResults.map((r) => `${r.nightSnap.desc} ${r.daySnap.desc}`),
      ].join('\n');
      const hasHangulOrCjk = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\u4E00-\u9FFF]/.test(allReviewCopy);
      const hasLangLockWord = /\b(Korean|Hangul)\b/i.test(allReviewCopy);
      addCheck(
        't2.review.language_neutral_copy',
        2,
        'F7',
        !hasHangulOrCjk && !hasLangLockWord ? 'PASS' : 'FAIL',
        !hasHangulOrCjk && !hasLangLockWord
          ? 'Header and all 8 cards (16 descriptions) are language-neutral Cozy-Oceanic English'
          : `Found Hangul/CJK=${hasHangulOrCjk}, langLockWord=${hasLangLockWord}`,
      );

      // 2400 Hz lowpass wiring in served music-review.html
      const hasReviewLpf =
        /createBiquadFilter\s*\(/.test(reviewHtmlText) &&
        /['"]lowpass['"]/.test(reviewHtmlText) &&
        /2400/.test(reviewHtmlText) &&
        /18000/.test(reviewHtmlText);
      addCheck(
        't1.review.lpf_2400_wiring',
        1,
        'F7',
        hasReviewLpf ? 'PASS' : 'FAIL',
        hasReviewLpf
          ? 'Served music-review.html wires createBiquadFilter lowpass 2400/18000 Hz'
          : 'Missing createBiquadFilter/lowpass/2400/18000 wiring in music-review.html',
      );

      // Metadata parity against compose_soundtrack.py --list-json (source-guarded!)
      const listJsonInfo = inspectComposeListJson();
      const g1 = upgradeStatus(
        listJsonInfo.supported && listJsonInfo.tracks && listJsonInfo.tracks.size === 16,
        listJsonInfo.reason,
        listJsonInfo.reason,
      );
      addCheck('t1.review.compose_list_json_contract', 1, 'F6', g1.status, g1.detail);

      const metaMismatches = [];
      for (let i = 0; i < EXPECTED_REGION_ORDER.length; i++) {
        const exp = EXPECTED_REGION_ORDER[i];
        const card = initialAudit.cardSummaries[i];
        const tags = card ? card.tags : '';
        let targetDayBpm = exp.bpmDay;
        let targetNightBpm = exp.bpmNight;
        let targetKey = exp.key;
        let targetMeter = exp.meter;
        if (listJsonInfo.supported && listJsonInfo.tracks) {
          const dSpec = listJsonInfo.tracks.get(exp.day);
          const nSpec = listJsonInfo.tracks.get(exp.night);
          if (dSpec && typeof dSpec.bpm === 'number') targetDayBpm = dSpec.bpm;
          if (nSpec && typeof nSpec.bpm === 'number') targetNightBpm = nSpec.bpm;
          if (dSpec && dSpec.key) targetKey = String(dSpec.key);
          if (dSpec && Array.isArray(dSpec.meter) && dSpec.meter.length === 2) targetMeter = `${dSpec.meter[0]}/${dSpec.meter[1]}`;
        }
        const expectedBpmStr = `${targetDayBpm}/${targetNightBpm} BPM`;
        if (!tags.includes(expectedBpmStr)) {
          metaMismatches.push(`${exp.id}: tags="${tags}" lacks "${expectedBpmStr}"`);
        }
        if (!tags.includes(targetMeter)) {
          metaMismatches.push(`${exp.id}: tags="${tags}" lacks meter "${targetMeter}"`);
        }
        const keyStem = targetKey.split(' ')[0];
        if (!new RegExp(`\\b${keyStem}\\b`, 'i').test(tags)) {
          metaMismatches.push(`${exp.id}: tags="${tags}" lacks key "${targetKey}"`);
        }
      }
      const gMeta = upgradeStatus(
        listJsonInfo.supported && metaMismatches.length === 0,
        'All 8 music-review.html cards match compose_soundtrack.py --list-json keys, meters, and Day/Night BPMs',
        metaMismatches.length > 0
          ? `Metadata drift (${metaMismatches.length}): ${metaMismatches.slice(0, 4).join(' | ')}`
          : 'Cannot confirm --list-json parity until compose_soundtrack.py supports --list-json',
      );
      addCheck('t3.review.metadata_parity', 3, 'F6', gMeta.status, gMeta.detail);

      allErrors.review.pageErrors = [...sessA.pageErrors];
      allErrors.review.consoleErrors = [...sessA.consoleErrors];

      addCheck(
        't4.scenario.audition_studio_e2e',
        4,
        'F7',
        allErrors.review.pageErrors.length === 0 &&
          allErrors.review.consoleErrors.length === 0 &&
          zeroAutoplay &&
          switchFailures.length === 0 &&
          badAssets.length === 0 &&
          focusCycleOk &&
          !hasHangulOrCjk
          ? 'PASS'
          : 'FAIL',
        `Audition Studio E2E: cards=8, switches=16, assets=32/32, focusCycle=${focusCycleOk}, pageErrors=${allErrors.review.pageErrors.length}, consoleErrors=${allErrors.review.consoleErrors.length}`,
      );
    } finally {
      await sessA.close();
    }

    // =========================================================================
    // PART B: game/index.html (Strictly Muted Navigation + Runtime Hook Audit)
    // =========================================================================
    const gameUrl = `${baseUrl}/game/index.html`;
    const gameHtmlRes = await fetch(gameUrl);
    const gameHtmlText = await gameHtmlRes.text();
    const parsedGameMusic = inspectGameHtmlMusicModule(gameHtmlText);

    const expectedAll20 = [
      ...EXPECTED_CORE_SONGS,
      ...EXPECTED_RM_REGION_IDS.flatMap((id) => [`region-${id}-song`, `region-${id}-night-song`]),
    ];
    const rmSongsOk =
      Array.isArray(parsedGameMusic.RM_SONGS) &&
      parsedGameMusic.RM_SONGS.length === 20 &&
      expectedAll20.every((t) => parsedGameMusic.RM_SONGS.includes(t));
    addCheck(
      't1.game.rm_songs_20',
      1,
      'F8',
      rmSongsOk ? 'PASS' : 'FAIL',
      `RM_SONGS length=${parsedGameMusic.RM_SONGS?.length}, all20Present=${rmSongsOk}`,
    );

    const hasLessonOverride = /RM_ROUTE_OVERRIDES\s*\[\s*['"]lesson:['"]\s*\+\s*encReg\s*\]/.test(parsedGameMusic.musicSection);
    const hasDeckOverride = /RM_ROUTE_OVERRIDES\.deck|RM_ROUTE_OVERRIDES\s*\[\s*['"]deck['"]\s*\]/.test(parsedGameMusic.musicSection);
    const overridesObjOk =
      parsedGameMusic.RM_ROUTE_OVERRIDES !== null &&
      typeof parsedGameMusic.RM_ROUTE_OVERRIDES === 'object' &&
      !Array.isArray(parsedGameMusic.RM_ROUTE_OVERRIDES);
    addCheck(
      't1.game.rm_route_overrides',
      1,
      'F8',
      overridesObjOk && hasLessonOverride && hasDeckOverride ? 'PASS' : 'FAIL',
      `RM_ROUTE_OVERRIDES object=${overridesObjOk}, lessonHook=${hasLessonOverride}, deckHook=${hasDeckOverride}`,
    );

    const hasGameBusLpf =
      /function\s+reefMusicBus\s*\(/.test(parsedGameMusic.musicSection) &&
      /createBiquadFilter\s*\(/.test(parsedGameMusic.musicSection) &&
      /['"]lowpass['"]/.test(parsedGameMusic.musicSection) &&
      /2400/.test(parsedGameMusic.musicSection) &&
      /18000/.test(parsedGameMusic.musicSection);
    addCheck(
      't1.game.reef_music_bus_2400',
      1,
      'F8',
      hasGameBusLpf ? 'PASS' : 'FAIL',
      hasGameBusLpf
        ? 'Served game/index.html reefMusicBus wires createBiquadFilter lowpass 2400/18000 Hz'
        : 'Missing reefMusicBus 2400/18000 lowpass filter wiring in game/index.html',
    );

    const srcMusicPath = path.join(REPO_ROOT, 'game', 'src', 'js', 'music.js');
    const srcMusicText = fs.existsSync(srcMusicPath) ? fs.readFileSync(srcMusicPath, 'utf8') : '';
    const srcParityOk =
      Boolean(srcMusicText) &&
      srcMusicText.includes('RM_ROUTE_OVERRIDES') &&
      gameHtmlText.includes(srcMusicText.trim());
    addCheck(
      't3.game.served_vs_src_music_parity',
      3,
      'F8',
      srcParityOk ? 'PASS' : 'FAIL',
      srcParityOk
        ? 'Served /game/index.html contains exact game/src/js/music.js source'
        : 'Served /game/index.html diverges from game/src/js/music.js',
    );

    const seedStorageScript = `(() => {
      try {
        localStorage.setItem('cc-music', 'off');
        localStorage.setItem('coralCoveSound', '0');
        localStorage.setItem('cc-tour-off', '1');
        localStorage.setItem('cc-3dq3', '3');
      } catch {}
    })();`;

    const sessB = await createPageSession(cdp, AUDIO_SPY_SCRIPT, [seedStorageScript]);
    try {
      const readStepState = async (stepLabel) => {
        const st = await sessB.evaluate(`(() => {
          const spy = window.__audioSpy || { audioCtxCount: -1, audioNewCount: -1, playCalls: [] };
          const ms = typeof window.__reefMusicState === 'function' ? window.__reefMusicState() : null;
          const toggle = document.querySelector('[data-music-toggle]');
          const board = typeof window.__regionBoardView === 'function' ? window.__regionBoardView() : null;
          const view3d = typeof window.__reef3dView === 'function' ? window.__reef3dView() : null;
          return {
            spy: {
              audioCtxCount: spy.audioCtxCount,
              audioNewCount: spy.audioNewCount,
              playCallsLen: spy.playCalls.length,
            },
            musicState: ms,
            togglePressed: toggle ? toggle.getAttribute('aria-pressed') : null,
            toggleOff: toggle ? toggle.classList.contains('off') : null,
            storage: {
              music: localStorage.getItem('cc-music'),
              sound: localStorage.getItem('coralCoveSound'),
            },
            board: board ? { region: board.region, mode: board.mode, has3d: !!board.has3d } : null,
            has3d: !!view3d,
          };
        })()`);
        return { step: stepLabel, ...st };
      };

      const stepSnapshots = [];

      // Step 1: Load splash screen
      await sessB.navigate(gameUrl);
      await sessB.waitFor('!!document.querySelector(".cc-splash") && typeof window.__reefMusicState === "function"', 20000, 'game splash');
      stepSnapshots.push(await readStepState('splash'));

      addCheck(
        't1.game.page_loads_splash',
        1,
        'F8',
        gameHtmlRes.status === 200 && stepSnapshots[0].musicState !== null ? 'PASS' : 'FAIL',
        `HTTP=${gameHtmlRes.status}, hasReefMusicState=${stepSnapshots[0].musicState !== null}`,
      );

      // Step 2: Dismiss splash -> Profile picker
      await sessB.click('.cc-splash');
      await sessB.waitFor('!!document.querySelector("[data-profile=\\"crafted-preview-explorer\\"]") && !!document.querySelector("[data-music-toggle]")', 20000, 'profile picker');
      stepSnapshots.push(await readStepState('lobby'));

      // Step 3: Enter crafted-preview-explorer -> 3D Coral Cove board
      await sessB.click('[data-profile="crafted-preview-explorer"]');
      await sessB.waitFor('typeof window.__reef3dView === "function" && !!window.__reef3dView() && !!document.querySelector("[data-r3-map]")', 30000, 'Coral Cove 3D board');
      // Enable Sea Map course tab on the demo profile (defaults to Wendy-only unless courseOn is true)
      await sessB.evaluate('window.CoralCove && typeof window.CoralCove.setCourseOn === "function" ? window.CoralCove.setCourseOn(true) : false');
      stepSnapshots.push(await readStepState('coral-cove-3d'));

      // Step 4: Sea Map -> Story Lagoon -> Region board
      await sessB.click('[data-r3-map]');
      await sessB.waitFor('!!document.querySelector(".r3-map-tab[data-sea-tab=\\"sea\\"]")', 15000, 'Sea Map modal');
      await sessB.click('.r3-map-tab[data-sea-tab="sea"]');
      await sessB.waitFor('!!document.querySelector(".r3-sea-isle[data-sea=\\"lagoon\\"]")', 10000, 'Lagoon island button');
      await sessB.click('.r3-sea-isle[data-sea="lagoon"]');
      await sessB.waitFor('!!document.querySelector("[data-sea-go=\\"lagoon\\"]")', 10000, 'Go to Lagoon button');
      await sessB.click('[data-sea-go="lagoon"]');
      await sessB.waitFor('(() => { const v = window.__regionBoardView && window.__regionBoardView(); return v && v.region === "lagoon" && v.mode === "board" && !document.querySelector(".region-travel"); })()', 30000, 'Lagoon 3D board');
      stepSnapshots.push(await readStepState('lagoon-board'));

      // Step 5: Activities list -> Back to board
      await sessB.click('[data-rb-list]');
      await sessB.waitFor('(() => { const v = window.__regionBoardView && window.__regionBoardView(); return v && v.region === "lagoon" && v.mode === "list"; })()', 15000, 'Lagoon Activities list');
      stepSnapshots.push(await readStepState('lagoon-list'));

      await sessB.click('[data-rb-board]');
      await sessB.waitFor('(() => { const v = window.__regionBoardView && window.__regionBoardView(); return v && v.region === "lagoon" && v.mode === "board" && !document.querySelector(".region-travel"); })()', 30000, 'Return to Lagoon board');
      stepSnapshots.push(await readStepState('lagoon-board-return'));

      const muteBrokenSteps = stepSnapshots.filter((s) => {
        const ms = s.musicState;
        return (
          s.spy.audioCtxCount !== 0 ||
          s.spy.audioNewCount !== 0 ||
          s.spy.playCallsLen !== 0 ||
          !ms ||
          ms.target !== null ||
          ms.current !== null ||
          ms.started !== false ||
          ms.busFreq !== null ||
          s.storage.music !== 'off' ||
          s.storage.sound !== '0'
        );
      });

      const toggleSteps = stepSnapshots.filter((s) => s.togglePressed !== null);
      const togglesAllFalse =
        toggleSteps.length >= 2 &&
        toggleSteps.every((s) => s.togglePressed === 'false' && s.toggleOff === true);

      const storageOk = stepSnapshots.every((s) => s.storage.music === 'off' && s.storage.sound === '0');
      addCheck(
        't2.game.strict_mute_storage_seed',
        2,
        'F8',
        storageOk ? 'PASS' : 'FAIL',
        `localStorage cc-music='off' and coralCoveSound='0' held across all ${stepSnapshots.length} navigation steps`,
      );

      addCheck(
        't2.game.music_toggle_aria_false',
        2,
        'F8',
        togglesAllFalse ? 'PASS' : 'FAIL',
        `[data-music-toggle] aria-pressed="false" & .off across ${toggleSteps.length} screens`,
      );

      const lastSnap = stepSnapshots[stepSnapshots.length - 1];
      addCheck(
        't2.game.zero_webaudio_idle',
        2,
        'F8',
        muteBrokenSteps.length === 0 ? 'PASS' : 'FAIL',
        muteBrokenSteps.length === 0
          ? `audioCtxCount=0, audioNewCount=0, playCalls=0, target=null, current=null, started=false, busFreq=null across ${stepSnapshots.length} steps`
          : `Violations: ${JSON.stringify(muteBrokenSteps)}`,
      );

      addCheck(
        't3.game.mute_survives_pointer_and_click',
        3,
        'F8',
        muteBrokenSteps.length === 0 && lastSnap.board?.region === 'lagoon' && lastSnap.board?.mode === 'board' ? 'PASS' : 'FAIL',
        `Pointer/click interactions across splash->lobby->cove3d->seamap->lagoon->list->board kept 0 AudioContext / 0 Audio / 0 play()`,
      );

      allErrors.game.pageErrors = [...sessB.pageErrors];
      allErrors.game.consoleErrors = [...sessB.consoleErrors];

      addCheck(
        't2.game.errors_zero',
        2,
        'F8',
        allErrors.review.pageErrors.length === 0 &&
          allErrors.review.consoleErrors.length === 0 &&
          allErrors.game.pageErrors.length === 0 &&
          allErrors.game.consoleErrors.length === 0
          ? 'PASS'
          : 'FAIL',
        `review(page=${allErrors.review.pageErrors.length}, console=${allErrors.review.consoleErrors.length}), game(page=${allErrors.game.pageErrors.length}, console=${allErrors.game.consoleErrors.length})`,
      );

      addCheck(
        't4.scenario.muted_game_session_e2e',
        4,
        'F8',
        muteBrokenSteps.length === 0 &&
          togglesAllFalse &&
          allErrors.game.pageErrors.length === 0 &&
          allErrors.game.consoleErrors.length === 0 &&
          lastSnap.board?.region === 'lagoon' &&
          lastSnap.board?.mode === 'board'
          ? 'PASS'
          : 'FAIL',
        `Muted Game E2E: ${stepSnapshots.map((s) => s.step).join(' -> ')}, final=${JSON.stringify(lastSnap.board)}`,
      );
    } finally {
      await sessB.close();
    }
  } finally {
    await teardownChrome(proc, cdp, userDataDir);
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
    await new Promise((resolve) => server.close(() => resolve()));
  }

  const filteredChecks =
    opts.tier === 'all' ? checks : checks.filter((c) => String(c.tier) === String(opts.tier));

  const summary = {
    total: filteredChecks.length,
    pass: filteredChecks.filter((c) => c.status === 'PASS').length,
    fail: filteredChecks.filter((c) => c.status === 'FAIL').length,
    baseline_gap: filteredChecks.filter((c) => c.status === 'BASELINE_GAP').length,
    skipped: checks.length - filteredChecks.length,
  };

  return {
    tool: 'music_browser_check',
    mode: opts.baselineOk ? 'baseline-ok' : 'strict-upgrade',
    tier: opts.tier,
    summary,
    checks: filteredChecks,
    errors: allErrors,
  };
}

(async () => {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Argument error: ${err.message}`);
    process.exit(1);
  }

  try {
    const report = await runChecks(opts);
    if (opts.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      for (const c of report.checks) {
        const tag = c.status === 'PASS' ? 'PASS        ' : c.status === 'BASELINE_GAP' ? 'BASELINE_GAP' : 'FAIL        ';
        console.log(`[T${c.tier}/${c.feature}] ${tag} ${c.id} — ${c.detail}`);
      }
      console.log(
        `\nSummary (${report.mode}, tier=${report.tier}): total=${report.summary.total}, pass=${report.summary.pass}, fail=${report.summary.fail}, baseline_gap=${report.summary.baseline_gap}`,
      );
    }
    process.exit(report.summary.fail > 0 ? 1 : 0);
  } catch (err) {
    if (opts && opts.json) {
      console.log(
        JSON.stringify(
          {
            tool: 'music_browser_check',
            mode: opts.baselineOk ? 'baseline-ok' : 'strict-upgrade',
            tier: opts.tier,
            fatalError: err && err.stack ? err.stack : String(err),
          },
          null,
          2,
        ),
      );
    } else {
      console.error('Fatal error:', err && err.stack ? err.stack : err);
    }
    process.exit(1);
  }
})();
