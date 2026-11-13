# Indoor review · 2026-11-13

Review of the indoor scenes already merged on `main`. This folder does not add venues and does not edit scene directories.

- `PRIOR_INDOOR_FEEDBACK.md` — historical user critique, kept separate from fresh screenshot notes. No invented scores.
- `QA.md` — coverage counts, what was opened, capture results, remaining gaps.
- `gallery.html` — searchable grid of all merged scenes. Scene metadata is embedded. Image paths are relative, so `file://` works without `fetch`.
- `contact-historical.png`, `contact-defaults.png`, `contact-captured.png` — labeled sheets.
- `captured/` — new stills for scenes that had no committed `shots/`. Rendered from the existing pages. HUD hidden. Not copied back into those scene folders.
- `coverage.json` — machine-readable inventory. The gallery does not fetch this file.

Open the gallery from the repo root or by opening `gallery.html` directly:

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8765 --bind 127.0.0.1
```

http://127.0.0.1:8765/experiments/indoor-review-20261113/gallery.html

Root v1, `experiments/prior-upgrade-20261110/`, and `experiments/sprint-20261110/` are different versions. A sprint scene is not an upgrade of a root scene.

The ten new venues are out of scope here. They belong under `experiments/indoor-20261113/` and are not part of this review.
