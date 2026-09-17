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
  split out on its own, produced by `tools/cut_halloween.py`. **Named for what
  is in them** — `portrait-ghost`, `pumpkin-wink`, `witch-hat` — because a sheet
  of nine jack-o'-lanterns is nine different faces, and the name is the only
  thing telling them apart when one is being picked for the room. The name list
  lives beside each sheet in the script's `SHEETS` table, in the order the sheet
  reads; the script refuses to write anything if the sheet stops splitting into
  as many objects as there are names.

```
python3 tools/cut_halloween.py     # source/ -> the cut-outs beside it
python3 tools/build_assets.py      # cut-outs -> assets/images/decor_*.png
```

Twenty pieces are cut out; the nine the room actually hangs are listed in the
`DECOR` table in `tools/build_assets.py` with their size and position. The rest
stay here as material.

**That table is generated, not written.** `tools/read_placement.py` reads it back
out of `reference/holiday-placement.png` — a screenshot of the room with the
decorations arranged over it by hand — recovering each piece's position, size and
which cut-out it is. Rearranging the room means moving things in that image and
re-running the two scripts, not editing coordinates.

Each piece is warmed and dimmed into the room's light on the way through, scaled
by how bright the room actually is behind it, and given a soft contact shadow
that travels inside its own image.

They sit on the room's own grid — `DECOR_SUPERSAMPLE` is 1, one art pixel per art
pixel, the same ruler as everything else. Note that the cut-outs still hold their
sheet's background colour beneath their transparent pixels, so the build has to
resize them with alpha weighting or that backdrop bleeds into every edge as a
pale halo; see PROGRESS.md.

Unlike everything else in the build, the decorations do **not** share the room's
palette. The reason that rule exists is colour flicker between animation frames,
and these never animate; meanwhile the room's 224 colours hold no purple or
saturated orange, so putting a cauldron through them turns it to mud. They get
their own 128-colour palette instead, and the room's own output is left untouched —
holiday mode off is byte-identical to before the decorations existed.

## `reference/`

Screenshots used to measure things that were being guessed wrong:

- `tv-screen-rect.png` — which part of the television is the lit glass
- `couch-stand-spot.png` — where the mouse should stand when it gets up
- `holiday-placement.png` — where every holiday decoration goes. Unlike the other
  two this one is *read by a script* rather than by eye, so it is a source file
  in its own right: `tools/read_placement.py` turns it into the `DECOR` table.

## Not kept here

Earlier experiments that the build does not use: alternative room versions,
close-up (zoomed) scene art, the sleeping and fire-tending illustrations, and
the sit pose. PROGRESS.md records why each was rejected, which is the part worth
keeping. They are still in `Mouse Den Content/` outside the repo.

The audio and the font are not duplicated here — the files shipped in
`assets/audio/` and `assets/fonts/` are the unmodified originals.
