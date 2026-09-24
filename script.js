// Cozy Mouse Den — activity state machine
// The mouse moves on to something else every 5–15 minutes, on its own. The
// buttons prompt that change early rather than seizing control: the mouse goes
// where it is asked, stays for an ordinary stint, and then carries on choosing
// for itself.

// TEST_MODE shrinks the time unit from minutes to seconds so transitions are
// visible while building. Leave it false for the real pacing.
const TEST_MODE = false;
const UNIT = TEST_MODE ? 2 * 1000 : 60 * 1000;

// Every activity lasts the same 5–15 minutes, so nothing reads as a short stop
// on the way to something else.
const STINT_MIN = 5 * UNIT;
const STINT_MAX = 15 * UNIT;

// The art grid every asset is authored on. Sprite art dimensions are given in
// these same units, so a pose's on-screen size is just its art height over the
// frame's art height — no separate scale factor to keep in sync.
const ART_W = 384;
const ART_H = 216;

// Standing poses are 36 art px tall against the room's 216. Every other pose
// was cut against that same ruler at build time, so the character never
// changes size as it moves.
const STANDING_ART_H = 36;

const SPRITES = {
  front: { file: "mouse_front", w: 22, h: 36 },
  side:  { file: "mouse_side",  w: 23, h: 36 },
  back:  { file: "mouse_back",  w: 19, h: 36 },
  walk:  { file: "mouse_walk",  w: 29, h: 34 },
  lie:   { file: "mouse_lie",   w: 31, h: 18 },
};

// Positions are the character's centre and ground contact, in percent of the
// frame. Each activity has a `rest` (where it ends up, measured off the painted
// scene so the sprite hands over without a jump) and an `exits` entry per lane
// it can reach.
//
// There are two lanes across the room, both horizontal, so the long leg of any
// trip cannot wander into furniture:
//
//   front  art y 152 — on the rug, which is fine to walk on, and below the
//          coffee table's base at y 147, which is not
//   back   art y 120 — behind the table, along its top edge, between the rug
//          and the middle of the room
//
// The rug is front-only on purpose: it rests *below* the table, so stepping up
// to the back lane from there would walk straight through it.
// Apparent size falls off toward the back of the room. This is calibrated
// against the painted art rather than invented: the standing mouse at the
// hearth (`scene_fire_1`, ground contact at art y 120) is 32 art px tall, where
// the sprite's own ruler is 36 — so the artist's own room is already about 11%
// smaller back there. Extending that gradient forward gives the floor its depth.
const DEPTH_AT_Y = 120;
const DEPTH_AT_SCALE = 32 / 36;
const DEPTH_PER_PX = 0.0047;   // ~1.08x down at the front lane, ~0.88x at the back

let depthNow = 1;

// Reads the position off the computed style, so it is right whether the mouse
// was placed directly or is mid-walk.
function updateDepth() {
  const denH = denEl.clientHeight;
  if (!denH) return;
  const bottomPx = parseFloat(getComputedStyle(mouseEl).bottom) || 0;
  const y = ART_H - (bottomPx / denH) * ART_H;
  const next = DEPTH_AT_SCALE + (y - DEPTH_AT_Y) * DEPTH_PER_PX;
  if (Math.abs(next - depthNow) < 0.001) return;
  depthNow = next;
  if (currentPose) applyPoseSize();
}

function applyPoseSize() {
  const sprite = SPRITES[currentPose];
  mouseEl.style.height = `${(sprite.h / ART_H) * 100 * depthNow}%`;
}

const LANES = {
  front: "29.630%",   // art y 152 of 216
  back: "44.444%",    // art y 120 of 216
};

