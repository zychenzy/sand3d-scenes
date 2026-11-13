import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const scene = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(scene, "../../..");
const port = 8796;
const cdp = 9346;
const shots = [
  ["toon_default", ""],
  ["toon_corner", "cam=corner"],
  ["toon_close", "cam=close"],
  ["unlit_default", "mode=unlit"],
];

function start(cmd, args, cwd) {
  const child = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  child.stdout.on("data", (d) => {
    log += d;
  });
  child.stderr.on("data", (d) => {
    log += d;
  });
  child.log = () => log;
  return child;
}

async function waitJson(url) {
  for (let i = 0; i < 50; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {
      /* booting */
    }
    await sleep(150);
  }
  throw new Error("not ready " + url);
}

function cdpClient(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const opened = new Promise((ok, reject) => {
    ws.addEventListener("open", ok);
    ws.addEventListener("error", () => reject(new Error("cdp socket")));
  });
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });
  async function send(method, params = {}) {
    await opened;
    const msgId = ++id;
    ws.send(JSON.stringify({ id: msgId, method, params }));
    const msg = await new Promise((done) => pending.set(msgId, done));
    if (msg.error) throw new Error(method + " " + JSON.stringify(msg.error));
    return msg.result;
  }
  return { send, ws };
}

async function main() {
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  mkdirSync(resolve(scene, "shots"), { recursive: true });
  const server = start("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], repo);
  const chrome = start("google-chrome", [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--use-angle=swiftshader",
    "--enable-webgl",
    "--ignore-gpu-blocklist",
    `--remote-debugging-port=${cdp}`,
    "--user-data-dir=/tmp/darts-club-chrome",
    "--window-size=1440,900",
    "about:blank",
  ], repo);

  try {
    await waitJson(`http://127.0.0.1:${port}/experiments/indoor30-20261113/darts-club/layout.json`);
    const ver = await waitJson(`http://127.0.0.1:${cdp}/json/version`);
    const browser = cdpClient(ver.webSocketDebuggerUrl);
    const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });
    let page = null;
    for (let i = 0; i < 30 && !page; i += 1) {
      const pages = await (await fetch(`http://127.0.0.1:${cdp}/json`)).json();
      page = pages.find((item) => item.id === targetId && item.webSocketDebuggerUrl);
      if (!page) await sleep(100);
    }
    if (!page) throw new Error("missing page target");
    const client = cdpClient(page.webSocketDebuggerUrl);
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const base = `http://127.0.0.1:${port}/experiments/indoor30-20261113/darts-club/`;
    for (const [name, query] of shots) {
      const url = `${base}?hud=0&shot=1${query ? "&" + query : ""}`;
      await client.send("Page.navigate", { url });
      let info = null;
      for (let i = 0; i < 50; i += 1) {
        await sleep(250);
        const evaled = await client.send("Runtime.evaluate", {
          expression: `(() => ({ title: document.title, status: document.getElementById('status')?.textContent || '', errors: window.__errors || [], ready: !!(window.__scene && window.__scene.ready), mode: document.getElementById('mode')?.textContent || '' }))()`,
          returnByValue: true,
        });
        info = evaled.result?.value;
        if (info?.title === "SHOT_READY" || (info?.errors && info.errors.length)) break;
      }
      if (info?.errors?.length) throw new Error(name + " errors " + info.errors.join("\n"));
      if (info?.title !== "SHOT_READY" || !info?.ready) {
        throw new Error(name + " not ready " + JSON.stringify(info));
      }
      if (name.startsWith("unlit") && info.mode !== "UNLIT") {
        throw new Error(name + " stayed in " + info.mode);
      }
      if (!name.startsWith("unlit") && info.mode !== "TOON") {
        throw new Error(name + " mode " + info.mode);
      }
      const shot = await client.send("Page.captureScreenshot", { format: "png" });
      const buf = Buffer.from(shot.data, "base64");
      writeFileSync(`/opt/cursor/artifacts/darts-club_${name}.png`, buf);
      writeFileSync(resolve(scene, "shots", `${name}.png`), buf);
      console.log(name, buf.length, info.status, info.mode);
    }
    client.ws.close();
    browser.ws.close();
  } finally {
    chrome.kill("SIGKILL");
    server.kill("SIGKILL");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
