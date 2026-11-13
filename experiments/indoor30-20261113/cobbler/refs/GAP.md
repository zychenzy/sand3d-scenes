# GAP — cobbler workshop

## Candidates inspected

Local bakes are the offline HF set this scene can load. Bounds are the raw GLB AABB (Y-up). Limits are why each one was kept or left out.

| Candidate | Raw size (X, Y, Z) | Decision |
| --- | --- | --- |
| Dining chair `5e1f7a56da4a` | 362 × 1000 × 510 | Kept. Front legs are +Z, back posts are −Z. Height 0.88 m. Three of them face the bench, the stitch horse, and the finisher. |
| Museum bench `0025f9484fc6` | 418 × 380 × 1500 | Kept as the waiting bench. Long axis is Z; yaw π/2 lays it along X. It is a gallery bench, so it stays in the customer corner. |
| Library lamp `06accd4e0351` | 290 × 488 × 290 | Kept. Shade and arm sit on local −Z, so yaw π aims the shade at the cobbler. Bulb mesh is marked emissive; the green shade is not. |
| Pendant `1b528c6ab04e` | 246 × 212 × 246 | Kept at 0.46 m. Taller than that and the shade becomes a ceiling disc. |
| Jam jar `4e43eb29aa14` | 94 × 110 × 94 | Kept at 0.11 m for wax, polish, and pegs. A larger jar reads as a canister. |
| Mug `6da6f7f87b8d` | 75 × 76 × 75 | Kept at 0.09 m on the stitch-horse wing. |
| Cash register `870f6ebb115a` | 299 × 217 × 434 | Kept at 0.30 m. Keys and `brass_front` are +Z, so yaw 0 faces the customer. Depth is about 0.56 m, so it sits on the 0.66 m counter with little spare. |
| Flowerpot `4a270f247734` | 250 × 204 × 250 | One plant in the open corner. Not a tool. |
| Wall shelf `8732f5e14a30` | 659 × 25 × 938 | Rejected. Height is the thin axis. `prepareAsset` would scale that 25-unit thickness to shelf height and blow the footprint out to several metres. |
| Bar counter `532dcc87f672` | 1800 × 400 × 886 | Rejected. At standing height the footprint is a cafe bar, about 4.7 × 2.3 m. |
| Bar stool `319fcb56afe8` | 464 × 536 × 464 | Rejected. Cafe pedestal, about 0.65 m across if the seat is at work height. |
| Square table `7aaf2767b5f0` | 1200 × 1156 × 1200 | Rejected. Dining table. A cobbler shop with one in the middle reads as a dining room. |
| Study desk / school desk | desk-like | Rejected. Pedestal and school-tray silhouettes, not a lasting bench. |
| Museum plinth | tall column | Rejected. Gallery base. Finished pairs sit on the counter and the foreground stool. |
| Tray / shelf stand `86821ece655f` | small etagere | Rejected. Cafe stand. Polish lives in the jars. |

No local GLB has a shoe last, a welt, a finishing wheel, a peg tray, or a ticket pigeonhole. Those are procedural.

## Built in `cobbler.js`

- Foot lasts: toe, ball, pinched waist, heel, ankle cone, toe plate. Left and right differ by a ball offset, not a mirrored scale.
- Oxfords and boots with a stacked heel, toe cap, eyelets, and welt stitches as geometry.
- Repair bench with a knee hole, three drawers, a lasting jack, and a rail of awl, knife, hammer, and pincers.
- Stitch horse: screw, handwheel, clamped upper, spool, and an awl in the welt.
- Compact finisher: motor drum, column, arm, abrasive wheel, pedal. The wheel is the silhouette, not a needle bar.
- Ticket rack with numbered cards and a hanging rail of tagged pairs.
- Standing handoff counter, till, bell, spike, and wrapped pairs.
- Foreground stool, boot, and a shoe on its side so the near field is not empty floor.

## Still approximate

- Lasts and uppers are overlapped primitives. They read as feet from the cameras used here; they are not scanned lasts.
- Welt stitches are about 6 mm across so the close shot can see them. Real stitches are smaller.
- Rack lasts are scaled 1.15 × 1.05 × 1.4 so the toe-to-heel profile reads on the back wall. A true 28 cm last is only a few dozen pixels from the default camera.
- The finisher has no moving belt and no dust collection. The belt is a dark strap.
- Contact ellipses stand in for AO. One hard shadow map, bias lifted to limit acne.
- The dining chair is the only seat the catalog offers at 0.78 m work height. There is no cobbler's stool.
- Ticket type is a small canvas per number (128×80 or 256×64), not a photograph and not a tiled wall texture.
- `sand3d` and `bake_preferred.py` are not in this environment, so the gap objects were not baked to new GLBs.