const ACTIVITIES = {
  fire: {
    weight: 3,
    // art (147, 119) — exactly where `scene_fire_1` paints the mouse standing
    rest: { left: "38.281%", bottom: "44.907%" },
    exits: { front: "39.583%", back: "39.583%" },
    pose: "back",
    flip: false,
  },
  read: {
    weight: 2,
    rest: { left: "46.875%", bottom: "26.1%" },
    exits: { front: "46.875%" },
    pose: "lie",
    flip: false,
  },
  movie: {
    weight: 2,
    // art (256, 129) — where `scene_couch_1` paints it sitting
    rest: { left: "66.667%", bottom: "40.278%" },
    // front: left of the couch and out in front of it, so getting up is a step
    // down onto the floor. back: art x 226, clear of the couch's left arm.
    exits: { front: "63.281%", back: "58.854%" },
    // The couch is never a sprite: it rests on the painted frame instead.
    restFrame: "scene_couch_1",
    // Where the sprite stands the instant it gets up, and the spot it walks to
    // before the painting seats it — art (245, 143), the floor at the couch's
    // near corner. `rest` is the *sitting* mouse's ground contact, up on the
    // cushion, which is no place for a standing sprite.
    stand: { left: "63.802%", bottom: "33.796%" },
  },
};

// --- Wandering ---------------------------------------------------------------
// Open floor, as a graph rather than a free-for-all: nodes sit on the two lanes
// and the edges are the only routes between them, so a roaming mouse physically
// cannot cross the coffee table or walk into the couch. The two connectors are
// at art x 155 (left of the table) and x 222 (right of the table, left of the
// couch's arm) — the only two columns where crossing between lanes is clear.
const WANDER_NODES = {
  f0: { left: "40.365%", bottom: LANES.front, lane: "front", x: 155 },
  f1: { left: "49.479%", bottom: LANES.front, lane: "front", x: 190 },
  f2: { left: "57.813%", bottom: LANES.front, lane: "front", x: 222 },
  f3: { left: "65.104%", bottom: LANES.front, lane: "front", x: 250 },
  b0: { left: "40.365%", bottom: LANES.back, lane: "back", x: 155 },
  b1: { left: "49.479%", bottom: LANES.back, lane: "back", x: 190 },
  b2: { left: "57.813%", bottom: LANES.back, lane: "back", x: 222 },
};

const WANDER_EDGES = {
  f0: ["f1", "b0"],
  f1: ["f0", "f2"],
  f2: ["f1", "f3", "b2"],
  f3: ["f2"],
  b0: ["b1", "f0"],
  b1: ["b0", "b2"],
  b2: ["b1", "f2"],
};

const WANDER_PAUSE_MIN = 700;
const WANDER_PAUSE_MAX = 2800;

// The only two columns where crossing between the lanes is clear: left of the
// table, and right of it but left of the couch's arm. Anything that cannot reach
// a lane directly gets there through one of these.
const CONNECTORS = ["40.365%", "57.813%"];   // art x 155 and 222

// Either route round the table, picked fresh each trip, so the mouse does not
// wear the same groove across the floor all evening. Both lanes are always
// reachable now — anywhere that cannot join one directly goes via a connector —
// so this is a straight coin toss rather than a filter.
function pickLane() {
  const names = Object.keys(LANES);
  return names[Math.floor(Math.random() * names.length)];
}

// Where a place joins a given lane: directly if it has an exit on it, otherwise
// out to its own lane and along to the nearest connector to cross.
function laneEntry(place, lane) {
  if (place.exits[lane]) return { left: place.exits[lane], direct: true };
  const ownLane = Object.keys(LANES).find((k) => place.exits[k]);
  const ownX = artX(place.exits[ownLane]);
  const conn = CONNECTORS.reduce((a, b) =>
    Math.abs(artX(b) - ownX) < Math.abs(artX(a) - ownX) ? b : a);
  return { left: conn, direct: false, ownLane, ownLeft: place.exits[ownLane] };
}

const WALK_FRAME_MS = 180; // choppy on purpose — reads as retro, not smooth

// A trip is three legs: off the furniture onto the lane, along the lane, then
// up to the next resting spot. Each leg's time is cut into walk-frame hops.
// Legs are paced by how far they actually are rather than by their role, so a
// step off the couch is brisk and crossing the room is not, without either
// being hand-tuned. The floor is one walking speed throughout.
const MS_PER_ART_PX = 21;
const MIN_LEG_MS = 380;

// Before it goes anywhere the mouse turns on the spot to face the way it is
// about to walk. Without this beat it slides off sideways on the first frame,
// which reads as being dragged rather than deciding to go.
const TURN_MS = 420;

// How long the lamps take to go down, and back up. Must match the CSS.
const NIGHT_FADE_MS = 1600;

