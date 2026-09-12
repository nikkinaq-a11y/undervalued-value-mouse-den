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
  - `Mouse Den 3.png` — the background currently in use
  - `Mouse Den.png`, `Mouse Den 2.png` — earlier background versions, unused
  - `Mouse Gen3a/3b/3c.png` — front / side / back mouse poses
  - `ChatGPT Image ... (1)–(5).png` — (1) walk, (2) sit, (3) lie, (4) sleeping, (5) fire-tending
- **Built site:** `index.html`, `style.css`, `script.js`, `assets/images/`

## Status

Working: the room renders, the mouse cycles between three activities on its own timer,
walks between them with a two-frame cycle, and clicking a zone nudges what it does next.

**Not done: the GitHub repo.** Everything is committed locally only (6 commits). `gh` CLI
is not installed on this machine, so the remote was never created. To finish Part 1:
create the repo on github.com, then:

```
git remote add origin https://github.com/<username>/undervalued-value-mouse-den.git
git push -u origin main
```

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
- Room art grid: **400 px wide** (`den_bg.png` is that grid upscaled 3x → 1200x1095)
- Standing mouse sprite: **82 art px tall**, displayed at **22.5% of frame height**
- Frame aspect ratio: **1313 / 1198** (Den 3's native aspect)

These came from measuring Den 3's couch (22% of frame width) against the old den's couch
(88 art px) — matching them is what fixes both the grid size and the mouse's height.

**If the background art changes again, or the mouse's display size changes, the sprites
must be regenerated at a new resolution — never just scaled in CSS.** Stretching a sprite
is what made the mouse look "too pixelated" earlier: a 49px sprite blown up to half the
frame rendered at ~6.7 screen px per art px against the room's ~4.

Poses are sized against one ruler in `script.js` (`STANDING_ART_H` / `STANDING_PCT`), so
each pose's element height and aspect-ratio derive from its own art dimensions. This is
why the character doesn't change size when it sits or lies down.

Current sprite dimensions: front 49x82, side 52x82, back 44x82, walk 67x78, sit 57x70,
lie 70x42.

## Asset pipeline

Scripts live in the session scratch dir (not the repo) — the core is ~40 lines of Pillow:
flood-fill the flat background to transparency, downscale with `BOX`, quantize to a fixed
palette with `MEDIANCUT` and no dithering, then upscale with `NEAREST`.

Two things that matter when processing new art:

1. **Quantize all mouse poses together against one shared palette.** Separately quantized
   sprites shift color between frames, which flickers during animation.
2. **Color count depends on how much flat area the image has.** The original den needed
   28 colors; Den 3 needed **128**. Its large flat earth border dominates the population
   count in median-cut and starves the fire, plants, couch, and window — at 32 colors the
   art came out badly washed out, nearly monochrome.

## Decisions already made (don't redo these)

- **Animated overlays were tried and rejected.** CSS-filter fire flicker, a TV on/off
  layer, pulsing ambient glows, and window twinkles all read as artificial over the
  painted art. Removed. Real animation needs real frames, not filters.
- **The procedural dirt surround was replaced** by Den 3's built-in earth border.
- **Mouse scale** was chosen from a 4-option visual comparison; 50%-of-old-frame
  ("full resident scale") was picked over smaller options. The house is mouse-sized, so
  the mouse reads as its resident, not a pet.
- **Images (4) sleeping and (5) fire-tending are unusable as sprites** — they are full
  illustrated scenes with their own blankets/fireplace/props that don't match the den.

## Next steps

**Art still needed (must be generated, cannot be produced from code):**
- A second walk frame (opposite leg forward) → upgrades the 2-frame cycle to 3–4 frames
- Fire-tending and sleeping as *isolated poses on a flat dark background*, framed like
  poses (1)–(3), if those activities should have their own art
- Generate poses in a single batch where possible — separate requests drift in zoom and
  head size. The sit pose's head still reads slightly large from this.

**Build work:**
- Push to GitHub (Part 1 requirement)
- Set `TEST_MODE = false` before submission
- Update README: it still lists fireplace/TV/book assets that no longer exist, and the
  materials list needs the real final inventory + attribution
- Consider: audio (`assets/audio/` exists but is empty), a fourth activity, and whether
  the mouse should ever repeat an activity twice in a row (currently it can, so it
  sometimes stays put through a cycle)
