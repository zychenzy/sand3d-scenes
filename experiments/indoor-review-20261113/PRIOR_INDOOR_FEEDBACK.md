# Prior indoor feedback

This file separates two different kinds of notes.

1. **Historical user feedback** — critique Z already gave. It is preserved below in their terms. It is **not** a scored review, and it does **not** mean a complete old review of all 80 merged scenes survives in this repo. No per-scene grades are invented here.
2. **Fresh observations** — what this review actually opened on 2026-11-13 from screenshots on current `main` (`9c96eae`). If a scene is not in the opened list, this file does not claim it was looked at.

No outdoor scenes were edited. No old scene was rebuilt. The ten new venues requested earlier are **not** part of this deliverable; they are assigned to other agents under `experiments/indoor-20261113/`.

## Historical user feedback

Preserved as given. This is a real critique of indoor work that had been seen, not a full pass over every version.

- Overall scenes were too crude, too sparse, and too monotonous.
- Shading and rendering were not sufficient.
- Improve complexity and design. Do not merely add more objects under the same shader.
- Check functional orientation, table and chair proportions, and walkways.
- **Cafe:** Starbucks-like coffee machine, cups, small round tables, and simple chairs. No sofas. Richer menu, POS, cup tower, syrup, and display details. Warm wood and green.
- **Train:** long tables with a central pedestal or a wall mount. Not small squares and not four-legged tables.
- **Museum:** long benches, not sofas. Correct bench rotation.
- **Restaurant:** no screens or partitions. Larger tables, more chairs. Unify the seating, or zone it. Repeating back-to-back booths are acceptable.
- **KTV:** three-sided sofas that actually face a low, long, generous table. Align the table’s length and width with the sofa length.
- **Cinema:** every seat’s actual front faces the screen.
- Geometry critique should include **Unlit** form views, not only toon stills.

There is no surviving score sheet in this checkout that rates all 80 scenes. Counts of files are in `QA.md`. They are coverage, not grades.

## What was opened

Committed stills opened for this note:

| Version | Scene | Files opened |
| --- | --- | --- |
| Root v1 | `cafe/` | `shots/toon_default.png`, `shots/toon_bar_close.png` |
| Root v1 | `boardgame/` | `shots/toon_default.png` (opened from the review gallery, not as a separate file read) |
| Root v1 | `train/` | `shots/toon_default.png`, `shots/unlit_default.png` |
| Root v1 | `restaurant/` | `shots/toon_default.png`, `shots/unlit_default.png` |
| Root v1 | `museum/` | `shots/toon_default.png`, `shots/unlit_default.png` |
| Root v1 | `ktv/` | `shots/toon_default.png`, `shots/unlit_default.png` |
| Root v1 | `cinema/` | `shots/toon_default.png`, `shots/unlit_default.png` |
| Root v1 | `library/` | `shots/toon_default.png`, `shots/unlit_default.png` |
| Root v1 | `cowork/` | `shots/toon_default.png` |
| Root v1 | `lounge/` | `shots/toon_default.png`, `shots/unlit_default.png` |
| Root v1 | `gym/` | `shots/unlit_default.png` |
| Root v1 | `workshop/` | `shots/toon_default.png` |
| Root v1 | `greenhouse/` | `shots/toon_default.png` |
| Prior upgrade | `experiments/prior-upgrade-20261110/cafe/` | `shots/toon_default.png`, `shots/unlit_default.png` |
| Prior upgrade | `experiments/prior-upgrade-20261110/train/` | `shots/train_default.png`, `shots/train_unlit.png` (not the canonical `toon_*` names) |
| Prior upgrade | `experiments/prior-upgrade-20261110/museum/` | `shots/toon_default.png` |
| Prior upgrade | `experiments/prior-upgrade-20261110/ktv/` | `shots/toon_default.png`, `shots/unlit_default.png` |
| Prior upgrade | `experiments/prior-upgrade-20261110/cinema/` | `shots/toon_default.png` |
| Prior upgrade | `experiments/prior-upgrade-20261110/library/` | `shots/toon_default.png` |
| Sprint | `experiments/sprint-20261110/bakery/` | `shots/toon_default.png` |
| Sprint | `experiments/sprint-20261110/textile-studio/` | `shots/toon_default.png` |
| Sprint | `experiments/sprint-20261110/jewelry-workshop/` | `shots/toon_default.png` |
| Sprint | `experiments/sprint-20261110/dining-car/` | `shots/toon_default.png` |
| Sprint | `experiments/sprint-20261110/squash-court/` | `shots/toon_default.png` |
| Sprint | `experiments/sprint-20261110/screening-room/` | `shots/unlit_default.png` |

