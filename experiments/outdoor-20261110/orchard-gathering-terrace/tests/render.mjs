import { createServer } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
async function loadChromium() {
  try {
    return (await import('playwright')).chromium;
  } catch {
    return (await import('/home/ubuntu/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs')).chromium;
  }
}
const chromium = await loadChromium();

const sceneDir = fileURLToPath(new URL('..', import.meta.url));
const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const shotsDir = join(sceneDir, 'shots');
const artifactDir = '/opt/cursor/artifacts';
mkdirSync(shotsDir, { recursive: true });
mkdirSync(artifactDir, { recursive: true });

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.glb': 'model/gltf-binary',
  '.png': 'image/png',
  '.css': 'text/css',
};

function startServer() {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let path = normalize(join(repoRoot, decodeURIComponent(url.pathname)));
    if (!path.startsWith(repoRoot)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    if (path.endsWith('/')) path = join(path, 'index.html');
    try {
      const body = readFileSync(path);
      res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' });
      res.end(body);
    } catch (err) {
      console.error('404', url.pathname, path, err.code);
      res.writeHead(404);
      res.end('missing ' + url.pathname);
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const views = [
  { name: 'default', query: 'shot=1', file: 'toon_default.png', artifact: 'orchard-gathering-terrace_default.png' },
  { name: 'corner', query: 'shot=1&cam=corner', file: 'toon_corner.png', artifact: 'orchard-gathering-terrace_corner.png' },
  { name: 'close', query: 'shot=1&cam=close', file: 'toon_close.png', artifact: 'orchard-gathering-terrace_close.png' },
  { name: 'unlit', query: 'shot=1&mode=unlit', file: 'unlit_default.png', artifact: 'orchard-gathering-terrace_unlit.png' },
];

const server = await startServer();
const { port } = server.address();
const base = `http://127.0.0.1:${port}/experiments/outdoor-20261110/orchard-gathering-terrace/`;
const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const results = [];
const errors = [];
page.on('pageerror', (err) => errors.push(String(err)));
page.on('response', (res) => {
  if (res.status() >= 400 && !res.url().endsWith('/favicon.ico')) errors.push(res.status() + ' ' + res.url());
});

try {
  for (const view of views) {
    errors.length = 0;
    await page.goto(base + 'index.html?' + view.query, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
    const state = await page.evaluate(() => ({
      error: window.__error || null,
      audit: window.__audit || null,
      mode: document.getElementById('mode')?.textContent || null,
      stats: window.__frameStats ? window.__frameStats() : null,
    }));
    if (state.error) throw new Error(view.name + ' boot error: ' + state.error);
    if (errors.length) throw new Error(view.name + ' page errors: ' + errors.join('\n'));
    if (!state.audit) throw new Error(view.name + ' missing audit');
    if (state.audit.issues?.length) throw new Error(view.name + ' audit: ' + state.audit.issues.join('; '));
    const stats = state.stats;
    if (!stats || stats.n < 100) throw new Error(view.name + ' empty frame');
    if (stats.mean < 45 || stats.mean > 210) throw new Error(view.name + ' luma ' + stats.mean.toFixed(1));
    if (stats.std < 18) throw new Error(view.name + ' flat frame std ' + stats.std.toFixed(1));
    if (stats.blown > 0.04) throw new Error(view.name + ' blown highlights ' + stats.blown.toFixed(3));
    if (stats.black > 0.12) throw new Error(view.name + ' crushed blacks ' + stats.black.toFixed(3));
    if (view.name === 'unlit' && state.mode !== 'UNLIT') throw new Error('unlit toggle did not apply');
    if (view.name !== 'unlit' && state.mode !== 'TOON') throw new Error(view.name + ' left toon mode');
    const shot = join(shotsDir, view.file);
    const artifact = join(artifactDir, view.artifact);
    await page.screenshot({ path: shot, type: 'png' });
    await page.screenshot({ path: artifact, type: 'png' });
    results.push({
      view: view.name,
      mode: state.mode,
      trees: state.audit.trees,
      meshes: state.audit.meshes,
      issues: state.audit.issues,
      stats: {
        mean: Number(stats.mean.toFixed(1)),
        std: Number(stats.std.toFixed(1)),
        rgb: [stats.r, stats.g, stats.b].map((v) => Number(v.toFixed(1))),
        blown: Number(stats.blown.toFixed(4)),
        black: Number(stats.black.toFixed(4)),
      },
      bytes: statSync(shot).size,
    });
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

writeFileSync(join(shotsDir, 'render-results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
