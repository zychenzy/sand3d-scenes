# SPEC — Koya sleeping floor

Units are metres. Y up. The −Z end is a wall with an entry door. Pods occupy the −X wall. Lockers occupy the +X wall. The grooming vanity is the +Z niche.

## Body and pod

Adult stature used for the check is 1.75 m, shoulder 0.46 m, eye 1.55 m.

Each pod interior is 1.90 m long and 1.00 m wide. Lower clear height above the 0.10 m mattress is 0.88 m. Upper clear height is 0.92 m. You lie down and sit up a little. You do not stand in the berth.

Openings are 0.86 × 0.74 m with a 0.15 m corner radius, smaller than the interior so the shell reads as a molded rim, not a cut rectangle.

## Ladder

One ladder per bay, on the +Z jamb, 0.34 m wide. Four rungs at 0.28 m spacing, starting at 0.22 m. The last rung sits 0.22 m below the upper bunk floor. The rails continue 0.38 m above that floor for a handhold. The ladder stands 0.16 m proud of the pod face and stays outside the walking path.

## Circulation

Corridor clear, from the ladder's outer rail to the locker face, is about 1.24 m. The kept walking strip is 1.02 m wide (`x` 0.10 to 1.12), from just inside the entry door to a standing spot in front of the vanity. Ceiling is 2.48 m. The vanity counter is 0.88 m high. The path samples do not enter a ladder, a locker, or the counter.

## Light

Default shading is a 4-step toon gradient and a hard shadow map. Each berth has a small warm point at the sconce, stronger when the curtain is open, so the bedding stays readable and the duvet is not a blown disc. Closed curtains keep a warm leak at the sill so the opening is not a black hole. Unlit mode swaps to `MeshBasicMaterial` and keeps the same colors. The mirror bars stay unshaded so they read in both modes. The vanity mirror uses a small painted glass map.