// Settling onto the couch before the lamps go down, so the fade has a mouse to
// fade around rather than revealing one.
const SETTLE_BEFORE_NIGHT_MS = 700;

// Only two frames of fire were painted, so holding each for a random slice of
// time is what separates a flicker from a two-stroke strobe.
const FIRE_MIN_MS = 90;
const FIRE_MAX_MS = 240;

// Movie is not a looping scene but a small sequence: walk over, sit down, and
// only then let the lamps go down.
const COUCH_LIT = "scene_couch_1";
const COUCH_DARK = "scene_couch_2";
const COUCH_RESTS_AT = "movie";
const CHILL_RESTS_AT = "read";

// The television only plays while the lamps are down and the mouse is on the
// couch — that is the one frame with a lit screen in it. Six generated frames
// of the glass, cycled fast enough to read as a picture rather than a slideshow.
const TV_FRAMES = 6;
const TV_MIN_MS = 170;
const TV_MAX_MS = 400;

// Whole-room scenes. Each frame is [file, minHoldMs, maxHoldMs] and the cycle
// loops, so a scene has its own rhythm rather than a metronome: the mouse sits
// with the fire far longer than it takes to set a log on it, and it holds the
// mug a while between sips.
const SCENES = {
  // ownFire: the scene repaints the fireplace itself, so the room's two-frame
  // flicker has to stand down for it.
  // restsAt: which activity position the scene leaves the mouse in, so the
  // sprite takes over standing where the painting last showed it rather than
  // snapping across the room.
  fire: { ownFire: true, restsAt: "fire", frames: [
    ["scene_fire_1", 620, 760],
    ["scene_fire_2", 620, 760],
    ["scene_fire_1", 620, 760],
    ["scene_fire_2", 620, 760],
    ["scene_fire_1", 620, 760],
    ["scene_fire_2", 620, 760],
    ["scene_fire_3", 9000, 17000],  // sits back to watch it catch
  ] },
  // enterWith: the frame to land on before the loop starts. Cocoa arrives on
  // the same plain sitting-on-the-couch frame the movie lands on, so the walk
  // always hands over to the mouse simply sitting there, and the mug appears a
  // beat later rather than in the mouse's paws the instant it sits down.
  cocoa: {
    ownFire: false, restsAt: "movie", enterWith: [COUCH_LIT, 700], frames: [
    ["scene_cocoa_1", 2600, 5200],  // holding the mug
    ["scene_cocoa_2", 1100, 2000],  // a sip
    ],
  },
};

let nudgedNext = null;
let currentActivity = null;
let currentTimer = null;
let walkTimer = null;
let walkInterval = null;
let fireTimer = null;
let roomIsDark = false;
let currentPose = null;
let currentFlip = false;
let mode = "idle";
let sceneTimer = null;
let turnTimer = null;
let walkStride = true;
let pendingFrom = null;
let resumeMoving = false;
let wanderAt = null;
let wanderPrev = null;
let facingLeftNow = false;
let nightTimer = null;
let tvTimer = null;
let modeTimer = null;

const denEl = document.getElementById("den");
const mouseEl = document.getElementById("mouse");
const fireEl = document.getElementById("fire");
const tvOffEl = document.getElementById("tv-off");
const tvZoneEl = document.getElementById("zone-tv");
const sceneEl = document.getElementById("scene");
const sceneFadeEl = document.getElementById("scene-fade");
const tvMovieEl = document.getElementById("tv-movie");
const holidayEl = document.getElementById("holiday");
const musicEl = document.getElementById("music");
const soundEl = document.getElementById("sound");
// Scoped to the activity group on purpose. The holiday and music switches are
// not modes, and setMode sets aria-pressed across everything it finds here --
// unscoped, pressing any activity button would silently flip both switches off
// while the decorations stayed up and the music kept playing.
const controlEls = Array.from(document.querySelectorAll(".controls .control"));

function setPose(poseName, flip) {
  currentPose = poseName;
  currentFlip = flip;
  const s = SPRITES[poseName];
  mouseEl.style.backgroundImage = `url("assets/images/${s.file}.png")`;
  mouseEl.style.aspectRatio = `${s.w} / ${s.h}`;
  applyPoseSize();
  mouseEl.style.transform = flip
    ? "translateX(-50%) scaleX(-1)"
    : "translateX(-50%)";
}

