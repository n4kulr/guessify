const KEY = "guessify-media-mode";

export const MEDIA_MODES = ["vinyl", "cassette"];

export function loadMediaMode() {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "cassette" || v === "vinyl") return v;
  } catch {
    /* ignore */
  }
  return "vinyl";
}

export function saveMediaMode(mode) {
  if (mode !== "cassette" && mode !== "vinyl") return;
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* ignore */
  }
}
