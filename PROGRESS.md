# Cozy Mouse Den — Progress & Handoff

Working notes for resuming this project in a fresh session. Last updated 2026-09-15.

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

**The source art is now committed**, under `content/art/`, renamed to match what each
file produces. `tools/build_assets.py` reads from there rather than from outside the repo,
so a clone can rebuild everything — verified byte-identical. `content/README.md` has the
mapping.

Note the originals had been moved into `Mouse Den Content/` outside the repo, which had
quietly broken the build's old `../` paths; pointing it at `content/art/` fixes that for
good.

## Running it

```
python3 -m http.server 8731      # from the repo root, then open localhost:8731
```

**Gotcha that already cost time:** Chrome aggressively caches `script.js`. A normal
refresh can silently keep running old code — this looked exactly like "the animation is
broken." Always hard-reload (**Cmd+Shift+R**) after editing JS.

## Pacing

The mouse moves on every **5–15 minutes**, the same stint for every activity
(`STINT_MIN`/`STINT_MAX`). It never draws the activity it is already doing, so the clock
running out always means it actually goes somewhere.

**The buttons prompt rather than hold.** Pressing one sends the mouse there now; it stays
for an ordinary stint and then carries on choosing for itself, releasing the button as it
goes. Pressing the lit button cancels the request early and leaves the mouse where it is.
This is what closes the "influence, not control" gap the piece is built on — an earlier
version held the mouse in place indefinitely.

`TEST_MODE` at the top of `script.js` shrinks the unit from minutes to seconds for
development. Leave it `false`.

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

Five buttons under the frame — Movie, Cocoa, Feed fire, Chill, Wander — plus the
clickable zones in the room itself. Buttons are a radio group: clicking the active
one lets the mouse go back to its own routine. The Music link sits beside them but
outside the group, and the holiday toggle sits **above** the frame; neither is a
mode (see "Holiday mode").

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

- **The room's zones no longer outline on hover.** A dashed box drawn across the
  painting on the way past reads as a seam in the art. `:focus-visible` keeps its
  outline: without it a keyboard visitor cannot tell which zone they are on, and
  unlike hover it only ever shows when someone is actually tabbing.
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

**The Music button is now a link to a Spotify playlist**, opened in its own tab:
`https://open.spotify.com/playlist/7fh2Bqm3z34GNX3tsIfmSl`. It is a real `<a>`
rather than a button, so it middle-clicks and cmd-clicks like any other link, and
it wears the `.control` look — which is why `.control` now sets `display:
inline-block` and `text-decoration: none`.

**Playback is Spotify's to start, not ours.** Opening the tab is all a page can
do; whether it plays on arrival depends on the visitor's own Spotify session. There
is no way to force it from here, so "it didn't start playing by itself" is not a
bug in this repo.

The in-page audio is gone: no `<audio>` element, and the whole room-tone block —
volume, the autoplay-unlock retry on the first gesture, `aria-pressed` reflecting
paused state — has been deleted from `script.js`.
`assets/audio/cozy-coffee.mp3` is **still on disk and still listed as a material
but no longer loaded**, so its 4.7 MB now costs nothing at load time. Delete it if
it gets dropped from the materials list.

**It sits in the top-right corner beside the holiday switch**, not in the row
under the frame: that row is what the mouse can be asked to do, and neither the
playlist nor the decorations are. It wears the same switch chrome so the two read
as a pair — but its knob never moves, because opening a tab is not an on/off
state and a switch that animated would be claiming something it cannot know.

## Holiday mode

A switch in the **top right of the window**, deliberately not in the row below the
frame: those five buttons are things the mouse can be asked to do, and dressing
the room is not one of them. Sitting it among them would read as a sixth
activity. It changes nothing about what the mouse is doing or where it is —
`setHoliday()` only toggles `.holiday` on the den and everything else is CSS.

**The decorations do not fade in or out.** The set switches on `display`, so it is
simply there or not. Nothing in this room dissolves except the lamps, and a
half-transparent pumpkin on the way in read as a glitch rather than a transition.
The knob's own slide is kept: it steps across in four frames rather than gliding,
which is motion in the control, not in the room.

