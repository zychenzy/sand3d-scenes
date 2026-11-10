# Podcast recording lounge

Cutaway of a two-zone podcast room: a conversation set (desk-height oval table, four chairs, clamped boom mics, headphones) and a control position (mixing console, two desk monitors, engineer). Record shelving along the back wall is lit by a warm table lamp, with a brass floor lamp by the set. Foam covers both solid walls; a slat diffuser and ceiling clouds sit over the talent and the console.

Assets are referenced from existing scene folders. Microphones, the console, treatment, and shelving props are procedural because the baked catalog has no broadcast mic, boom, or mixer.

## Launch

From the repo root, so shared GLBs and the vendored Three.js resolve:

```bash
python3 -m http.server 8788 --bind 127.0.0.1
```

Open http://127.0.0.1:8788/experiments/sprint-20261110/podcast-lounge/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close`

## Test

```bash
node --test experiments/sprint-20261110/podcast-lounge/test/layout.test.mjs
```