Also opened after a fresh headless render into this review folder (these scenes had **no** committed `shots/`):

- `experiments/prior-upgrade-20261110/greenhouse/` — `captured/prior-greenhouse/toon_default.png`, `captured/prior-greenhouse/unlit_default.png`
- `experiments/prior-upgrade-20261110/restaurant/` — `captured/prior-restaurant/toon_default.png`, `captured/prior-restaurant/unlit_default.png`
- `experiments/sprint-20261110/arcade/` — `captured/sprint-arcade/toon_default.png`, `captured/sprint-arcade/unlit_default.png`
- `experiments/sprint-20261110/architecture-office/` — `captured/sprint-architecture-office/toon_default.png`
- `experiments/sprint-20261110/blackbox-theatre/` — `captured/sprint-blackbox-theatre/unlit_default.png`

Not opened as pictures, even when the files exist: root `boardgame`, `music`, `stretch-studio`; most prior-upgrade stills other than the rows above; most sprint stills other than the six named. Those scenes are in the gallery and on the contact sheet so they can be scanned, but they are not described below as if they had been inspected one by one.

Corner and close frames were not the focus of this pass, except the cafe bar close. A full four-view reading of all 80 scenes was not done.

## Fresh observations

### Patterns that show up in the opened root v1 stills

- The HUD (title, Toon/Unlit buttons, status line) sits on the picture in the root stills that were opened: cafe, train, restaurant, museum, ktv, cinema, library, cowork, lounge, gym, workshop, greenhouse. It covers the upper-left of the room. Later stills that were opened without a HUD (prior cafe, prior train, sprint bakery, sprint dining-car, and the new greenhouse capture) are much easier to judge.
- Toon shading on several root rooms is a hard light/dark split plus a noisy speckle on GLB surfaces (ktv sofas, cinema seat backs, lounge sofa, restaurant booths). Unlit views of the same rooms drop that noise and show the mass more clearly. The shader is not doing much beyond one directional step and the mesh’s own texture.
- Floors in the opened root rooms are often one flat material (library planks, restaurant beige, museum grey boards, workshop grey). The prior cafe and the sprint bakery are the contrast: the floor pattern is part of how you read the room.
- Walkways are usually present in these cutaways because the rooms are not full. That is not the same as a checked clearance. This review did not measure aisle widths.

### Cafe

Root `cafe/` toon default: small round tables, simple metal chairs, no sofas, an espresso machine, bottles, and a pastry case. That matches the requested furniture type. The menu board behind the bar reads as horizontal stripes, not a readable menu. The counter is one large grey block. Wood floor is a single plank color. Warm green shows up as a rug and a wainscot, not as a full material scheme. The bar close (`toon_bar_close.png`) shows the machine, a row of bottles, a register, and the case; there is no obvious cup tower. There is no file named `toon_close.png`.

Prior-upgrade Pike House, toon and unlit: round tables and metal chairs remain, still no sofas. The unlit frame keeps a readable “PIKE HOUSE” board with coffee and tea lines, a pastry case, syrup bottles, a queue rope, green task lamps, and a greener bar front. The counter is no longer only a grey block. This is the opened frame that comes closest to the cafe note. Chairs sit around the tables; one chair in the foreground sits pulled out into the queue side rather than tucked to a top. HUD is not on these two stills.

### Train

Root toon and unlit: a long cutaway coach, facing booths, mugs, and a side aisle. The tables between the booths are small and show four legs in the unlit frame. That is the arrangement the historical note rejected. The unlit frame is useful: seat blocks, table tops, and legs stay readable, and the window band is clearer than in toon. HUD is on both.

Prior-upgrade `train_default.png` and `train_unlit.png`: luggage rack, a service counter at the near end, and more of the coach shell. The bay tables still read as four-legged tops between the benches, including in unlit. The historical request for a long pedestal or wall-mounted table is **not** met in the stills that were opened. These files do not use the canonical `toon_default.png` / `unlit_default.png` names, so a gallery that only looks for those names reports this upgrade as missing.

