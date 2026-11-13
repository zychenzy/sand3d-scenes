# GAP — Gate B12 holdroom

Inspected the repo-root HF bakes (mesh names and materials) before choosing. Rejected for this room:

- Theatre chair — burgundy leather and walnut. Reads as a cinema.
- Train seat — maroon cushion on a rail plinth. Reads as a coach.
- Museum bench — oak slab and steel X-legs. Already the station-lounge seat.
- Sofa, banker lamp, school desk — hotel, library, or classroom.

No beam seat, gate podium, stanchion, or flight ribbon exists in those bakes. `sand3d` / `bpy` are not installed here, so those pieces were not re-baked. They are procedural meshes in `gate.js`.

## Used as-is, with loader tints only

- Curved desktop monitor on the podium. Not a gate CRT.
- Cafe POS terminal as the scanner head. It reads as a tilted reader after yawing the screen toward the queue. It is not a boarding-pass scanner.
- Two cafe bar stools remain at the work ledge. The seat was tinted off pure black. The base is still a cafe pedestal. The third stool, which lined up behind the south seat bank, was removed.
- Flowerpot, with block foliage added in the scene. One cup on the ledge, retinted off the original yellow.

## Still open

- The apron is a cropped fuselage. The jet-bridge is a ribbed throat at the door, not a docked airliner, taxiway, or terminal exterior.
- Flight ribbons and the gate-wall plate are canvas panels, not split-flap or LCD glass. Type is columned so it can be read from the holdroom cameras.
- Beam seats are still procedural shells: a pan, a reclined back, and a headrest on the shared beam. They are not a catalog beam-seat mesh.
- The band above the charging ledge is a mullioned panel, not exterior glazing. A grey spandrel remains between the ledge and that band.
- The floor access mark is a simple symbol, not a standard wheelchair pictogram.
- No passengers, luggage fleet, or PA speaker that matches a ceiling horn.
- The toon ramp still starts at 104/255. Shadow maps are softened for thin posts and legs; the four toon steps stay hard. Unlit is `MeshBasicMaterial` with the shadow map off.
