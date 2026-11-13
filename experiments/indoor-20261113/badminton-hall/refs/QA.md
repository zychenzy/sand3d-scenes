# QA — Shuttle Hall

Checked on the scene as committed. The server root is the repository, not this folder.

## Layout and assets

`node --test test_court_spec.mjs test_layout.mjs` — 9 passed, 0 failed.

The court test checks the BWF outside-edge markings, the unmarked net line, the 1.55 / 1.524 m cable, posts standing outside the doubles sideline, the 670 × 230 mm racket limit, the 2.0 m run-offs, the 9.05 m clear height, and battens at least 0.75 m off every sideline and clear of the trusses.

The layout test resolves every GLB and `gym/vendor/three.module.js` from this directory, requires the paths to start with `../../../` and to live outside this folder, and checks that furniture footprints stay out of the legal run-off and on the gallery side of x = −9.10. Floor labels are allowed in the back run-off and are rejected if they overlap a court. The chair sits east of the desk and faces it.

## Render

Headless Chrome (SwiftShader / WebGL) against `python3 -m http.server` on the repository root. 1680×1050, HUD hidden with `?shot=1`. Each frame waited for `window.__ready`.

| Frame | What it has to show |
| --- | --- |
| `shots/toon_default.png` | Both doubles courts, both labels, both nets, timber run-off, gallery, trusses, aisle battens, dado. Hard toon, truss shadows on the floor. |
| `shots/toon_corner.png` | Gallery from the south cut: open door, desk and chair, green lamp, warm pendants, colonnade, court 1 net. |
| `shots/toon_close.png` | West post on the sideline with the base outside the court, 760 mm net with a clear gap under the mesh, service lines, a shuttle on the mat, rackets and the shuttle case behind. |
| `shots/unlit_default.png` | Same camera as the default, `MeshBasicMaterial`. No shadows. Battens, pendants, and the desk lamp stay bright. |

Console: no errors and no exceptions on any of the four loads. Network: `three.module.js`, OrbitControls, GLTFLoader, `layout.json`, and all eight GLBs returned 200. `favicon.ico` 404 is the browser, not the scene.

The first default framing cut court 2 off the right edge, and the darkest toon step turned shadowed mats into near-black. The camera was pulled back so both near baselines sit in frame, the gradient floor was lifted off zero, and a west fill was added so the east wall's dado survives the shade. The close camera was raised until the gap under the net is obvious.

## Still true after those fixes

The east wall is the quiet plane of the hall. The dado is there, and it is still a large flat surface. The 26 mm sag reads in the close frame as the tape falling away from the post; from the hall camera it is a nearly level white band, which is what 26 mm looks like at that distance.

## Refinement after the still review

Same cameras. The south wall now sits behind the default camera and the black cut skirt is gone. The bottom of `toon_default.png` and `unlit_default.png` is timber, not the clear colour. A paneled roof deck closes the truss grid; the unlit ceiling samples as the deck greens (`#c5d5cb` and its neighbours), not the clear colour. Tall walls no longer receive the key shadow, so the four truss arrows on the left wall are gone, and the mats still take the floor shadow. The close camera skips truss and net casting: a horizontal sample across the close mat is one green band (two sharp steps, the lines), and the shuttle, tape, and gap under the mesh stay in frame. The east wall has four canvas pads and a small notice. The bookcase is green with a SHUTTLES header and tubes; the board face is a two-court score and the easel feet are hidden. The west door opens into a vestibule. Console stayed empty and the eight GLBs plus `three.module.js` still returned 200. Layout tests: 9 passed.
