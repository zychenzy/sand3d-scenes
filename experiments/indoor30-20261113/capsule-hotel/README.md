# Koya sleeping floor

A narrow capsule-hotel corridor: four bays of two-high sleeping pods on one wall, a luggage-locker bank on the other, and a small grooming vanity at the far end. It is a sleeping floor, not a lobby and not a train.

Pods have rounded openings, a mix of open, half-drawn, and closed curtains, visible bedding on the open berths, a reading lamp in each pod, and a short ladder at each bay. Shared GLBs and the vendored Three.js runtime are root paths. Nothing in `cafe/` or `vendor/` is copied or edited.

## Open

Serve the repository root so the relative GLB and Three.js paths resolve:

```bash
python3 -m http.server 8874 --bind 127.0.0.1
```

http://127.0.0.1:8874/experiments/indoor30-20261113/capsule-hotel/

`T` toon (default, hard 4-step gradient, hard shadows) · `U` unlit (`MeshBasicMaterial`) · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?cam=detail` · `?hud=0` hides the label.

Shots in `shots/`: `toon_default.png`, `toon_corner.png`, `toon_close.png`, `toon_detail.png`, `unlit_default.png`. Close and detail share the berth camera.

## Check

```bash
node --test experiments/indoor30-20261113/capsule-hotel/test/scene.test.mjs
```

The test checks pod and ladder dimensions, the clear walking path, asset loads (shared paths stay outside this folder; baked GLBs stay small), and a headless browser pass for runtime errors, toon default, real unlit, and a frame that is not crushed black.