**Ten pieces**, listed with their size and position in `DECOR` in
`tools/build_assets.py`: a witch's hat and a jack-o'-lantern on the right-hand
shelves, a ghost portrait beside the round window, a witch portrait by the coat
hooks, a cauldron on the floor at the hearth, and five more jack-o'-lanterns
about the floor and on the coffee table.

### Placement is read back from a picture, not typed in

**Do not hand-tune the numbers in `DECOR`.** They are produced by
`tools/read_placement.py` from `content/reference/holiday-placement.png`, which
is a screenshot of the room with the decorations dragged around over it in an
image editor. To rearrange the room, move things in that image, save it back,
run the script, and paste the table it prints:

```
python3 tools/read_placement.py     # placement image -> the DECOR table
python3 tools/build_assets.py       # -> assets/images/decor_*.png + the CSS
```

Pieces may be moved, resized and duplicated freely in that image; the reader
recovers position, size and which cut-out each one is. Scale is not locked to
anything, so the same pumpkin can appear twice at two sizes, which is what the
current arrangement does.

How it works, because the obvious approach does not: matching the cut-outs
against the room finds decorations everywhere, since the room's own warm texture
correlates with a pumpkin about as well as a pumpkin does. What makes it precise
is subtracting the clean room first and only accepting matches where the pixels
actually changed. Two details that cost a pass each:

- **Rank on correlation times coverage, not correlation alone.** A six-pixel
  witch hat out-correlated the cauldron on a corner of it while covering barely
  half of what had changed, and between them a hat and a ghost frame claimed the
  cauldron's space and left it undetected entirely.
- **Be generous about overlap.** Decorations get placed deliberately touching --
  the pumpkin leaning on the cauldron shares half its box — and a tight overlap
  threshold throws the second one away as a duplicate.

Whatever changed but matches nothing is reported and skipped, which is what
happens to the mouse and to the fireplace, since a screenshot catches whichever
flame frame was up.

### They are lit to match the room

Straight cut-outs are print-bright and land in a room lit by one fire, so each
piece is warmed and pulled down (`DECOR_WARM`, `DECOR_EXPOSURE`) and then scaled
again by **how bright the room actually is behind it**, measured off the finished
painting. That last part is what stops a pumpkin out on the dark floor being lit
as though it were sitting on the hearth. It is normalised against the average
across all the pieces, so it only redistributes the exposure rather than
brightening or darkening the set as a whole, and clamped, since close to the fire
the room is bright enough to wash a piece out.

Each piece also carries **its own contact shadow** — a soft ellipse centred on its
base line, so the top half hides behind the piece and only what falls past its
feet is seen. The shadow lives inside the image rather than in a second element,
so the CSS box just runs `shadow_h` deeper than the piece; the top stays put, and
moving a piece never means re-deriving where its shadow goes.

**Gotcha:** the alpha cannot be binarised any more. The piece wants hard pixel
edges, but binarising the whole channel turns the shadow into a solid slab with a
stepped rim — so the piece's alpha is thresholded and the shadow's gradient is
kept.

### Where the art came from, and the problem with it

`tools/cut_halloween.py` takes four stock sheets, flood-fills their flat backdrops
away from the border, and splits what is left into separate objects by
eight-connected labelling — **20 cut-outs, of which the room uses 8.** The other 12
stay in `content/art/halloween/` as material; changing which decorations are up is
an edit to the `DECOR` table, not new art.

Each cut-out is **named for what is in it** (`portrait-ghost`, `pumpkin-wink`),
from a name list given per sheet in `SHEETS`, in the order the sheet reads. The
script refuses to write anything if a sheet stops splitting into as many objects
as there are names — which is the check that catches a tolerance change quietly
merging two frames and shifting every name after it by one.

Two things the cutter has to do that are worth keeping: the jack-o'-lantern sheet
carries a **"designed by freepik"** credit under the bottom row, which is cropped
off before labelling (otherwise the lettering is read as a tenth pumpkin), and the
cauldron is ringed by loose sparkles that are their own tiny islands, so only the
largest object is kept.

