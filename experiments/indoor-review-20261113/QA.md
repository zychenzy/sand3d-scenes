# QA · indoor review 2026-11-13

This is a coverage and screenshot review of indoor scenes already on `main` (`9c96eae`). It is not a score sheet and not a rebuild. Scene directories outside `experiments/indoor-review-20261113/` were not edited.

The ten new venues are not in this deliverable.

## Inventory

80 scene directories with an `index.html` and scene JS:

| Version | Directories | Where |
| --- | --- | --- |
| Root v1 | 15 | repo root (`cafe/`, `train/`, …) |
| Prior upgrade | 15 | `experiments/prior-upgrade-20261110/` |
| Sprint | 50 | `experiments/sprint-20261110/` |

These are three different generations. A sprint room is not an upgrade of a root room. `prior-upgrade` is the upgrade pass for the original 15.

There is no 59-shot gallery in this checkout that covers all 80. Counting files is not a review of every frame.

### Committed stills, before this review

Canonical names are `shots/toon_default.png`, `shots/toon_corner.png`, `shots/toon_close.png`, `shots/unlit_default.png`.

- **55** scenes already had all four canonical files committed.
- **25** did not.
  - **21** had no `shots/` images at all: prior-upgrade `greenhouse` and `restaurant`, plus sprint `arcade`, `architecture-office`, `archive-room`, `art-studio`, `blackbox-theatre`, `boardgame-cafe`, `cafe-atrium`, `ceramics`, `conservatory`, `diner`, `hotel-lobby`, `makerspace`, `photo-studio`, `planetarium`, `podcast-lounge`, `ramen-bar`, `record-store`, `ship-salon`, `study-loft`.
  - **3** had a full set under other names: prior-upgrade `train` (`train_default.png`, `train_corner.png`, `train_close.png`, `train_unlit.png`), sprint `chocolatier` (`chocolatier_*.png`), sprint `station-lounge` (`station-lounge_toon_*.png` and `station-lounge_unlit_default.png`).
  - Root `cafe/` has default, corner, and unlit under the canonical names. The close frame is `shots/toon_bar_close.png`, not `toon_close.png`.
- A few scenes also have an extra still (`cinema/shots/toon_side.png`, `science-lab/shots/toon_optics.png`). Those extras are not in the four-view gallery.

Across the four views, origins after alias resolution and the new captures:

| Origin | View slots (80 × 4 = 320) |
| --- | --- |
| Committed canonical file | 223 |
| Committed file with a non-canonical name | 13 |
| Captured into this review folder | 84 |
| Still missing | 0 |

“Still missing” means the gallery has a file to show. It does **not** mean the scene folder now contains canonical names. The new PNGs stay in `captured/`.

## What was actually looked at

`PRIOR_INDOOR_FEEDBACK.md` lists every still opened at full size and separates that from the historical user critique. No per-scene grades.

Also checked as sheets, not as a frame-by-frame reading of all 80:

- `contact-historical.png` — root and prior-upgrade toon and unlit for cafe, train, museum, restaurant, ktv, cinema.
- `contact-captured.png` — the 21 default views that had no committed still. Every cell is a rendered room. None of those thumbs is blank.
- `contact-defaults.png` — all 80 default views on one sheet. It was generated so a person can scan. It was not used to write per-scene claims.

Opened from the gallery lightbox, in addition to the file list in the feedback note: root `boardgame` default. The HUD is still on that still. Three tables with chairs.

## Fresh captures

`tools/capture_missing.mjs` loaded each of the 21 scenes from a local server at the repo root (`http://127.0.0.1:8765`), hid `#hud` in the page, and wrote 1440×900 PNGs under `captured/`. Headless Chrome, SwiftShader. The scene source was not modified.

`capture-log.json`:

- 21 scenes × 4 views = 84 files.
- Every view reported the page ready (`window.__ready` or `window.__scene`).
- Status text was the scene’s own “ready” line, not an asset-failure line.
- No GLB failure lists.
- Corner and close cameras differed from the default camera on all 21 (presets exist and applied).
- Unlit stayed on the default camera, which is what `?mode=unlit` is supposed to do.
- The only HTTP 404 was `favicon.ico` on the first greenhouse load. No missing GLB or script response was recorded.

A luminance check flagged only `captured/sprint-arcade/toon_default.png` as low contrast. That frame was opened: it is a dark arcade, not an empty canvas. The unlit arcade frame is brighter and shows the same cabinets.

These captures are evidence the pages render. They are not a layout test and they were not committed back into the scene folders.

## Gallery check

`gallery.html` embeds the scene list. It does not call `fetch`. Relative image paths for all 320 view slots resolve to files on disk.

Opened with Chrome at `file:///…/experiments/indoor-review-20261113/gallery.html`:

- 80 cards.
- No page errors.
- Sampled images loaded (`naturalWidth` 1280–1680), including a root shot, a prior-upgrade shot, and `captured/prior-greenhouse/toon_default.png`.
- Clicking a card opened the large view. The enlarged boardgame image was 1280 px wide.
- The close-up control is labeled “Close-up” so it is not the dialog’s Close button.

Screenshot of that pass: `/opt/cursor/artifacts/indoor-review-gallery-top.png` (lightbox open on the first card).

## Observations that should drive a later edit

Copied here only as actions. The visual basis is in `PRIOR_INDOOR_FEEDBACK.md`.

1. Many committed stills, especially root v1, include the HUD. Hide it before the next capture (`?hud=0`, or hide `#hud` the way this review’s capture did). Diner’s runtime does not read `hud=0`; other scenes do.
2. Keep an unlit frame next to toon. On the rooms opened here, unlit is what shows table legs, seat fronts, and bench shape. Toon speckle on several GLBs hides that.
3. Root train and prior-upgrade train still show small four-legged tables between the booths. The historical note asked for a long pedestal or wall-mounted table. Also rename the prior train files to the canonical four names.
4. Root KTV and the prior KTV unlit still do not show a side sofa whose length matches the table. Worth a measured check, not another eye guess.
5. Root cafe’s menu board is stripes. The prior Pike House stills already have a readable board, case, and syrups. Root `toon_close.png` is still absent; `toon_bar_close.png` is the stand-in.
6. Prior restaurant and prior greenhouse had no committed stills. The captures show a zoned dining room and a planted greenhouse. Those PNGs are not inside the scene folders, so a clone of `main` without this review folder still has a hole there.

## What this pass did not verify

- Walkway width, chair-to-table distance, and collisions were not measured.
- Corner and close frames were captured for the 21 missing scenes and are in the gallery. They were not each described.
- Most sprint scenes that already had committed stills were not opened at full size. Bakery, textile studio, jewelry workshop, dining car, squash, and the screening-room unlit frame were.
- No old scene was rebuilt. Nothing was merged or deployed. Outdoor branches were not touched.
- No new venue was added under `experiments/indoor-20261113/`.

## How to regenerate

```bash
# from the repo root, only if you need to re-render the 21 missing scenes
python3 -m http.server 8765 --bind 127.0.0.1
node experiments/indoor-review-20261113/tools/capture_missing.mjs
python3 experiments/indoor-review-20261113/tools/build_review.py
```

`build_review.py` rewrites `gallery.html`, the contact sheets, `coverage.json`, and the artifact bundle. It does not write into other scene folders.
