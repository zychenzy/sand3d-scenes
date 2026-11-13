# Linden Veterinary — reception and waiting

Cutaway reception for a small animal clinic: a staffed desk with a lower accessible writing shelf, a sight-screened cat alcove with carrier perches, a dog bench and chairs around a low table, a walk-on scale, and a glimpse into Exam 1. No animals are in the room. Toon-hard Three.js, four-step gradient, hard shadows, and a real unlit mode.

Shared GLBs and the vendored Three.js r170 build are root references into `cafe/`, `museum/`, `library/`, `ktv/`, and `cowork/`. This folder does not copy them.

## Open

Serve the repository root so those references resolve:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

http://127.0.0.1:8765/experiments/indoor30-20261113/vet-clinic/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=detail` (same as `?cam=close`) · `?hud=0` hides the label.

```bash
python3 tests/check_layout.py
node render_shots.mjs http://127.0.0.1:8765/experiments/indoor30-20261113/vet-clinic shots
```

Shots in `shots/`: `toon_default.png`, `toon_corner.png`, `toon_detail.png`, `unlit_default.png`.
