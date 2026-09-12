# Cozy Mouse Den — Progress & Handoff

Working notes for resuming this project in a fresh session. Last updated 2026-09-12.

## The assignment

Multimedia Communications, "Undervalued Value" — 7 interim parts, final due **Oct 6**.
Part 1 (Materials) was due **Sep 15**: one-sentence function, one value, 10+ materials,
a GitHub repo with organized `/assets`, and a README stating function + value.

**Function:** A pixel-art mouse lives in a cozy den and autonomously does calm idle
activities — tending the fireplace, reading, watching a movie — each lasting minutes,
which a visitor can gently nudge but not force.

**Value: Contentment.** The design *practices* it rather than depicting it: no scores,
streaks, notifications, or fast cuts; nothing demands attention or rewards staying. The
mouse is content whether or not anyone watches. Clicking only sets a soft preference for
what it does *next* — it never interrupts what the mouse is already doing. That gap
between influence and control is the whole point.

## Where things are

- **Project/repo:** `Duke/Current Classes/Multimedia Comms/undervalued-value-mouse-den/`
- **Source art (originals, unprocessed):** one level up, in `Multimedia Comms/`
  - `Mouse Den - New angle.png` — the room, lights on, TV on, fire "A". **In use.**
  - `Mouse Den - Lights Off - TV On.jpg` — the same room, lamps down. **In use.**
  - `Mouse Den - TV Off.png` — registered crop, TV dark. **In use.**
  - `Fireplace1/2/3.jpg` — registered crops of the fireplace. **Only one is in use; see below.**
  - `Mouse Gen3a/3b/3c.png` — front / side / back mouse poses
  - `ChatGPT Image ... (1)–(5).png` — (1) walk, (2) sit, (3) lie, (4) sleeping, (5) fire-tending
  - `Outdated Images/`, `Mouse Den.png`, `Mouse Den 2.png`, `Mouse Den 3.png` — superseded
- **Built site:** `index.html`, `style.css`, `script.js`, `assets/images/`
- **Asset pipeline:** `tools/build_assets.py` (see below) — this is now *in the repo*,
  not in a scratch directory.

## Status

Working: the room renders at a new wide angle, the mouse cycles between three activities
on its own timer, walks between them, the fireplace flickers on two real frames, the TV
sits dark until the mouse watches a movie, and the room dims to its painted lights-off
state while it does.

**Not done: the GitHub repo.** Everything is committed locally. `gh` is still not
installed and no credentials are available here, so the remote has to be created by hand
— see "Putting it online" in the README for the full sequence including GitHub Pages.

The repo *is* verified self-contained: a fresh `git clone` into an empty directory serves
and renders correctly with the font, all art and the audio, nothing missing. Re-run that
check (clone to a temp dir, `python3 -m http.server`, load it) after adding assets.

**The source art is not committed** — ~25 MB of original PNGs one directory up. A clone
can run the site but cannot re-run `tools/build_assets.py`. Worth deciding before final
submission whether the originals belong in the repo too.

## Running it

```
python3 -m http.server 8731      # from the repo root, then open localhost:8731
```

**Gotcha that already cost time:** Chrome aggressively caches `script.js`. A normal
refresh can silently keep running old code — this looked exactly like "the animation is
broken." Always hard-reload (**Cmd+Shift+R**) after editing JS.

`TEST_MODE = true` at the top of `script.js` shrinks the time unit from minutes to
seconds (fire 4s, read/movie 10–30s) so transitions are observable. **Set it to `false`
for real pacing** before submitting — that restores 2 min / 5–15 min.

## The scale rule (most important thing to not re-derive)

Everything must share one art-pixel size, or the mouse looks more pixelated than the room.

