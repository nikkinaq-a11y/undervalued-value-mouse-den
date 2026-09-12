# Pose generation spec

What to ask for when generating new mouse poses, so they drop straight into
`tools/build_assets.py` instead of needing hand work.

Measured from the pose sheets already in use (`Mouse Gen3a/3b/3c.png`, `ChatGPT
Image ... (1)–(3).png`), all of which the pipeline handles cleanly.

## The rules that matter

| | |
|---|---|
| Canvas | **1254 x 1254**, square |
| Backdrop | **flat `#211008`** (very dark warm brown), edge to edge, no gradient, no vignette, no texture |
| Subject height | **~820 px** for a seated pose, **~940 px** for a standing one |
| Props | only what the mouse is holding or wrapped in — **no floor, no furniture, no cast shadow on a surface** |
| Batch | **generate every pose in one request.** Separate requests drift in zoom and head size; the existing sit pose's head still reads slightly large because of this |

The character: a grey mouse with large pink-lined ears, a ribbed **orange knit
beanie**, an **orange turtleneck sweater**, bare grey arms and legs, and a long
pink tail.

## Why the couch/mug images couldn't be used

They are scenes at a different camera — the couch fills the frame, where in the
den it is 14% of the frame width. Scaled down to match, the mouse lands at
22 x 26 art px and the wall behind it is the same orange as its hat, so there is
no clean cut-out either. See the Decisions section of `PROGRESS.md`.

## The poses to generate

Three seated poses, one request, matching the existing `sit` pose's framing
(~820 px tall, facing slightly to the viewer's left, as if watching the
television across the room):

1. **`mug_hold`** — sitting upright, both paws wrapped around a cream mug held
   at chest height, looking ahead.
2. **`mug_sip`** — the same seat and body, mug raised to the muzzle, eyes closed
   or half-closed, a small tilt to the head. *Everything except the arms, mug and
   eyes should match pose 1* — these two alternate as a sip animation.
3. **`blanket`** — sitting wrapped in a red-and-cream plaid blanket pulled up to
   the chest, paws resting on the blanket edge, no mug.

### One thing to insist on: the mug

At the den's scale the mouse is 36 art px tall, so **the mug will be about 5–7 art
pixels across no matter how large the source is.** It only reads if it is drawn
to survive that. Ask for:

- the mug **large in the paws** — roughly 180 px across in the 1254 px frame,
  generously sized rather than dainty
- **cream or pale grey**, for maximum contrast against the orange sweater
- **held clear of the body**, so its outline is unbroken silhouette, not
  overlapping the sweater
- a **simple rounded shape** with a clearly separated handle — fine detail on the
  mug (the heart motif, glaze, steam wisps) will disappear entirely and is not
  worth asking for

Same reasoning applies to the blanket: big blocky checks, not fine plaid.

## After the art lands

1. Drop the files next to the other originals, one level above this repo.
2. Add them to the `POSES` table in `tools/build_assets.py`, with the target
   dimensions expressed against the same ruler (`STANDING_ART_H = 36` for an
   82-unit standing pose).
3. Run `python3 tools/build_assets.py` — it prints the CSS boxes and the
   `SPRITES` table to paste into `style.css` and `script.js`.