// The lamps going down is the only fade in the piece. By the time it runs the
// mouse is already sitting on the couch in the frame underneath, so the fade is
// the light changing around it rather than the mouse appearing out of nowhere.
function setNight(on) {
  if (on === roomIsDark) return;
  roomIsDark = on;
  denEl.classList.toggle("night", on);
  document.documentElement.classList.toggle("night", on);
  tvOffEl.hidden = on;
  tvZoneEl.setAttribute("aria-pressed", String(on));

  clearTimeout(nightTimer);
  // The picture keeps moving right through the fade out, so the television is
  // never a frozen still while it is still visible.
  if (on) startTvMovie();
  // Going dark, the flicker stops before the fade does, so nothing is moving
  // underneath a half-transparent dark frame. Coming back up, it waits for the
  // fade to finish — start it early and the fire visibly jumps brighter through
  // the dissolve.
  stopFire();
  if (!on) {
    nightTimer = setTimeout(() => {
      if (!roomIsDark) {
        startFire();
        stopTvMovie();
      }
    }, NIGHT_FADE_MS);
  }
}

function startTvMovie() {
  stopTvMovie();
  let i = 0;
  const tick = () => {
    i = (i % TV_FRAMES) + 1;
    tvMovieEl.src = `assets/images/tv_movie_${i}.png`;
    tvTimer = setTimeout(tick, TV_MIN_MS + Math.random() * (TV_MAX_MS - TV_MIN_MS));
  };
  tick();
}

function stopTvMovie() {
  clearTimeout(tvTimer);
  tvTimer = null;
}

function startFire() {
  stopFire();
  let onA = true;
  const tick = () => {
    onA = !onA;
    fireEl.src = `assets/images/fire_${onA ? "a" : "b"}.png`;
    fireTimer = setTimeout(
      tick,
      FIRE_MIN_MS + Math.random() * (FIRE_MAX_MS - FIRE_MIN_MS)
    );
  };
  tick();
}

function stopFire() {
  clearTimeout(fireTimer);
  fireTimer = null;
}

function stopScene() {
  clearTimeout(sceneTimer);
  sceneTimer = null;
  denEl.classList.remove("scene-on", "scene-keeps-fire");
}

// Nothing is ever painted into place: the mouse walks to where a scene is about
// to show it, and the painting only takes over once it has arrived. If it is
// already standing there, the scene cuts straight in with no pointless lap.
function walkThen(activity, onArrive) {
  // `pendingFrom` means the mouse is standing out on the floor after a wander,
  // not at `currentActivity` at all — taking the shortcut there teleports it.
  if (currentActivity === activity && !pendingFrom) {
    onArrive();
    return;
  }
  goToActivity(activity, onArrive);
}

// Walk to the couch, sit down, and only then let the lamps go. The painted
// couch frame is swapped in the instant the walk ends -- same pose, same spot --
// so the cut is invisible and the fade that follows has something to fade with.
function playMovie() {
  sceneFadeEl.src = `assets/images/${COUCH_DARK}.png`;

  walkThen(COUCH_RESTS_AT, () => {
    sceneEl.src = `assets/images/${COUCH_LIT}.png`;
    denEl.classList.add("scene-on", "scene-keeps-fire");
    sceneTimer = setTimeout(() => setNight(true), SETTLE_BEFORE_NIGHT_MS);
  });
}

function playScene(name) {
  const { frames, ownFire, restsAt, enterWith } = SCENES[name];

  walkThen(restsAt, () => {
    // The flame is left alone until the walk is over: the room is still the
    // room while the mouse crosses it, and only the arriving scene decides
    // whether it paints its own fire.
    if (ownFire) stopFire();
    else if (!fireTimer && !roomIsDark) startFire();

    let i = 0;
    const show = () => {
      const [file, minMs, maxMs] = frames[i];
      sceneEl.src = `assets/images/${file}.png`;
      i = (i + 1) % frames.length;
      sceneTimer = setTimeout(show, minMs + Math.random() * (maxMs - minMs));
    };

    denEl.classList.add("scene-on");
    denEl.classList.toggle("scene-keeps-fire", !ownFire);

    if (enterWith) {
      const [file, holdMs] = enterWith;
      sceneEl.src = `assets/images/${file}.png`;
      sceneTimer = setTimeout(show, holdMs);
    } else {
      show();
    }
  });
}

