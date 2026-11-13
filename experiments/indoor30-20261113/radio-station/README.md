# KCOM 91.3 — community radio

Cutaway of a live community station. The host sits the open side of a wood broadcast desk, facing two guests, a channel mixer, and a wall news clock. A wood-and-glass partition puts the producer in a control nook, facing the talent through the window, with cue monitors, a talkback mic, and an ON AIR stack beside the door.

This is station operations. It is not the music rehearsal room (no piano, guitar, or amp wall) and not the podcast lounge (no conversation table). The relationship in the shot is host, guests, and the producer behind glass.

Furniture GLBs are referenced from existing scene folders. The desk, mixer, boom mics, news clock, cart rack, cues, and partition are procedural: the baked catalog has no broadcast boom, broadcast mixer, or studio clock.

## Launch

From the repo root, so shared GLBs and the vendored Three.js resolve:

```bash
python3 -m http.server 8788 --bind 127.0.0.1
```

Open http://127.0.0.1:8788/experiments/indoor30-20261113/radio-station/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?clean=1` hides the HUD.

Default shading is a 4-step nearest MeshToonMaterial with hard shadows. Unlit is MeshBasicMaterial. Three.js loads from `music/vendor/` by relative URL. Nothing in this folder copies those files.

## Test

```bash
node --test experiments/indoor30-20261113/radio-station/test/layout.test.mjs experiments/indoor30-20261113/radio-station/test/runtime.test.mjs
```

The runtime test serves the repo root, loads the four cameras in headless Chrome, and writes `shots/`.