Current numbers, all interlocking:
- Room art grid: **384 x 216** (16:9, matching the new art's native 1366x768)
- Standing mouse sprite: **36 art px tall** — 16.67% of frame height
- Every asset ships at native art resolution and is scaled up by the browser with
  `image-rendering: pixelated`. Nothing is pre-upscaled any more.

Because all assets are authored on the one grid, JS no longer needs a scale factor: a
pose's on-screen height is simply `spriteArtHeight / 216`.

`tools/build_assets.py` prints the CSS percentages and the `SPRITES` table it just
produced. **Paste those in rather than recomputing them** — changing `ART_W/ART_H` or
`STANDING_ART_H` moves every overlay box and every sprite dimension at once.

**If the background art changes again, the sprites must be regenerated at a new
resolution — never just scaled in CSS.** Re-run `tools/build_assets.py`; don't hand-edit
the PNGs in `assets/images/`, they are all build output.

### How the grid and the mouse height were chosen

- **Grid size:** the room was first built at 320x180, chosen by rendering 384/320/256/224
  and comparing — at 256 the mouse's eyes disappear into a blob. 320 turned out to read
  as *too* chunky in the finished room, so it went one step back up to **384x216**, which
  keeps the pixel character while letting the rug, bookshelf and lamp resolve.
- **Mouse height:** originally derived from the furniture ruler — the previous den set
  the mouse at 22.5% of frame height against a couch 22% of frame width, a ratio of 0.93,
  and the new couch measures 197 source px, giving 23.9% of frame height. That read too
  large in this wider room, so it was cut by 30% to **16.67%** (36 art px of 216) by eye.
  The furniture ruler is still what to fall back on if the art changes again; the 0.7 is
  a deliberate deviation from it, not a lost measurement.
- **Pose proportions** were carried over from the previous build's tuned dimensions
  (front 49x82, side 52x82, back 44x82, walk 67x78, sit 57x70, lie 70x42) scaled by
  36/82, then re-cut from the 1254x1254 originals. Front/side/back deliberately share one
  height so the mouse doesn't resize as it turns.

## Asset pipeline — `tools/build_assets.py`

One command rebuilds every image from the originals one directory up:

```
python3 tools/build_assets.py      # needs Pillow + numpy
```

It flood-fills flat backdrops to transparency, downscales with `BOX`, quantizes to one
shared palette with `MEDIANCUT` and no dithering, and writes native-resolution PNGs.

Things that matter when processing new art:

1. **Everything shares one palette**, room and mouse together. Separately quantized
   frames shift color between them, which flickers during animation.
2. **The palette is 224 colors, not 128.** Now that four room states plus two pose sets
   share one palette, 128 washed the room out to near-monochrome — the green couch went
   grey and the plaid blanket disappeared. 160 is still visibly banded; 224 and 256 look
   the same, so 224.
3. **Mouse pixels are massively outnumbered by room pixels**, so median-cut would spend
   the whole budget on the room. The script tiles the poses up to ~12% of the montage to
   buy them a fair share of the palette.
4. **Overlays are cropped from the downsampled room, not downsampled separately.** Each
   overlay source is composited onto the full-frame room *first*, then the whole frame
   goes through the grid, then the changed region is cropped out. This is what guarantees
   an overlay lands on the pixel grid with no seam. The crop boxes are computed from
   which art pixels actually differ, so they are as small as possible.
5. **The `.jpg` crops carry a few px of white bleed at their edges** — the script insets
   the paste box to avoid dragging it into the art.

## Whole-room scenes

Some moments are painted rather than acted out by the sprite: the same room
painting with the mouse already in it, pixel-registered to the background
(**offset 0,0, zero difference on every static region** — measured, not assumed).
Because they are the same room at the same zoom, fading one in over the live
room reads as the mouse appearing where you asked it to be, not as a cut.

- `scene_fire_1..3` — standing at the hearth with a log, setting it in, sitting
  back to watch
- `scene_cocoa_1..2` — mug held at the chest, then raised for a sip

They are **whole frames, not overlay crops**, because each carries its own flame
and firelight. They are quantised against the *room's own palette* rather than
one of their own — same room, so the palette already covers them, and reusing it
keeps them consistent with the den without diluting its colour budget.

### Nothing is ever painted into place

**Every scene walks there first.** Pressing any button makes the sprite turn to
face the way it is going, walk across the room, and only then does the painting
take over — `walkThen()` in `script.js` is the single place that rule lives, and
Movie, Cocoa and Feed fire all go through it. If the mouse is already standing
where the scene shows it, the scene cuts straight in rather than making it walk
a pointless lap.

The room's fire keeps flickering all the way through the walk. Only the arriving
scene decides whether it paints its own flame, which is why that decision sits in
the arrival callback and not in `setMode`.

**Cocoa lands on the plain sitting-on-the-couch frame first** (`enterWith`), the
same frame the movie lands on, and holds it 0.7s before the mug frames start.
That bridges the hand-off from sprite to painting no matter where the mouse
walked in from — coming straight from the fireplace, it sits down empty-handed
and the mug appears a beat later, rather than materialising in its paws the
instant it lands.

### Movie is a sequence, not a scene

Pressing Movie runs: **turn to face the couch (0.42s) -> walk there (2.4s) -> the
painted couch frame cuts in (no fade) -> 0.7s later the lamps go down (1.6s
fade).** The mouse is on the couch, in that frame, *before* the fade starts, so
the dissolve is only the light changing around it — `scene_couch_1` and
`scene_couch_2` are the same painting of the same mouse in the same place, one
with the lamps up and one with them down.

**That fade is the only one in the piece.** Scenes otherwise cut straight in,
because the mouse has already walked to where the scene shows it and there is
nothing to dissolve between — a fade there just blurs the swap.

Coming back out, **nothing at all happens until the lamps are fully back up.**
Leaving a movie for any other mode defers the whole next action by
`NIGHT_FADE_MS`, holding the painted couch frame for the entire fade, so the
mouse is still sitting there in the light before it gets up. Standing up
mid-dissolve was what gave the cut away. The fire's flicker is on the same
latch: starting it during the dissolve makes the fire visibly jump brighter.

### Perspective

The sprite shrinks toward the back of the room. The gradient is **measured, not
invented**: the standing mouse painted at the hearth (`scene_fire_1`, ground
contact at art y 120) is **32 art px tall** where the sprite's own ruler is 36,
so the artist's room is already ~11% smaller back there. `DEPTH_AT_SCALE` pins
that point and `DEPTH_PER_PX` extends the gradient forward.

Verified: 32.0 art px on the back lane (y 120), 37.4 on the front lane (y 152).

The size has to follow the mouse *during* a walk, and `style.bottom` already
holds the destination by then — so `updateDepth()` reads the **computed** bottom
on a 40 ms interval while any leg is in flight. That is also why the sprite's
height is applied through `applyPoseSize()` rather than written directly in
`setPose`.

### Walking: legs, and lanes

A trip is three legs, each with its own CSS duration set from JS:

1. **off the furniture** onto the floor — the couch exit sits left of and in
   front of the couch, so getting up is a step down rather than a slide out
2. **along the lane** — every activity's exit point shares one `bottom`, so this
   leg is purely horizontal and cannot wander through the furniture
3. **up to the resting spot**

Crossing between lanes adds two more legs through a connector. Every leg is
**paced by its own length** (`MS_PER_ART_PX`, floor `MIN_LEG_MS`) rather than by
its role, so the floor has one walking speed throughout and a route with extra
legs simply takes longer.

**There are two lanes.** `front` at art y 152: on the rug, which is fine to walk
on, and below the coffee table's base at y 147, which is not. `back` at art
y 120: the open floor behind the table. **A lane is picked by coin toss every
trip**, so the mouse sometimes goes in front of the table and sometimes behind
it rather than wearing one groove across the floor.

**Both lanes are always reachable**, even from places that cannot join one
directly. The rug sits *below* the table, so it has no back-lane exit — a route
from there to the back lane goes out to the front lane, along to a **connector**,
and crosses. The connectors are the only two columns where crossing is clear:
art **x 155** (left of the table) and **x 222** (right of it, left of the couch's
arm). `laneEntry()` is what works this out.

Validated by simulating all 12 routes (3 activities x 2 directions x 2 lanes)
and testing every segment against the table's rect: **0 cross it**. Re-run that
check if the lanes, connectors or exits move.

Before any of this the mouse walked a straight line from couch to hearth at
y≈132, directly over the table.

### Resting spots are measured off the paintings

`ACTIVITIES[x].rest` is not eyeballed: it is where the painted scene actually
puts the mouse, so the sprite hands over to the painting without a jump.

| | art (x, feet y) | from |
|---|---|---|
| fire | **(147, 119)** | `scene_fire_1` |
| couch | **(256, 129)** | `scene_couch_1` |

The fire spot used to be (144, 134) — 15 art px low and 3 left — which is why
the walk visibly ended below and left of where the feed-fire animation began.
Verified after the fix: sprite and painted mouse both land with feet at art
y 124 on screen.

**If a scene's art changes, re-measure.** Diff it against `den_bg` at a high
threshold (60 works; lower and the firelight swamps the mouse) and take the
bounding box of the largest blob.

### Turning before walking

Every move begins with the mouse standing still and turning to face the way it
is about to go (`side` pose, mirrored as needed, `TURN_MS`), and only then does
the first leg start. Without that beat it slides
off sideways on the first frame, which reads as being dragged rather than
deciding to go.

The destination is deliberately *not* set during the turn — that is what keeps
the position transition from starting early. An earlier version suppressed the
transition with a class and used `requestAnimationFrame` to re-enable it; that
was both unnecessary and broken, since the rAF never fired and the mouse never
actually walked. If a beat like this is needed again, withhold the value rather
than fighting the transition.

### Getting up is a cut, not a climb

Where a painting is doing the sitting, the sprite takes over standing **on the
floor beside the furniture, never on it**. Leaving the couch, the sprite is
placed at `movie.stand` instantly and only then turns to walk; arriving, the last
leg ends there and the painting puts the mouse in the seat.

`stand` is art **(245, 143)** — the floor at the couch's near corner, taken from
a screenshot of where it should be rather than guessed. It is a separate point
from `exit`, which sits out on the walking lane at y 152.

Before this the sprite appeared standing on the cushion and then slid down to
the floor as its first leg, which read as the mouse climbing down off the couch
in one smooth glide. The rest position is where the *sitting* mouse's ground
contact is; a standing sprite has no business there. `leftPainting` /
`joinsPainting` in `goToActivity()` are what skip those legs.

### The television, playing

While the lamps are down — and only then, since it is the one painted frame with
a lit screen — the television's glass animates. Both dark-room paintings show the
same still picture (2.53 mean difference over the screen), so the motion is
generated: eight frames that shove the picture a few pixels and swing the brightness,
shifted at *source* resolution and re-downsampled so the art pixels genuinely
change rather than smear. **about half of the glass's 204 art pixels change between any two
frames** — at 17x12 it needs to be that emphatic to read as a picture at all.

It is built as a **screen-only overlay** (`tv_movie_1..8.png`, art rect
**(118, 65) 17x12**, ~1 KB each) rather than eight more copies of the whole room.
That rect is the lit glass and nothing else, read off the art grid a pixel at a
time — an earlier guess at it took in the bezel, the antenna base and the shelf,
so the whole television shifted about instead of only the picture.
Frame 1 is pixel-identical to the screen in `scene_couch_2` beneath it, which is
the check that the overlay lands on the grid with no seam.

It fades on the same curve as the lamps and keeps moving right through the fade
out, so the set is never a frozen still while it is still visible.

### The one moving part: whose flame is it

Measured over the fire overlay's 3315-pixel box:

| scene | art px differing from the background | so |
|---|---|---|
| `scene_cocoa_1/2`, `scene_couch_1` | **2** | the room's own flame flicker keeps running over them |
| `scene_fire_1/2/3` | 378 / 398 / 668 | the scene repaints the flame; the overlay stands down |

That is why layer order is explicit in the CSS and `.fire` gets lifted above
`.scene` by `.den.scene-keeps-fire`. Without it the cocoa scene would sit under
a frozen fire, which is the one thing in the room that should never be still.

An earlier attempt used *close-up* art for these — a second camera with the
fireplace or couch filling the frame. It was cut: the zoom change broke the
visual cohesion the pixel grid buys, and the close-up sources didn't register to
each other anyway. Whole-room scenes are strictly better and the reason is worth
keeping: **one camera, one grid, one palette.**

## The controls

Three buttons under the frame — Movie, Cocoa, Feed fire — plus the clickable
zones in the room itself. Buttons are a radio group: clicking the active one
lets the mouse go back to its own routine.

- **Movie** — see the sequence above. Clicking the television in the room is an
  alias for this button, so the two controls cannot disagree.
- **Chill** — walk to the rug and lie down, held. No painted scene for this one:
  it is the `lie` sprite, the same rest the mouse finds on its own.
- **Wander** — roam the floor graph; see Wandering below.
- **Cocoa** — walk to the couch, land on `scene_couch_1` for 0.7s, then
  `scene_cocoa_1/2` on a loop: the mug is held 2.6-5.2s, the sip takes 1.1-2.0s.
  The uneven hold is what makes it read as drinking rather than a two-frame
  toggle.
- **Movie** — the walk-and-settle sequence above, ending on `scene_couch_1/2`.
- **Feed fire** — walk to the hearth, then **three goes at the fire**:
  `scene_fire_1` and `scene_fire_2` alternate three times over (~0.7s each), so
  the log is offered up and pushed in repeatedly and it reads as actually
  working at it, and only then `scene_fire_3` — sitting back to watch for
  9-17s before the whole thing comes round again.

Each frame declares its own hold as `[file, minMs, maxMs]`, so a scene has a
rhythm rather than a metronome.

While a held mode is active the mouse's own activity timer stops, and it picks
up from wherever it already is when released — letting go of a button never
teleports it. A scene carries its own painted mouse, so the walking sprite fades
out on the same curve rather than standing in the room twice, and the room's
zones stop being click targets while a scene covers them.

## How the room's lighting and animation are wired

Layer order in `index.html`: lit room → TV-off overlay → fire overlay → dark room → mouse.
The dark room is a full-frame image at `opacity: 0` that fades in on top of everything,
so turning the lights off automatically hides the lit-room overlays underneath it.

- **Fire:** `fire_a.png` / `fire_b.png` alternate on a *randomized* 90–240 ms timer. A
  fixed interval on two frames reads as a strobe; a random hold reads as a flicker.
- **TV:** dark by default (the `tv_off` overlay), and **the visitor's switch**. Clicking
  the set turns it on and takes the lamps down with it, fading to the lights-off painting;
  clicking again turns it back off. This is the one control that is not a nudge — see the
  note under Decisions.
- **Lights:** the mouse has a second, dimmed sprite set, swapped in whenever the room is
  dark. This is not a guess — comparing the lit and lights-off room art, every surface
  away from a light source is exactly the lit render times **0.55**, flat across all three
  channels, so the poses get that same factor. Without it the mouse glows against a dark
  room.
- **The fade** is CSS: `.room-dark` transitions `opacity` over 1.6s and the page ground
  transitions with it. `setTvOn()` only flips a class.

## Decisions already made (don't redo these)

- **CSS-filter fakery was tried and rejected** — filter-based fire flicker, a fake TV
  on/off layer, pulsing glows, window twinkles. All read as artificial over painted art.
  Everything animated now is a real painted frame. (The one derived asset, the dimmed
  mouse, is a measured match to the artist's own 0.55 dimming, not an invention.)
- **`Fireplace1.jpg`, `Fireplace2.jpg` and `Fireplace3.jpg` are the same flame.** They
  differ from each other by 0.8/255 mean — JPEG noise — while differing from the room's
  own flame by ~5. So there are **two** distinct fire frames, not four, and only one of
  the three files is used. If you meant to export three different flames, re-export them;
  the build will pick them up.
- **The lights-off room has the same flame as `Fireplace1`**, so there is no second frame
  for it and the fire holds steady while the lights are down.
- **Mouse scale** follows the furniture ruler above; the house is mouse-sized, so the
  mouse reads as its resident.
- **`Mouse on Couch.png`, `Mouse Mug2.png`, `Mouse Mug3.png` are scenes, not sprites,
  and not animation frames either.** Measured 2026-09-12, so it doesn't need redoing:
  - They are a *different camera* — the couch fills the frame, where in the den it is
    14% of the frame width. Scaled to the den, a cut-out lands at **22x26 art px with a
    4 px mug**: the face loses its eyes and the mug, the whole point, reads as a blob.
  - **Mug2 and Mug3 are independent redraws, not two poses of one scene.** Every region
    wants a different alignment (lamp -4,-2; bookshelf -8,-2; couch seat -4,-6; mouse
    head -26,+32) and the residual difference is 4-25 even at each region's own best
    offset. Nothing static holds still, so they cannot cross-fade or animate.
  - **There is no clean automatic cut-out**: the wall behind the mouse is (176,65,3),
    essentially the same orange as its hat (236,76,14) and sweater (167,35,15). Cutting
    it needs hand-masking in an editor.
  - They are lovely at their own scale and would work as a close-up, or as README/
    documentation stills. See Next steps.
- **Images (4) sleeping and (5) fire-tending are unusable as sprites** — they are full
  illustrated scenes with their own blankets/fireplace/props that don't match the den.
- **The buttons are direct control, not nudges.** The zones in the room still only set a
  preference for what the mouse does *next*; the three buttons under the frame change what
  it is doing immediately, and hold it there. This was asked for explicitly, twice, and is
  the right call for showing the work — but it is worth a deliberate look before the final,
  because "influence, not control" is the gap the whole piece is built on. One option that
  keeps both: let the buttons *nudge* rather than seize, so the mouse finishes what it is
  doing and then goes. Lighting used to be a consequence of the mouse settling onto the
  couch; that coupling is gone.
- **Close-up / second-camera art was tried and cut.** Zooming in threw away the visual
  cohesion that one shared pixel grid buys, which is the whole reason the room, the mouse
  and the overlays read as one piece. Whole-room scenes replaced it. If more activities
  are added, ask for them the same way: *the same 1366x768 den painting with the mouse
  painted into it*, which registers at offset 0,0 and needs no cutting out at all. That is
  by far the easiest art for this pipeline to absorb — far easier than isolated sprites.
- **Reading moved from the bookshelf to the rug.** In the new angle the bookshelf is a
  wall niche well above floor level and can't be stood at; the rug has the book on it.
- **A faint vertical seam in the room's dark border is in the original artwork**, at
  source x 283 and x 1081. It is 0.6/255 and only visible under a 3x brightness boost —
  not a pipeline artifact, and not worth chasing.

## Wandering

`Wander` roams the open floor as a **graph**, not a free-for-all: nodes sit on
the two lanes, and the edges are the only routes between them, so a roaming
mouse physically cannot cross the table or walk into the couch. The two
connectors are at art **x 155** (left of the table) and **x 222** (right of the
table, left of the couch's arm) — the only two columns where crossing between
lanes is clear.

Hops are paced by actual distance, with a pause of 0.7–2.8s between them, and
the mouse faces front while it stands.

Leaving a wander hands the mouse's real standing position to whatever comes next
through `pendingFrom`, since it is out on the floor rather than at any activity.
**`walkThen()` has to check `pendingFrom` before taking its shortcut** — it skips
the walk when `currentActivity` already matches the destination, and after a
wander that value is stale, so the mouse teleported into the scene instead of
walking back to it.

## Sound

One quiet looping track at volume 0.16. Browsers refuse to start audio before the
visitor has touched the page, so the first `play()` is *expected* to fail: it
retries on the first pointer or key event anywhere, and until then the Music
button honestly reads as off rather than claiming to be on. The button is kept
out of the activity `<nav>` — that group is what the mouse is doing; this is the
room's own sound and it is the visitor's to switch off.

The file is 4.7 MB at 256 kbps, which dominates the repo. `afconvert` can halve
it (`-f mp4f -d aac -b 128000`, ~2.4 MB) if load time ever matters; there is no
MP3 encoder on this machine, so that would mean switching the element to `.m4a`.

## The interface

*Pixelated Elegance* (public domain, CC0) sets the buttons. Its design grid is
**9 px to the em** — cap height 7, x-height 6, descender 1 — so it only renders
crisp at whole multiples of 9px. The buttons use **18px** (2x). A size between
multiples puts the glyph edges between screen pixels and the whole point is lost;
if the size changes, change it to 27 or back to 9, not to 16 or 20.

The button outline is four offset `box-shadow`s rather than a `border`, which
leaves the corners **notched out** — square and stepped, the same shape the room
is drawn in. A real border rounds or antialiases them however thin it is. The
thickness is `--px`, which drops from 3px to 2px on small screens so the frames
stay in proportion.

## There is no seated sprite

The old `mouse_sit` pose read awkwardly and is **gone** — deleted from `POSES`
in the build, from `SPRITES` in the script, and off disk. The couch instead
rests on the painted `scene_couch_1` frame, in idle exactly as in the Cocoa and
Movie modes, so the mouse only ever sits on the couch one way. `settleInto()`
switches on `activity.restFrame` to do it.

## Currently unused, kept as materials

The painted couch scenes replaced the old way of showing a dark room, so these
are still built and still listed as materials but the page no longer loads them:

- `den_bg_dark.png` — the room's lights-off state, with no mouse in it
- `mouse_*_dark.png` — the six poses at the measured 0.55 dim

They are what a *sprite* in a dark room needs. If the mouse should ever be
somewhere other than the couch with the lamps down, they are already there;
`setPose` just has to pick the `_dark` variant again. If that never happens,
drop them from `POSES`/`ROOM_DARK` in the build script.

## Next steps

**Art still needed (must be generated, cannot be produced from code):**
- **Two more genuinely different fire frames** — the current three exports are identical,
  so the fire animates on two frames. Three or four would read much better.
- **The lights-off fireplace with the room's other flame**, so the fire keeps flickering
  during a movie instead of holding still.
- A second walk frame (opposite leg forward) → upgrades the 2-frame walk cycle to 3–4
- **More whole-room scenes** are the cheapest way to add moments — the same den painting
  with the mouse painted in. Drop them next to the originals, add them to `SCENES` in
  `tools/build_assets.py`, and they register automatically.
- **Isolated sprite poses** are still what the *autonomous* mouse needs, since only a
  sprite can walk around. `tools/pose-spec.md` has the canvas, backdrop colour and
  framing rules if a new idle pose is wanted.
- Fire-tending and sleeping as *isolated poses on a flat dark background*, framed like
  poses (1)–(3), if those activities should have their own art
- Generate poses in a single batch where possible — separate requests drift in zoom and
  head size. The sit pose's head still reads slightly large from this.
- New poses no longer need dimensions measured by hand: declare them in the build
  script's `POSES` table as `(file, height_ratio)` — e.g. `("Mug Hold.png", 0.86)` — and
  the width follows the source's own proportions.

**Build work:**
- Push to GitHub (Part 1 requirement)
- Set `TEST_MODE = false` before submission
- Finish the README materials list: real final inventory + attribution
- Consider: audio (`assets/audio/` exists but is empty), a fourth activity, and whether
  the mouse should ever repeat an activity twice in a row (currently it can, so it
  sometimes stays put through a cycle)
