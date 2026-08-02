const KEY = "guessify-playlist-bests";

function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readAll() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

function writeAll(map) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} id
 * @param {string} [name]
 * @param {number} score
 * @returns {{ name: string, best: number, today: number }}
 */
export function recordPlaylistScore(id, name, score) {
  const key = String(id || "").trim() || "unknown";
  const pts = Math.max(0, Math.floor(Number(score) || 0));
  const label = String(name || key).trim() || key;
  const day = todayKey();
  const all = readAll();
  const prev = all[key] && typeof all[key] === "object" ? all[key] : {};

  let today = Number(prev.today) || 0;
  if (prev.todayDate !== day) today = 0;
  today = Math.max(today, pts);

  const prevBest = Number(prev.best) || 0;
  const best = Math.max(prevBest, pts);
  const next = {
    name: label,
    best,
    bestAt: best > prevBest ? Date.now() : prev.bestAt || Date.now(),
    today,
    todayDate: day,
  };
  all[key] = next;
  writeAll(all);
  return { name: label, best, today };
}

/** @param {string} id */
export function readPlaylistBests(id) {
  const key = String(id || "").trim();
  if (!key) return null;
  const all = readAll();
  const prev = all[key];
  if (!prev || typeof prev !== "object") return null;
  const day = todayKey();
  const today = prev.todayDate === day ? Number(prev.today) || 0 : 0;
  return {
    name: String(prev.name || key),
    best: Number(prev.best) || 0,
    today,
  };
}
