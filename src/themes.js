// Monkeytype-style color themes. Each maps to CSS custom properties applied on
// <html>. Values follow Monkeytype's palette conventions
// (bg / main accent / sub muted / sub-alt surface / text / error).
export const THEMES = {
  serika_dark:  { name: "serika dark",  bg: "#323437", main: "#e2b714", sub: "#646669", subAlt: "#2c2e31", text: "#d1d0c5", error: "#ca4754" },
  serika_light: { name: "serika light", bg: "#e1e1e1", main: "#e2b714", sub: "#aaaeb3", subAlt: "#d5d5d5", text: "#323437", error: "#da3333" },
  dracula:      { name: "dracula",      bg: "#282a36", main: "#bd93f9", sub: "#6272a4", subAlt: "#21222c", text: "#f8f8f2", error: "#ff5555" },
  nord:         { name: "nord",         bg: "#242933", main: "#88c0d0", sub: "#4c566a", subAlt: "#2e3440", text: "#d8dee9", error: "#bf616a" },
  gruvbox_dark: { name: "gruvbox dark", bg: "#282828", main: "#d79921", sub: "#928374", subAlt: "#32302f", text: "#ebdbb2", error: "#fb4934" },
  catppuccin:   { name: "catppuccin",   bg: "#1e1e2e", main: "#f5c2e7", sub: "#6c7086", subAlt: "#181825", text: "#cdd6f4", error: "#f38ba8" },
  tokyo_night:  { name: "tokyo night",  bg: "#1a1b26", main: "#7aa2f7", sub: "#565f89", subAlt: "#16161e", text: "#c0caf5", error: "#f7768e" },
  rose_pine:    { name: "rosé pine",    bg: "#191724", main: "#ebbcba", sub: "#6e6a86", subAlt: "#1f1d2e", text: "#e0def4", error: "#eb6f92" },
  carbon:       { name: "carbon",       bg: "#313131", main: "#f66e0d", sub: "#616161", subAlt: "#3d3d3d", text: "#e7e7e7", error: "#da3333" },
  matrix:       { name: "matrix",       bg: "#000000", main: "#15ff00", sub: "#006000", subAlt: "#0a0a0a", text: "#15ff00", error: "#d20f39" },
  olivia:       { name: "olivia",       bg: "#1c1a1d", main: "#e9d5c6", sub: "#75696d", subAlt: "#282528", text: "#e9e9e9", error: "#e64b40" },
  bento:        { name: "bento",        bg: "#2d394d", main: "#ff7a90", sub: "#5c6b83", subAlt: "#28333f", text: "#fffaf4", error: "#fa5f55" },
};

export const DEFAULT_THEME = "olivia";
const KEY = "guessify-theme";

function parseHex(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function colorDist(a, b) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

/** Prefer a dark theme when two mains tie (skip serika_light). */
const ACCENT_THEME_ORDER = [
  "serika_dark",
  "tokyo_night",
  "bento",
  "dracula",
  "nord",
  "carbon",
  "catppuccin",
  "rose_pine",
  "olivia",
  "gruvbox_dark",
  "matrix",
];

/** Pick the theme whose accent (`main`) is closest to `hex`. */
export function themeKeyForAccent(hex) {
  const target = parseHex(hex);
  if (!target) return DEFAULT_THEME;
  let best = DEFAULT_THEME;
  let bestDist = Infinity;
  for (const key of ACCENT_THEME_ORDER) {
    const t = THEMES[key];
    const main = parseHex(t?.main);
    if (!main) continue;
    const d = colorDist(target, main);
    if (d < bestDist) {
      bestDist = d;
      best = key;
    }
  }
  return best;
}

export function applyTheme(key, { persist = true } = {}) {
  const t = THEMES[key] || THEMES[DEFAULT_THEME];
  const r = document.documentElement;
  r.style.setProperty("--bg-color", t.bg);
  r.style.setProperty("--main-color", t.main);
  r.style.setProperty("--sub-color", t.sub);
  r.style.setProperty("--sub-alt-color", t.subAlt);
  r.style.setProperty("--text-color", t.text);
  r.style.setProperty("--error-color", t.error);
  if (!persist) return;
  try { localStorage.setItem(KEY, key); } catch { /* ignore */ }
}

/** Apply the theme that best matches an avatar accent color. Returns theme key. */
export function applyThemeForAccent(hex, opts) {
  const key = themeKeyForAccent(hex);
  applyTheme(key, opts);
  return key;
}

export function loadTheme() {
  // Always open on Olivia; users can still switch for the session.
  applyTheme(DEFAULT_THEME);
  return DEFAULT_THEME;
}
