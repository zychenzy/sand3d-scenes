# GAP — blackbox theatre

Closed in this scene:

- Plank stage, stage-right wing, three treads, glow tape, spike marks.
- Pleated traveler, scalloped teaser, black legs, upstage black.
- Pipe grid with PAR and ellipsoidal fixtures. Gels are emissive; spot lights carry the same colors onto the deck.
- House: 4 + 3 seats on three rows, two risers, center aisle, rear rail with a gap. Theatre-chair GLB faces −Z at `rotationY` 0 (same note as `cinema/`). Outer seats toe in (max ±0.22 rad) toward `stage.focus`.
- Set dining chairs use the boardgame axis: native face is +Z, so the downstage chair is `rotationY` π and the upstage chair is 0. Both face the table.
- Prop bay: study desk, dining chair facing it (−π/2, sitter on the room side), lamp, monitor, shelf, prompt stand, rack, crates.

Still open:

- Curtains and garments are pleated boxes, not cloth. The traveler does not actually fold.
- Risers are two steps, not a continuous rake.
- Stage monitors are the shared compact speaker scaled to 0.20 m, so they read as small wedges, not full wedges with a grille.
- The prompt stand is the library book-stand pedestal, taller than a music stand.
- No moving lights, booms on both sides, or a control booth. The niche work light is one extra fixture plus a bare bulb.
- Spot intensity is tuned for three.js r170 physical units plus the toon gradient. Very close to a gel, the wash can still clip to a flat band.
