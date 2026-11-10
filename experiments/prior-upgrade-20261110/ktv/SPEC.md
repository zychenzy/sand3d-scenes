# KTV room — spatial spec

Units are metres. Origin is the floor centre. +Y up. Screen wall is −Z. Entry wall is −X. The open cutaway is +Z and most of +X, with a short pier at the back-right corner.

## Zones

1. **Lounge.** Three `sofa_solid` seats around one `coffee_table`. The table’s long axis runs along X. The long sofa is the same asset scaled on X and sits on the +Z long side, seat facing −Z (table and screen). The end sofas face inward across the short sides. Knee gap is about 0.40; corner gaps stay open so the three sofas read as separate pieces.
2. **Stage.** A 7 cm platform in front of the screen, wide enough for one singer, with a stand mic angled back toward the lounge (+Z) and a magenta LED kick on the nosing. Speakers sit on low plinths flanking the screen, not on the stage.
3. **Service.** A credenza on the left wall, between the stage and the left sofa, holds the queue monitor, binders, and bottles. A short glass rail sits further toward the door. The door is on the left wall behind the long sofa.

## Facing

- Sofa GLB: backrest at local +Z, occupant faces local −Z. `rotationY` 0 looks at the screen.
- Left sofa `rotationY` −π/2 faces +X. Right sofa `rotationY` +π/2 faces −X.
- Table GLB long axis is local Z. `rotationY` π/2 plus local Z scale lays it along world X.
- Screen plane faces +Z. The TV asset is only the credenza monitor: its broad face is local YZ, so `rotationY` 0 presents that face toward +X.

## Shell

Plum walls, wood dado and rails, wine rug with a darker edge, tufted padded panels in an uneven rhythm (not a repeated grid), two ceiling clouds, a coffer with a magenta cove, two pendants over the table, one sconce over the credenza. Screen copy and the queue list are drawn locally. No external lyric text. No ref photos.
