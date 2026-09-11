// Cozy Mouse Den — activity state machine
// The mouse cycles between activities at its own pace, walking between them.
// A visitor can "nudge" what it does next by clicking a zone, but never
// interrupts whatever it is already doing.

// TEST_MODE shrinks the time unit from minutes to seconds so transitions
// are visible while building. Set to false for the real idle pacing.
const TEST_MODE = true;
const UNIT = TEST_MODE ? 2 * 1000 : 60 * 1000;

// Standing poses are 82 art px tall and read as 22.5% of the frame height,
// which matches the mouse to the room's furniture. Every other pose is
// scaled from that same ruler so the character never changes size.
const STANDING_ART_H = 82;
const STANDING_PCT = 22.5;

const SPRITES = {
  front: { file: "mouse_front.png", w: 49, h: 82 },
  side:  { file: "mouse_side.png",  w: 52, h: 82 },
  back:  { file: "mouse_back.png",  w: 44, h: 82 },
  walk:  { file: "mouse_walk.png",  w: 67, h: 78 },
  sit:   { file: "mouse_sit.png",   w: 57, h: 70 },
  lie:   { file: "mouse_lie.png",   w: 70, h: 42 },
};

const ACTIVITIES = {
  fire: {
    minMs: 2 * UNIT,
    maxMs: 2 * UNIT,
    weight: 3,
    position: { left: "25%", bottom: "31%" },
    pose: "back",
    flip: false,
  },
  read: {
    minMs: 5 * UNIT,
    maxMs: 15 * UNIT,
    weight: 2,
    position: { left: "36%", bottom: "26%" },
    pose: "lie",
    flip: false,
  },
  movie: {
    minMs: 5 * UNIT,
    maxMs: 15 * UNIT,
    weight: 2,
    position: { left: "68%", bottom: "38%" },
    pose: "sit",
    flip: false,
  },
};

const WALK_FRAME_MS = 180; // choppy on purpose — reads as retro, not smooth
const WALK_MS = 2400;      // must match the CSS transition duration

let nudgedNext = null;
let currentActivity = null;
let currentTimer = null;
let walkTimer = null;
let walkInterval = null;

const mouseEl = document.getElementById("mouse");

function setPose(poseName, flip) {
  const s = SPRITES[poseName];
  mouseEl.style.backgroundImage = `url("assets/images/${s.file}")`;
  mouseEl.style.height = `${STANDING_PCT * (s.h / STANDING_ART_H)}%`;
  mouseEl.style.aspectRatio = `${s.w} / ${s.h}`;
  mouseEl.style.transform = flip ? "scaleX(-1)" : "scaleX(1)";
}

function pickRandomActivity() {
  const names = Object.keys(ACTIVITIES);
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

function randomDuration(name) {
  const { minMs, maxMs } = ACTIVITIES[name];
  return minMs + Math.random() * (maxMs - minMs);
}

// Alternating two frames is how 8-bit walk cycles worked; with only a
// stride frame and a standing frame available, that is a genuine cycle.
function startWalking(facingLeft) {
  let stride = true;
  setPose("walk", !facingLeft);
  walkInterval = setInterval(() => {
    stride = !stride;
    setPose(stride ? "walk" : "side", !facingLeft);
  }, WALK_FRAME_MS);
}

function stopWalking() {
  clearInterval(walkInterval);
  walkInterval = null;
}

function settleInto(name) {
  const activity = ACTIVITIES[name];
  stopWalking();
  setPose(activity.pose, activity.flip);

  const duration = randomDuration(name);
  currentTimer = setTimeout(() => goToActivity(pickNextActivity()), duration);
}

function goToActivity(name) {
  const activity = ACTIVITIES[name];
  const fromLeft = parseFloat(mouseEl.style.left) || 0;
  const toLeft = parseFloat(activity.position.left);
  const facingLeft = toLeft < fromLeft;

  clearTimeout(currentTimer);
  clearTimeout(walkTimer);

  const isFirstPlacement = currentActivity === null;
  currentActivity = name;

  mouseEl.style.left = activity.position.left;
  mouseEl.style.bottom = activity.position.bottom;

  if (isFirstPlacement) {
    settleInto(name);
    return;
  }

  startWalking(facingLeft);
  walkTimer = setTimeout(() => settleInto(name), WALK_MS);
}

function nudge(activity) {
  nudgedNext = activity;
}

document.getElementById("zone-fire").addEventListener("click", () => nudge("fire"));
document.getElementById("zone-movie").addEventListener("click", () => nudge("movie"));
document.getElementById("zone-read").addEventListener("click", () => nudge("read"));

goToActivity(pickRandomActivity());