Sprint `dining-car` toon default (one frame): a more specific car, with a galley, set tables, and no HUD in that still. Leg type was not clear enough in that one oblique to call the tables pedestal or four-legged.

### Museum

Root toon and unlit: two long slab benches in the aisle, not sofas. Unlit shows the X-shaped legs and that both benches run the same way, parallel to each other and to the picture wall. That matches “long benches” better than a sofa plan. The pictures are flat color rectangles. One white support is a tall column; the other plinth is much shorter, with a small brown object. A large brown case sits at the right. The room is sparse, and the toon ceiling shadow hides the track lights that unlit shows. HUD is on both.

Prior-upgrade North Hall toon default: stone floor, framed pictures with actual shapes, vitrines, sculpture, skylight, and two long pale benches in the aisle facing the picture wall. No sofas in that frame. This is a real step in design, not just more copies of the root plinth. Some dark branching marks on the stone walls read as clutter rather than architecture. Unlit for this upgrade was not opened in this pass. HUD is not described on that still.

### Restaurant

Root toon and unlit: two zones. Repeating maroon booths on the left, and larger dark rectangular tables with several wooden chairs on the right. No freestanding screens or partitions cross the room in these two frames. A black slatted panel is on the back wall, not in the aisle. Chair count around the loose tables is higher than a two-top. Some chairs on the right table sit tight to the top and to each other. The unlit frame makes the booth-versus-chair split obvious and shows the floor as one beige plane. HUD is on both.

Prior-upgrade Hinoki had no committed stills. The capture made for this review (HUD hidden) shows the same zoning idea carried further: repeating booths on the left, three longer set tables with many chairs on the right, a bar along the back, and a red floor runner that is not a screen. Unlit shows the long tables clearly; their supports read as a central structure with feet, not as a room full of small squares. A few chairs sit very close to the table edge. Wall slats stay on the wall. This capture is not a substitute for a still committed inside the restaurant folder, but it is a real picture of the merged upgrade.

### KTV

Root toon and unlit: three light sofas around a low wood table, a rug, and a large dark screen. The long sofa and the table do not share a length: the table stops short of the long sofa’s outer end, and the right-hand sofa is a shorter block that does not run the table’s side. Unlit makes that mismatch easier to see than the crushed magenta toon. The screen is almost a black rectangle. Mugs sit on the table. HUD is on both.

Prior-upgrade toon and unlit: a longer low table with cups, mics, and a booklet; a screen that shows “ROOM 12 / next up”; pendants and ceiling slots. The three seating sides are still there. In unlit, the right-hand seat reads as a partial return, not a sofa whose length matches the table. The near sofa is large in the foreground and is cut by the frame, so its full length versus the table was not measurable from these two stills. Lighting is still dark, but the screen content keeps the room from reading as an empty black box. HUD was not on the opened prior stills.

### Cinema

Root toon and unlit: rows of theatre seats whose fronts point at the screen. The unlit frame is the right check for this note, and the seats that are visible do face the screen. Aisles are the gaps between the blocks. Seat backs carry a heavy speckle in toon that disappears in unlit, so the toon texture is fighting the form. The screen is a blank grey field. HUD is on both. A tiny green speck sits on the left wall in both frames.

Prior-upgrade toon default: seats still face a screen, now with a picture on it, a center aisle with rails, and a side counter. The opened frame matches the facing note. HUD is still in the corner. Unlit for this upgrade was not opened.

Sprint screening-room unlit: seat fronts face a framed night picture. No HUD in that still. Form is readable. This is another cinema-type room, not a replacement of the root cinema.

### Other opened root rooms

- **Library** toon and unlit: two long communal tables, not small squares, with chairs along the sides and a clear aisle between the tables. Stacks are repeated white cases. Unlit is calm and readable. HUD covers the corner. Proportions of the tables look usable; this review did not count every chair against a place setting.
- **Cowork** toon only: several desks with monitors and chairs, plus a board on the right wall. The board reads as a brown slab more than a written surface. Monitors are bright green slabs. HUD is on. Unlit was not opened, so facing of each chair was not checked in a form view.
- **Lounge** toon and unlit: one pool table, one sofa to the side, a cue rack. The sofa does not sit along the long side of the table; it sits off the short side, so “facing the cloth” is only partly true in this camera. Large empty floor. Unlit turns the sofa into a grey block and shows the rack as stripes. HUD on. Toon adds speckle on the sofa.
- **Gym** unlit only: three bags in a row, two long benches in front of them, a grey block on the left wall that does not read as a machine, and a pale window. The benches are the same X-leg slab as the museum. There is space to walk. The room is thin. HUD on.
- **Workshop** toon only: one square four-leg table with chairs, three easels, a stove. Readable as a studio, sparse, flat floor. HUD on.
- **Greenhouse** root toon: glass box, repeated pot plants, two X-leg benches, a center path. Several plants are blocky stacks. HUD on.
- **Boardgame** root toon, seen in the review gallery: three square tables with chairs, a small rug, and the same HUD block in the corner. Unlit was not opened.