function setMode(next) {
  const leaving = mode;
  if (next === mode) next = "idle";
  mode = next;

  for (const el of controlEls) {
    el.setAttribute("aria-pressed", String(el.dataset.mode === mode));
  }

  clearTimeout(currentTimer);
  clearTimeout(walkTimer);
  clearTimeout(turnTimer);
  clearTimeout(sceneTimer);
  clearTimeout(modeTimer);
  stopWalking();

  // Whatever was on screen is where the mouse actually is, so the sprite
  // resumes from there instead of snapping back to where it stood before.
  if (leaving === "wander" && wanderAt) {
    const node = WANDER_NODES[wanderAt];
    pendingFrom = { exits: { [node.lane]: node.left } };
  } else if (leaving && SCENES[leaving]) {
    currentActivity = SCENES[leaving].restsAt;
  } else if (leaving === "movie") {
    currentActivity = COUCH_RESTS_AT;
  } else if (leaving === "chill") {
    currentActivity = CHILL_RESTS_AT;
  }

  if (mode === "movie") {
    stopScene();
    playMovie();
    return;
  }

  const wasDark = roomIsDark;
  setNight(false);

  const begin = () => {
    stopScene();
    if (!fireTimer && !roomIsDark) startFire();

    if (mode === "wander") return startWander();
    if (mode === "chill") return goToActivity(CHILL_RESTS_AT);
    if (SCENES[mode]) return playScene(mode);

    // A stint that ran its course sends the mouse somewhere new; a button
    // pressed to cancel one leaves it where it is, and the clock restarts.
    if (resumeMoving) {
      resumeMoving = false;
      return goToActivity(pickNextActivity());
    }
    if (currentActivity) return settleInto(currentActivity);
    goToActivity(pickRandomActivity());
  };

  // Coming out of a movie, the lamps come all the way back up before anything
  // else happens at all. The painted couch frame is held for the whole fade, so
  // the mouse is still sitting there in the light before it gets up — standing
  // up mid-dissolve was the thing that gave the cut away.
  if (wasDark) {
    modeTimer = setTimeout(begin, NIGHT_FADE_MS);
  } else {
    begin();
  }
}

// Never the activity it is already doing: the whole point of the 5–15 minute
// clock is that the mouse *moves* when it runs out, and drawing the same one
// again would leave it sitting in the same spot for half an hour.
function pickRandomActivity() {
  const names = Object.keys(ACTIVITIES).filter((n) => n !== currentActivity);
  const total = names.reduce((sum, n) => sum + ACTIVITIES[n].weight, 0);
  let roll = Math.random() * total;
  for (const name of names) {
    roll -= ACTIVITIES[name].weight;
    if (roll <= 0) return name;
  }
  return names[names.length - 1];
}

function pickNextActivity() {
  if (nudgedNext && nudgedNext !== currentActivity) {
    const chosen = nudgedNext;
    nudgedNext = null;
    return chosen;
  }
  return pickRandomActivity();
}

function randomDuration() {
  return STINT_MIN + Math.random() * (STINT_MAX - STINT_MIN);
}

// Alternating two frames is how 8-bit walk cycles worked; with only a
// stride frame and a standing frame available, that is a genuine cycle.
// The cycle itself is driven by runLegs, so each frame change is also a step.
function startWalking() {
  walkStride = true;
}

function stopWalking() {
  clearInterval(walkInterval);
  walkInterval = null;
}

function settleInto(name) {
  const activity = ACTIVITIES[name];
  stopWalking();
  mouseEl.style.transitionDuration = "0ms";
  updateDepth();
  // The sprite stays on the floor where it stopped; only the painting sits.
  if (activity.restFrame) {
    // The couch has a painted frame of the mouse sitting on it, which reads far
    // better than any sprite pose, so the painting takes the rest.
    sceneEl.src = `assets/images/${activity.restFrame}.png`;
    denEl.classList.add("scene-on", "scene-keeps-fire");
  } else {
    setPose(activity.pose, activity.flip);
  }

  // The clock runs the same whether the mouse picked this itself or was asked
  // to: a prompt buys an activity, not a permanent posting.
  currentTimer = setTimeout(endStint, randomDuration());
}

