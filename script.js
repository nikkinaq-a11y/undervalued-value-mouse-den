// Cozy Mouse Den — activity state machine
// Mouse auto-cycles between activities on its own pace. A visitor can
// "nudge" the next activity by clicking a zone, but never interrupts
// whatever the mouse is already doing. The TV and fireplace react to
// the current activity; ambient glows/twinkle run independently.

const MINUTE = 60 * 1000;

const ACTIVITIES = {
  fire: {
    minMs: 2 * MINUTE,
    maxMs: 2 * MINUTE,
    weight: 3,
    position: { left: "14%", top: "58%" },
    sprite: "assets/images/mouse_front.png",
    flip: false,
  },
  read: {
    minMs: 5 * MINUTE,
    maxMs: 15 * MINUTE,
    weight: 2,
    position: { left: "86%", top: "34%" },
    sprite: "assets/images/mouse_side.png",
    flip: true,
  },
  movie: {
    minMs: 5 * MINUTE,
    maxMs: 15 * MINUTE,
    weight: 2,
    position: { left: "70%", top: "56%" },
    sprite: "assets/images/mouse_side.png",
    flip: false,
  },
};

let nudgedNext = null;
let currentActivity = null;
let currentTimer = null;

const mouseEl = document.getElementById("mouse");
const fireLayer = document.getElementById("fire-layer");
const tvLayer = document.getElementById("tv-layer");

function pickRandomActivity() {
  const names = Object.keys(ACTIVITIES);
  const totalWeight = names.reduce((sum, name) => sum + ACTIVITIES[name].weight, 0);
  let roll = Math.random() * totalWeight;
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

function randomDuration(activity) {
  const { minMs, maxMs } = ACTIVITIES[activity];
  return minMs + Math.random() * (maxMs - minMs);
}

function goToActivity(name) {
  currentActivity = name;
  const activity = ACTIVITIES[name];

  mouseEl.style.left = activity.position.left;
  mouseEl.style.top = activity.position.top;
  mouseEl.style.backgroundImage = `url("${activity.sprite}")`;
  mouseEl.style.transform = activity.flip ? "scaleX(-1)" : "scaleX(1)";

  // The fire stays lit continuously once the den warms up; only the
  // "tending" flicker speeds up while the mouse is actively feeding it.
  fireLayer.classList.add("lit");
  fireLayer.classList.toggle("tending", name === "fire");
  tvLayer.classList.toggle("on", name === "movie");

  const duration = randomDuration(name);
  clearTimeout(currentTimer);
  currentTimer = setTimeout(() => {
    goToActivity(pickNextActivity());
  }, duration);
}

function nudge(activity) {
  nudgedNext = activity;
}

document.getElementById("zone-fire").addEventListener("click", () => nudge("fire"));
document.getElementById("zone-movie").addEventListener("click", () => nudge("movie"));
document.getElementById("zone-read").addEventListener("click", () => nudge("read"));

goToActivity(pickRandomActivity());
