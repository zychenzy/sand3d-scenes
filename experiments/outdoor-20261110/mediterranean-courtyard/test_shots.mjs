import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const port = 8877;
const base = `http://127.0.0.1:${port}/experiments/outdoor-20261110/mediterranean-courtyard/`;
const shots = path.join(here, 'shots');
const artifacts = '/opt/cursor/artifacts';

async function loadChromium() {
  try {
    return (await import('playwright-core')).chromium;
  } catch { /* resolve a local npx cache of playwright-core */ }
  const npx = '/home/ubuntu/.npm/_npx';
  if (fs.existsSync(npx)) {
    for (const hash of fs.readdirSync(npx)) {
      const entry = path.join(npx, hash, 'node_modules/playwright-core/index.mjs');
      if (fs.existsSync(entry)) return (await import(entry)).chromium;
    }
  }
  throw new Error('playwright-core is not installed');
}

const chromium = await loadChromium();

function waitForServer() {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = async () => {
      try {
        const res = await fetch(base);
        if (res.ok) return resolve();
      } catch { /* not up yet */ }
      if (Date.now() - started > 8000) return reject(new Error('http server did not start'));
      setTimeout(tick, 150);
    };
    tick();
  });
}

function sampleStats(page) {
  return page.evaluate(() => {
    const c = document.getElementById('c');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    const w = c.width;
    const h = c.height;
    const pix = new Uint8Array(4);
    let sum = 0;
    let sum2 = 0;
    let count = 0;
    let warm = 0;
    let green = 0;
    for (let y = 12; y < h - 8; y += 28) {
      for (let x = 12; x < w - 8; x += 28) {
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pix);
        const lum = 0.3 * pix[0] + 0.59 * pix[1] + 0.11 * pix[2];
        sum += lum;
        sum2 += lum * lum;
        count += 1;
        if (pix[0] > pix[1] + 12 && pix[0] > 110) warm += 1;
        if (pix[1] > pix[0] + 6 && pix[1] > 60) green += 1;
      }
    }
    const row = new Uint8Array(w * 4);
    gl.readPixels(0, h - 6, w, 1, gl.RGBA, gl.UNSIGNED_BYTE, row);
    let tr = 0;
    let tg = 0;
    let tb = 0;
    let n = 0;
    for (let x = Math.floor(w * 0.35); x < Math.floor(w * 0.65); x += 6) {
      tr += row[x * 4];
      tg += row[x * 4 + 1];
      tb += row[x * 4 + 2];
      n += 1;
    }
    const mean = sum / count;
    const variance = sum2 / count - mean * mean;
    return {
      mean,
      variance,
      warm,
      green,
      count,
      top: { r: tr / n, g: tg / n, b: tb / n },
      w,
      h,
    };
  });
}

function sceneAudit(page) {
  return page.evaluate(() => {
    const api = window.__scene;
    const missing = [];
    const floating = [];
    for (const inst of api.layout.instances) {
      const obj = api.scene.getObjectByName(inst.id);
      if (!obj) {
        missing.push(inst.id);
        continue;
      }
      let minY = Infinity;
      obj.updateWorldMatrix(true, true);
      obj.traverse((o) => {
        if (!o.isMesh || !o.geometry) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        const bb = o.geometry.boundingBox;
        const e = o.matrixWorld.elements;
        for (const x of [bb.min.x, bb.max.x]) {
          for (const y of [bb.min.y, bb.max.y]) {
            for (const z of [bb.min.z, bb.max.z]) {
              const wy = e[1] * x + e[5] * y + e[9] * z + e[13];
              if (wy < minY) minY = wy;
            }
          }
        }
      });
      if (Math.abs(minY - inst.position[1]) > 0.05) {
        floating.push({ id: inst.id, minY, expected: inst.position[1] });
      }
    }
    return {
      openSky: api.openSky,
      checks: api.checks,
      missing,
      floating,
      status: document.getElementById('status').textContent,
    };
  });
}

const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
  cwd: root,
  stdio: 'ignore',
});

const fails = [];
function check(ok, msg, extra) {
  if (!ok) {
    fails.push(msg + (extra ? ` ${JSON.stringify(extra)}` : ''));
    console.log('FAIL', msg, extra || '');
  } else {
    console.log('ok  ', msg);
  }
}

try {
  await waitForServer();
  fs.mkdirSync(shots, { recursive: true });
  fs.mkdirSync(artifacts, { recursive: true });
  const executablePath = [
    process.env.CHROME_PATH,
    '/opt/google/chrome/chrome',
    '/usr/bin/google-chrome-stable',
  ].find((p) => p && fs.existsSync(p) && fs.statSync(p).isFile());
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('response', (res) => {
    const url = res.url();
    if (res.status() >= 400 && !/favicon/i.test(url)) errors.push(`${res.status()} ${url}`);
  });

  const views = [
    ['default', '?shot=1', 'mediterranean-courtyard_default.png'],
    ['corner', '?shot=1&cam=corner', 'mediterranean-courtyard_corner.png'],
    ['close', '?shot=1&cam=close', 'mediterranean-courtyard_close.png'],
    ['unlit', '?shot=1&mode=unlit', 'mediterranean-courtyard_unlit.png'],
  ];

  for (const [name, query, file] of views) {
    await page.goto(base + query, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => (document.getElementById('status')?.textContent || '').startsWith('ready'),
      { timeout: 30000 },
    );
    await page.waitForTimeout(500);
    if (name === 'default') {
      const audit = await sceneAudit(page);
      console.log(JSON.stringify(audit.checks, null, 2));
      check(audit.openSky === true, 'runtime openSky flag');
      check(audit.missing.length === 0, 'all instances loaded', audit.missing);
      check(audit.floating.length === 0, 'props sit on their support', audit.floating);
      check(audit.checks.every((c) => c.ok), 'sky rays', audit.checks);
    }
    const stats = await sampleStats(page);
    console.log(name, JSON.stringify(stats));
    check(stats.variance > 180, `${name} image is not flat`, { variance: stats.variance });
    check(stats.mean > 50 && stats.mean < 230, `${name} exposure`, { mean: stats.mean });
    check(stats.warm > 4, `${name} has warm masonry`, { warm: stats.warm });
    if (name !== 'close') check(stats.green > 2, `${name} has foliage`, { green: stats.green });
    if (name !== 'close') {
      check(stats.top.b > 90 && stats.top.g > 80, `${name} top of frame is sky`, stats.top);
    }
    const dest = path.join(shots, `toon_${name}.png`);
    const art = path.join(artifacts, file);
    await page.screenshot({ path: dest });
    fs.copyFileSync(dest, art);
    console.log('shot', dest);
  }

  const realErrors = errors.filter((e) => !/favicon|net::ERR_BLOCKED_BY_CLIENT/i.test(e));
  check(realErrors.length === 0, 'no page errors', realErrors);
  await browser.close();
} finally {
  server.kill('SIGTERM');
}

if (fails.length) {
  console.error(`\n${fails.length} runtime check(s) failed`);
  process.exit(1);
}
console.log('\nruntime checks passed');