// A stint is over. If the visitor had asked for this one, that request is spent
// now — the button releases and the mouse goes back to choosing for itself.
function endStint() {
  if (mode === "idle") {
    goToActivity(pickNextActivity());
    return;
  }
  resumeMoving = true;
  setMode(mode);   // next === mode, so this releases to idle
}

// Walks the route in hops rather than a glide: every leg is cut into steps, one
// per walk frame, and the mouse jumps a step forward on the same tick the
// frame flips. Moving and animating on one clock is what makes it read as a
// rough hand-drawn walk instead of a sprite sliding along a rail. A leg with no
// sideways movement keeps the facing it already had rather than snapping to an
// arbitrary one.
function runLegs(legs, onDone) {
  const hops = [];
  let atLeft = parseFloat(mouseEl.style.left) || 0;
  let atBottom = parseFloat(mouseEl.style.bottom) || 0;
  let facingLeft = facingLeftNow;
  for (const leg of legs) {
    const toLeft = parseFloat(leg.left);
    const toBottom = parseFloat(leg.bottom);
    if (toLeft !== atLeft) facingLeft = toLeft < atLeft;
    const n = Math.max(1, Math.round(leg.ms / WALK_FRAME_MS));
    for (let k = 1; k <= n; k += 1) {
      hops.push({
        left: k === n ? leg.left : `${atLeft + (toLeft - atLeft) * k / n}%`,
        bottom: k === n ? leg.bottom : `${atBottom + (toBottom - atBottom) * k / n}%`,
        facingLeft,
      });
    }
    atLeft = toLeft;
    atBottom = toBottom;
  }

  mouseEl.style.transitionDuration = "0ms";
  // Lift a foot on the spot first, so the first hop lands on the next frame.
  if (hops.length) facingLeftNow = hops[0].facingLeft;
  setPose(walkStride ? "walk" : "side", !facingLeftNow);

  let i = 0;
  clearInterval(walkInterval);
  walkInterval = setInterval(() => {
    if (i >= hops.length) {
      stopWalking();
      updateDepth();
      onDone();
      return;
    }
    const hop = hops[i++];
    walkStride = !walkStride;
    facingLeftNow = hop.facingLeft;
    mouseEl.style.left = hop.left;
    mouseEl.style.bottom = hop.bottom;
    setPose(walkStride ? "walk" : "side", !facingLeftNow);
    updateDepth();
  }, WALK_FRAME_MS);
}

