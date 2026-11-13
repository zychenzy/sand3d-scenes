/**
 * Render scenes that have no committed stills.
 * Writes only under experiments/indoor-review-20261113/captured/.
 * Does not modify scene source.
 */
import puppeteer from '/tmp/pw/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'captured');
const BASE = process.env.SCENE_BASE || 'http://127.0.0.1:8765';

const SCENES = [
  ['prior-greenhouse', 'experiments/prior-upgrade-20261110/greenhouse/'],
  ['prior-restaurant', 'experiments/prior-upgrade-20261110/restaurant/'],
  ['sprint-arcade', 'experiments/sprint-20261110/arcade/'],
  ['sprint-architecture-office', 'experiments/sprint-20261110/architecture-office/'],
  ['sprint-archive-room', 'experiments/sprint-20261110/archive-room/'],
  ['sprint-art-studio', 'experiments/sprint-20261110/art-studio/'],
  ['sprint-blackbox-theatre', 'experiments/sprint-20261110/blackbox-theatre/'],
  ['sprint-boardgame-cafe', 'experiments/sprint-20261110/boardgame-cafe/'],
  ['sprint-cafe-atrium', 'experiments/sprint-20261110/cafe-atrium/'],
  ['sprint-ceramics', 'experiments/sprint-20261110/ceramics/'],
  ['sprint-conservatory', 'experiments/sprint-20261110/conservatory/'],
  ['sprint-diner', 'experiments/sprint-20261110/diner/'],
  ['sprint-hotel-lobby', 'experiments/sprint-20261110/hotel-lobby/'],
  ['sprint-makerspace', 'experiments/sprint-20261110/makerspace/'],
  ['sprint-photo-studio', 'experiments/sprint-20261110/photo-studio/'],
  ['sprint-planetarium', 'experiments/sprint-20261110/planetarium/'],
  ['sprint-podcast-lounge', 'experiments/sprint-20261110/podcast-lounge/'],
  ['sprint-ramen-bar', 'experiments/sprint-20261110/ramen-bar/'],
  ['sprint-record-store', 'experiments/sprint-20261110/record-store/'],
  ['sprint-ship-salon', 'experiments/sprint-20261110/ship-salon/'],
  ['sprint-study-loft', 'experiments/sprint-20261110/study-loft/'],
];

const VIEWS = [
  ['toon_default.png', '?hud=0'],
  ['toon_corner.png', '?hud=0&cam=corner'],
  ['toon_close.png', '?hud=0&cam=close'],
  ['unlit_default.png', '?hud=0&mode=unlit'],
];

function round3(v) {
  return v == null ? null : v.map((n) => Math.round(n * 1000) / 1000);
}

const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--hide-scrollbars',
  ],
});

const log = [];
try {
  for (const [slug, rel] of SCENES) {
    const dir = path.join(OUT, slug);
    fs.mkdirSync(dir, { recursive: true });
    const entry = { slug, rel, views: {} };
    for (const [file, query] of VIEWS) {
      const page = await browser.newPage();
      const failed = [];
      const consoleErrors = [];
      page.on('response', (res) => {
        if (res.status() >= 400) failed.push(`${res.status()} ${res.url()}`);
      });
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 300));
      });
      page.on('pageerror', (err) => consoleErrors.push(String(err).slice(0, 300)));
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
      const url = `${BASE}/${rel}${query}`;
      let navError = null;
      try {
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 });
        await page.waitForFunction(
          () => window.__ready === true || (window.__scene && (window.__scene.renderer || window.__scene.ready)),
          { timeout: 20000 },
        ).catch(() => {});
        await new Promise((r) => setTimeout(r, 500));
        await page.evaluate(() => {
          const hud = document.getElementById('hud');
          if (hud) hud.style.display = 'none';
        });
        await new Promise((r) => setTimeout(r, 250));
        const info = await page.evaluate(() => {
          const cam = window.__scene && window.__scene.camera;
          const status = document.getElementById('status');
          return {
            ready: window.__ready === true || !!(window.__scene && (window.__scene.ready || window.__scene.renderer)),
            status: status ? status.textContent : '',
            cam: cam ? [cam.position.x, cam.position.y, cam.position.z] : null,
            failures: window.__scene && window.__scene.failures ? window.__scene.failures : [],
          };
        });
        const dest = path.join(dir, file);
        await page.screenshot({ path: dest, type: 'png' });
        entry.views[file] = {
          url,
          bytes: fs.statSync(dest).size,
          ready: info.ready,
          status: info.status,
          cam: round3(info.cam),
          assetFailures: info.failures,
          http404: failed.slice(0, 12),
          consoleErrors: consoleErrors.slice(0, 8),
        };
        console.log(slug, file, info.ready ? 'ready' : 'NOT-READY', info.status.slice(0, 80), failed.length ? `http ${failed.length}` : '');
      } catch (err) {
        navError = String(err).slice(0, 400);
        entry.views[file] = { url, error: navError, http404: failed.slice(0, 12), consoleErrors: consoleErrors.slice(0, 8) };
        console.log(slug, file, 'ERROR', navError.slice(0, 160));
      }
      await page.close();
    }
    log.push(entry);
  }
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(ROOT, 'capture-log.json'), JSON.stringify(log, null, 2));
console.log('wrote', path.join(ROOT, 'capture-log.json'));
