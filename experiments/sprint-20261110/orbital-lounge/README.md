# Orbital lounge (Three.js + sand3d)

Stylized habitat-module mess. An aft viewport is the focal point. Conversation seats face each other in front of it; a shared table sits to starboard with the galley side left open; personal lockers line the port wall. Practical strips are warm over the two occupied zones, with one cooler wash at the port.

## Open

The page loads shared GLBs and the vendored Three.js build from the repository root. Start the server there:

```bash
cd experiments/sprint-20261110/orbital-lounge
./serve.sh 8788
```

Then open `http://127.0.0.1:8788/experiments/sprint-20261110/orbital-lounge/index.html`

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0`

## Check

```bash
node experiments/sprint-20261110/orbital-lounge/test/layout.test.mjs
```

Run that from the repository root. It checks asset paths, module bounds, and that seats face their tables.