### Other opened upgrades and sprint rooms

- **Prior library** toon: stacks to the ceiling, long tables, lamps, a side desk, rugs. Much more specific than the root library. Chairs line the tables. HUD is still on this still. Unlit was not opened.
- **Prior greenhouse** capture (no committed shots before this review): brick beds, a potting bench with a stool, a round table and a chair, benches, a glass roof, and a paved path. Denser and more specific than the root greenhouse. The unlit capture keeps that layout readable: the stool sits at the bench, the chair sits by the round table, and the paver path is open. HUD was hidden for the capture. One HTTP error was logged on the first load; the picture itself rendered. Corner and close of this capture are in the gallery and were not separately described here.
- **Bakery** toon: zoned counter, case, window tables, tiled floor, signage, and no HUD in the opened still. This is the clearest opened example of design (floor, sign, equipment) rather than “more objects, same shader.”
- **Textile studio** toon: looms, sewing machines, bolt racks, an ironing board, windows. Specific to cloth work. No HUD in that still.
- **Jewelry workshop** toon: display counter, work benches, tool boards. Specific, and not the same room as the textile studio. No HUD in that still.
- **Squash** toon: a marked court behind glass, a bench outside, a named sign. The bench is outside the court, which is the right place. HUD is on that still.
- **Screening room** unlit: covered under cinema above.
- **Arcade** capture, toon and unlit: a row of cabinets facing the floor, a cocktail table, and a token counter. The center floor is open. Unlit keeps the cabinet colors, so the form is not only the neon. This scene had no committed stills.
- **Architecture office** capture, toon: drafting tables, a model table with stools, shelves, and pinned drawings. It reads as a studio rather than a cafe with extra desks. Stools sit at the model table; chairs sit at the drafting desks. This review did not measure every chair’s facing vector.
- **Blackbox** capture, unlit: seat fronts point at the curtained stage. That is the same facing check as the cinema note, on a different room. An aisle is visible. No committed stills existed before this capture.

## Actionable notes for a later pass

These are observations, not a rebuild, and not a claim that unopened scenes are fine or broken.

1. Hide the HUD in every committed still (`?hud=0` or the scene’s shot flag). It currently hides the corner of many root and some upgrade frames.
2. Keep publishing the unlit frame next to toon. On the rooms opened here, unlit is what shows legs, seat fronts, and bench shape. Toon speckle on GLBs hides that.
3. Train bays on both the root coach and the prior-upgrade coach still show small four-legged tables. A later edit should replace those tops with a long pedestal or wall-mounted table per bay. Also rename `train_*.png` to `toon_default.png`, `toon_corner.png`, `toon_close.png`, and `unlit_default.png`.
4. KTV, root and prior: check the right-hand sofa against the table length in a measured layout, not only by eye. The opened unlit frames do not show a full-length side sofa matched to the table.
5. Root cafe menu is non-text. The prior cafe stills already show a readable board, case, and syrups; the root package does not.
6. Root museum benches are long and consistent; the picture wall and the mismatched plinth heights are the thin part. The prior North Hall still is the better design reference.
7. Prior-upgrade greenhouse, prior-upgrade restaurant, and 19 sprint scenes had no committed stills at the start of this review (21 scenes). Do not treat a missing `shots/` folder as a passed review. This review captured all four views for those 21 into `captured/` (84 files, all reported ready). They are not retroactive commits inside the scene folders. Details are in `QA.md`.
8. Do not describe a contact sheet or an old “59 shot” gallery as coverage of all 80 merged scenes. This checkout has 80 scene directories. Canonical four-file sets are counted in `QA.md`.

## What this review did not do

- It did not assign scores.
- It did not re-open every corner and close frame.
- It did not rebuild lighting, layout, or meshes.
- It did not merge or deploy.
- It did not start the ten new venues.