**The decorations are third-party art and three of the four sheets have no known
creator or licence.** All three JPGs came off Pinterest, which is a re-host, not a
source. The Attribution table in the top-level README has the details and what to
do about it. This is the one outstanding thing that actually blocks submission —
generating the decorations the same way the room was made would settle it and match
the art better besides.

### They are drawn finer than the room, on purpose

`DECOR_SUPERSAMPLE = 1.5` in the build: each piece ships at **one and a half
times** the art grid and is displayed in the same CSS box, so its pixels are two
thirds the size of the room's. Everything else in the project is exactly one art
pixel per art pixel.

The figure was picked by rendering 2, 1.5 and 1 side by side at the same
on-screen size: **2** reads as too smooth against the room, **1** throws the
small pumpkin's face away and the cauldron's legs with it, **1.5** is chunky
while everything still reads. It does not have to be a whole number — the piece
is drawn at whatever size this gives and scaled to its box by the browser
regardless — so this is a dial, not a set of three choices.

This is a deliberate break from "The scale rule" above, asked for and worth
keeping the reason for: the decorations are **found art**, detailed line work
drawn at print resolution rather than for this grid. The room's own art survives
1x because it was painted to be reduced; this was not.

**Sizes and positions in `DECOR` stay in room art pixels** and do not change with
the supersample, so the CSS boxes are identical whatever it is set to; only the
file written to disk changes size. Set it to 1 to put them back on the room's
grid exactly.

### They do not share the room's palette

The only asset in the build that doesn't. The reason that rule exists is colour
flicker *between animation frames*, and decorations never animate; meanwhile the
room's 224 colours are browns and warm greens with no purple or saturated orange in
them, so forcing a cauldron through that palette turns it to mud. They get their
own 96-colour palette, built across all eight together so the set is consistent
with itself.

**The room's own output is untouched** — verified: after adding all of this, every
pre-existing file in `assets/images/` is byte-identical. Holiday mode off is the
room exactly as it was.

What they *do* share is the **art grid**, which is the thing that actually buys
cohesion (see "The scale rule"): a pumpkin is drawn in the same size pixel as the
couch behind it.

### Two copies of every piece, because of the lamps

`decor_*.png` and `decor_*_dark.png`, the second at the room's measured **0.55**
dim — the same factor the mouse poses take. The markup holds both sets stacked
(`.decor-lit` / `.decor-dark`); the dark one crossfades in on the same 1.6s curve as
the lamps, so the decorations go down *with* the room instead of glowing on top of
a dark painting.

**Gotcha that cost a build:** the dark pass came out no darker than the lit one.
The decoration palette was sampled from the lit pieces only, so it held no dark
entries and quantising a dimmed piece against it snapped every pixel straight back
up to the nearest bright colour. The palette has to be sampled from the dimmed
copies as well — which is what the existing pose code was already doing, and why.

### Layer order and the two placement rules

The set sits at **z-index 11, above everything** including the painted scenes. The
scenes are the same den *without* decorations, so anything lower would have them
vanish the moment the mouse sat down. That buys two constraints on placement,
which apply just as much when rearranging things in the placement image:

1. **Keep floor pieces out of art x 135–160 in the hearth band.** That is where
   both the sprite and the painted fire scenes put the mouse, and a decoration
   drawn above would cut across it.
2. **Keep off the walking lanes** — front at art y 152, back at y 120, both
   spanning roughly art x 155–250 — or the mouse walks through the decoration.

### The selector fix this needed

`controlEls` was `document.querySelectorAll(".control")` and is now scoped to
`".controls .control"`. The holiday toggle and the playlist link wear the same
`.control` look but are not modes, and `setMode()` sets `aria-pressed` across
everything in that list — unscoped, pressing any activity button would have
silently cleared the holiday button's own state.

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
- **Settle the decoration art's licensing** — the one thing that actually blocks
  submission now. Three of the four sheets have no known creator or licence; see
  Attribution in the README and "Holiday mode" above.
- Push to GitHub (Part 1 requirement)
- Set `TEST_MODE = false` before submission
- Finish the README materials list: real final inventory + attribution
- Consider: audio (`assets/audio/` exists but is empty), a fourth activity, and whether
  the mouse should ever repeat an activity twice in a row (currently it can, so it
  sometimes stays put through a cycle)