function goToActivity(name, onArrive) {
  const activity = ACTIVITIES[name];
  // Coming back from a wander the mouse is standing on the floor rather than at
  // an activity, so the caller hands in where it actually is.
  const from = pendingFrom || ACTIVITIES[currentActivity];
  const departed = pendingFrom !== null;
  pendingFrom = null;

  clearTimeout(currentTimer);
  clearTimeout(walkTimer);
  clearTimeout(turnTimer);
  stopWalking();

  const isFirstPlacement = currentActivity === null;
  const wasAt = currentActivity;
  currentActivity = name;

  if (isFirstPlacement) {
    const spot = activity.stand || activity.rest;
    mouseEl.style.transitionDuration = "0ms";
    mouseEl.style.left = spot.left;
    mouseEl.style.bottom = spot.bottom;
    settleInto(name);
    if (onArrive) onArrive();
    return;
  }

  // If a scene was still holding the last pose, the sprite takes over now —
  // under cover of the mouse starting to move, which is the least visible
  // moment for the hand-off.
  stopScene();
  mouseEl.style.transitionDuration = "0ms";

  // Off the furniture, along the lane, then up to the new spot. Skipping the
  // lane entirely when it is already standing on it keeps short trips short.
  const lane = pickLane();

  // Where a painting has been doing the sitting, the sprite takes over standing
  // on the floor beside the furniture — never on it. Cutting from the painted
  // mouse sitting on the couch to a sprite standing on the cushion was the
  // thing that looked wrong; getting up is a cut, not a climb.
  const leftPainting = Boolean(from.restFrame);
  const joinsPainting = Boolean(activity.restFrame);

  if (leftPainting) {
    mouseEl.style.transitionDuration = "0ms";
    mouseEl.style.left = from.stand.left;
    mouseEl.style.bottom = from.stand.bottom;
  }

  // Build the route a point at a time, pacing each leg by its own length and
  // dropping any that would not actually move the mouse.
  let atLeft = parseFloat(mouseEl.style.left) || 0;
  let atBottom = parseFloat(mouseEl.style.bottom) || 0;
  const legs = [];
  const go = (left, bottom) => {
    const dx = (parseFloat(left) - atLeft) / 100 * ART_W;
    const dy = (parseFloat(bottom) - atBottom) / 100 * ART_H;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.5) return;
    legs.push({
      left,
      bottom,
      ms: Math.round(Math.max(MIN_LEG_MS, dist * MS_PER_ART_PX)),
    });
    atLeft = parseFloat(left);
    atBottom = parseFloat(bottom);
  };

  if (wasAt !== name || departed) {
    const a = laneEntry(from, lane);
    if (a.direct) {
      go(a.left, LANES[lane]);
    } else {
      // out to the lane it can reach, along to the connector, then across
      go(a.ownLeft, LANES[a.ownLane]);
      go(a.left, LANES[a.ownLane]);
      go(a.left, LANES[lane]);
    }

    const b = laneEntry(activity, lane);
    go(b.left, LANES[lane]);
    if (!b.direct) {
      go(b.left, LANES[b.ownLane]);
      go(b.ownLeft, LANES[b.ownLane]);
    }
  }

  // Arriving is the same cut in reverse: walk up to the floor beside it and let
  // the painting put the mouse in the seat.
  const landing = joinsPainting ? activity.stand : activity.rest;
  go(landing.left, landing.bottom);

  // Stand still and turn to face the way it is about to go. Nothing moves for
  // this beat, which is what makes it read as deciding rather than being pulled.
  updateDepth();
  const firstTurn = legs.find(
    (l) => parseFloat(l.left) !== (parseFloat(mouseEl.style.left) || 0));
  const travelLeft = firstTurn
    ? parseFloat(firstTurn.left) < (parseFloat(mouseEl.style.left) || 0)
    : facingLeftNow;
  facingLeftNow = travelLeft;
  setPose("side", !travelLeft);

  turnTimer = setTimeout(() => {
    startWalking();
    runLegs(legs, () => {
      settleInto(name);
      if (onArrive) onArrive();
    });
  }, TURN_MS);
}

function artX(pctLeft) {
  return (parseFloat(pctLeft) / 100) * ART_W;
}

function artY(pctBottom) {
  return ART_H - (parseFloat(pctBottom) / 100) * ART_H;
}

// One hop between neighbouring floor nodes, paced by how far it actually is.
function wanderStep() {
  const here = WANDER_NODES[wanderAt];
  const options = WANDER_EDGES[wanderAt].filter((n) => n !== wanderPrev);
  const pool = options.length ? options : WANDER_EDGES[wanderAt];
  const nextKey = pool[Math.floor(Math.random() * pool.length)];
  const next = WANDER_NODES[nextKey];

  const dx = artX(next.left) - artX(here.left);
  const dy = artY(next.bottom) - artY(here.bottom);
  const ms = Math.round(Math.max(MIN_LEG_MS, Math.hypot(dx, dy) * MS_PER_ART_PX));

  wanderPrev = wanderAt;
  wanderAt = nextKey;

  const turnLeft = dx < 0 || (dx === 0 && facingLeftNow);
  facingLeftNow = turnLeft;
  setPose("side", !turnLeft);

  turnTimer = setTimeout(() => {
    startWalking();
    runLegs([{ left: next.left, bottom: next.bottom, ms }], () => {
      stopWalking();
      setPose("front", false);
      updateDepth();
      sceneTimer = setTimeout(
        wanderStep,
        WANDER_PAUSE_MIN + Math.random() * (WANDER_PAUSE_MAX - WANDER_PAUSE_MIN)
      );
    });
  }, TURN_MS);
}

