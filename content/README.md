# Content

The original, unprocessed material the site is built from. Nothing here is
loaded by the page — `tools/build_assets.py` reduces `art/` into
`assets/images/`, and the page only ever loads what is in `assets/`.

Keeping these in the repo means a fresh clone can rebuild every image from
scratch:

```
python3 tools/build_assets.py      # needs Pillow and numpy
```

That rebuild is verified to reproduce `assets/images/` **byte for byte**.

## `art/`

Renamed from their original export filenames to match what they produce, so the
mapping is readable at a glance.

| file | becomes |
|---|---|
| `room-lit.png` | `den_bg.png`, and the base every overlay is measured against |
| `room-dark.jpg` | `den_bg_dark.png` |
| `tv-off.png` | `tv_off.png` — registered crop, television dark |
| `fire-frame-b.jpg` | `fire_b.png` — the second flame; the first is the room's own |
| `pose-front/side/back/walk/lie.png` | the `mouse_*.png` sprite set |
| `scene-fire-1/2/3.png` | `scene_fire_*.png` — carrying a log, setting it in, sitting back |
| `scene-cocoa-1/2.png` | `scene_cocoa_*.png` — holding the mug, sipping |
| `scene-couch-1/2.png` | `scene_couch_*.png` — lamps up and lamps down, and the movie's TV frames |

Every scene file is pixel-registered to `room-lit.png` (offset 0,0). If new scene
art does not register, it cannot be used this way — see PROGRESS.md.

## `art/halloween/`

The holiday decorations, in two layers:

- `source/` — the stock sheets exactly as they arrived, on their flat backdrops:
  nine framed portraits on sage green, nine jack-o'-lanterns on amber, a cauldron
  and a hat on white. **These are third-party, and three of the four have no
  identified creator or licence** — see the Attribution table in the top-level
  README before submitting.
- `*.png` — the same art with the backdrops flood-filled away and each object
  split out on its own, produced by `tools/cut_halloween.py`:

```
python3 tools/cut_halloween.py     # source/ -> the cut-outs beside it
python3 tools/build_assets.py      # cut-outs -> assets/images/decor_*.png
```

Twenty pieces are cut out; the eight the room actually hangs are chosen in the
`DECOR` table in `tools/build_assets.py`, which also sets each one's size and
position in art pixels. The other twelve stay here as material — changing which
decorations the room uses is an edit to that table, not new art.

Unlike everything else in the build, the decorations do **not** share the room's
palette. The reason that rule exists is colour flicker between animation frames,
and these never animate; meanwhile the room's 224 colours hold no purple or
saturated orange, so putting a cauldron through them turns it to mud. They get
their own 96-colour palette instead, and the room's own output is left untouched —
holiday mode off is byte-identical to before the decorations existed.

## `reference/`

Two screenshots used to measure things that were being guessed wrong:

- `tv-screen-rect.png` — which part of the television is the lit glass
- `couch-stand-spot.png` — where the mouse should stand when it gets up

## Not kept here

Earlier experiments that the build does not use: alternative room versions,
close-up (zoomed) scene art, the sleeping and fire-tending illustrations, and
the sit pose. PROGRESS.md records why each was rejected, which is the part worth
keeping. They are still in `Mouse Den Content/` outside the repo.

The audio and the font are not duplicated here — the files shipped in
`assets/audio/` and `assets/fonts/` are the unmodified originals.
