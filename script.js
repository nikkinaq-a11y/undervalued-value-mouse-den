// Cozy Mouse Den — activity state machine
// Mouse auto-cycles between activities on its own pace. A visitor can
// "nudge" the next activity by clicking a zone, but never interrupts
// whatever the mouse is already doing.

const MINUTE = 60 * 1000;

const ACTIVITIES = {
  fire: { minMs: 2 * MINUTE, maxMs: 2 * MINUTE, weight: 3, zone: "zone-fire" },
  read: { minMs: 5 * MINUTE, maxMs: 15 * MINUTE, weight: 2, zone: "zone-read" },
  movie: { minMs: 5 * MINUTE, maxMs: 15 * MINUTE, weight: 2, zone: "zone-movie" },
};

const zonePositions = {
  fire: { left: "8%", bottom: "14%" },
  movie: { left: "42%", bottom: "12%" },
  read: { left: "76%", bottom: "14%" },
};

let nudgedNext = null;
let currentActivity = null;
let currentTimer = null;

const mouseEl = document.getElementById("mouse");
const fireplaceEl = document.querySelector(".fireplace");

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
  const pos = zonePositions[name];
  mouseEl.style.left = pos.left;
  mouseEl.style.bottom = pos.bottom;

  fireplaceEl.classList.toggle("lit", name === "fire");

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