// Step off whatever it was resting on, onto the nearest node of a lane it can
// reach, and start roaming from there.
function startWander() {
  const from = ACTIVITIES[currentActivity];
  const lane = Object.keys(LANES).filter((k) => from.exits[k])[0];
  const exitX = artX(from.exits[lane]);

  let best = null;
  for (const [key, node] of Object.entries(WANDER_NODES)) {
    if (node.lane !== lane) continue;
    const d = Math.abs(node.x - exitX);
    if (!best || d < best.d) best = { key, d };
  }

  clearTimeout(currentTimer);
  clearTimeout(walkTimer);
  clearTimeout(turnTimer);
  stopWalking();
  stopScene();
  mouseEl.style.transitionDuration = "0ms";

  const target = WANDER_NODES[best.key];
  wanderAt = best.key;
  wanderPrev = null;

  const goingLeft = artX(target.left) < artX(mouseEl.style.left || from.rest.left);
  facingLeftNow = goingLeft;
  setPose("side", !goingLeft);

  turnTimer = setTimeout(() => {
    startWalking();
    const dx = artX(target.left) - artX(mouseEl.style.left || from.rest.left);
    const dy = artY(target.bottom) - artY(mouseEl.style.bottom || from.rest.bottom);
    const ms = Math.round(Math.max(MIN_LEG_MS, Math.hypot(dx, dy) * MS_PER_ART_PX));
    runLegs([{ left: target.left, bottom: target.bottom, ms }], () => {
      stopWalking();
      setPose("front", false);
      sceneTimer = setTimeout(wanderStep, WANDER_PAUSE_MIN);
    });
  }, TURN_MS);

  // Roaming is an activity like any other, so it gets an ordinary stint and
  // then the mouse settles into something.
  currentTimer = setTimeout(endStint, randomDuration());
}

// --- Room tone ---------------------------------------------------------------
// Quiet enough to be the room rather than the point. The switch starts off and
// only ever reflects what the audio is actually doing: a browser can refuse to
// start playback, and the `play()` promise is the only honest answer about
// whether it did. Reflecting on the element's own play/pause events rather than
// on the click means the knob cannot end up claiming sound the room is not
// making.
const MUSIC_VOLUME = 0.16;

function reflectMusic() {
  soundEl.setAttribute("aria-pressed", String(!musicEl.paused));
}

function toggleMusic() {
  if (musicEl.paused) {
    musicEl.volume = MUSIC_VOLUME;
    musicEl.play().then(reflectMusic).catch(reflectMusic);
  } else {
    musicEl.pause();
  }
}

soundEl.addEventListener("click", toggleMusic);
musicEl.addEventListener("play", reflectMusic);
musicEl.addEventListener("pause", reflectMusic);

// --- Holiday mode ------------------------------------------------------------
// Dressing the room, not an activity: the decorations go up and come down
// without touching what the mouse is doing or where it is. Everything else here
// is CSS -- the set fades in, and its dimmed copy rides the lamps.
function setHoliday(on) {
  denEl.classList.toggle("holiday", on);
  holidayEl.setAttribute("aria-pressed", String(on));
}

holidayEl.addEventListener("click", () => {
  setHoliday(!denEl.classList.contains("holiday"));
});

function nudge(activity) {
  nudgedNext = activity;
}

for (const el of controlEls) {
  el.addEventListener("click", () => setMode(el.dataset.mode));
}

// Clicking the set itself is the same request as the Movie button, so that the
// two controls can't disagree about what the room is doing.
tvZoneEl.addEventListener("click", () => setMode("movie"));

document.getElementById("zone-fire").addEventListener("click", () => nudge("fire"));
document.getElementById("zone-movie").addEventListener("click", () => nudge("movie"));
document.getElementById("zone-read").addEventListener("click", () => nudge("read"));

// Frames that only appear on a swap — the second fire frame, the lights-off
// room, the dimmed poses — would otherwise fetch mid-animation and flash.
function preload() {
  const names = ["fire_b"];
  for (const { frames } of Object.values(SCENES)) {
    for (const [file] of frames) names.push(file);
  }
  names.push(COUCH_LIT, COUCH_DARK);
  for (let i = 1; i <= TV_FRAMES; i += 1) names.push(`tv_movie_${i}`);
  for (const n of names) new Image().src = `assets/images/${n}.png`;
}

preload();
startFire();
goToActivity(pickRandomActivity());
