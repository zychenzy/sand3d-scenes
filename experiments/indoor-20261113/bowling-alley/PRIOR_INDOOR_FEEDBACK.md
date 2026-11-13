# Prior indoor feedback

Historical note, kept as given: earlier indoor scenes were too crude, too sparse, and too monotonous, and the shading was too simple. The ask for this alley was more design and more rendering complexity, not a larger pile of the same objects under the same shader. No numeric scores are invented for the older rooms, and those rooms were not rebuilt.

## What the existing shots actually show

Looked at `cafe/shots/toon_default.png`, `library/shots/toon_default.png`, and `lounge/shots/toon_default.png` while building this scene.

- **Cafe.** A readable cutaway: counter, pastry case, round tables, metal chairs, pendants. The floor is a large empty wood plane, the toon bands are soft and even, and the HUD is baked into the shot. Chairs sit near tables but several face the aisle rather than the tabletop. It reads as a cafe, then runs out of incident.
- **Library.** One long table repeated, the same chair copied down both sides, and a row of near-identical bookcases. Light is flat. The lectern and the green lamps are the only breaks in the rhythm. The HUD is in the frame.
- **Lounge.** One pool table, one sofa, one cue rack, a lot of bare floor. The lamp is a single hot spot. Shading is a broad gradient with little contact shadow. The HUD is in the frame.

## What this alley does with that

The room is organized by the game, not by a furniture grid. Approaches carry lane numbers and locator dots. Lane beds carry a ball track, two arrow ranges, and a foul line. Gutters and the capped return are different colors. Scoring screens face the bowler and stay emissive in both toon and unlit. Masking carries the house mark and the pair numbers. Settees face the pins, with a drink table between each pair, and the approach in front of them stays clear. The snack run (counter, stools aimed at the counter, rack, menu) is a second circulation, not another cafe table.

Shading is a 4-step toon ramp plus a hard shadow map. The ceiling and the lane beds do not cast, so the key light still reaches the approaches. Unlit is a real `MeshBasicMaterial` pass, used for the form shot, not a dimmed toon.

## What is still thin

The shoe desk and its cubbies sit at the far end of the service run and are only a sliver in the hero frame. House-ball grips read as dark marks on the crown in the close shot, not as deep drilled holes. Lane length is compressed. Those are written up in `refs/GAP.md`.
