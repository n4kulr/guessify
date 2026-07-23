const KEY = "guessify-volume";
const EVT = "guessify:volume";

function clamp(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 1;
  return Math.min(1, Math.max(0, v));
}

function readStored() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw == null) return 1;
    return clamp(raw);
  } catch {
    return 1;
  }
}

let volume = readStored();

/** 0–1 volume for song previews only (game + live demo track).
 *  UI SFX (cassette teeth, vinyl scrub) ignore this and stay full. */
export function getVolume() {
  return volume;
}

export function setVolume(next) {
  volume = clamp(next);
  try {
    localStorage.setItem(KEY, String(volume));
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVT, { detail: volume }));
  }
  return volume;
}

export function subscribeVolume(cb) {
  function onEvt(e) {
    cb(typeof e.detail === "number" ? e.detail : getVolume());
  }
  window.addEventListener(EVT, onEvt);
  return () => window.removeEventListener(EVT, onEvt);
}
