# Spec — King Street barbershop

Metres. Toon is the hard default (`MeshToonMaterial` + 4-stop gradient + hard shadows). Unlit is `MeshBasicMaterial`.

## Room

10.4 × 7.8 × 3.2. Back wall −Z, left wall −X, open on +X and +Z.

## Service

| thing | measure |
| --- | --- |
| Barber seat | 0.52 m |
| Seated eye | 1.14 m, inside the mirror (1.02–2.12) |
| Station pitch | 1.85 m, so a barber stands between chairs |
| Footrest to counter | 0.52 m |
| Counter top | 0.88 m |
| Wash rim | 0.86 m; neck reach 0.48 m toward the basin |
| Reception top | 0.96 m |
| Runner | 1.12 m wide, clear of furniture. The pole stands to its left. |
| Loveseat back | 0.84 m |
| Coffee table | 0.40 m, scaled in plan only |
| Bench seat | 0.46 m |

Station chairs use rotation π. Local +Z is the footrest, the way the client looks, so π aims them at the mirror wall. The wash chair uses π/2 so the neck, on local −Z, meets the basin.
