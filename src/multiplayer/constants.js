// Shared game constants (imported by PartyKit room + React clients).
export const STEPS = [1, 2, 4, 7, 11, 16];
export const MAX_GUESSES = STEPS.length;
export const TOTAL = STEPS[STEPS.length - 1];
export const ROUND_COUNT = 5;

// Exaggerated arcade scoring (thousands over a full game).
// Guess 1 → 1000 … guess 6 → 200; correct artist → +200 once per round.
export const TITLE_POINTS = [1000, 800, 600, 400, 300, 200];
export const ARTIST_BONUS = 200;

export function titlePointsForGuess(guessNum) {
  const i = Math.min(Math.max(0, Number(guessNum) || 0), TITLE_POINTS.length - 1);
  return TITLE_POINTS[i];
}

// Open Peeps bust presets live in /public/peeps/peep-1.svg … peep-105.svg
export const PEEP_COUNT = 105;

export const PLAYER_COLORS = [
  "#e2b714",
  "#7aa2f7",
  "#f7768e",
  "#9ece6a",
  "#bb9af7",
  "#ff9e64",
  "#2ac3de",
  "#e0af68",
  "#c0caf5",
  "#73daca",
  "#ff007c",
  "#a9b1d6",
];

export function peepSrc(peep) {
  const n = Math.min(PEEP_COUNT, Math.max(1, Number(peep) || 1));
  return `/peeps/peep-${n}.svg`;
}

/** Uniform int in [0, maxExclusive). Prefers crypto; falls back to Math.random. */
function randomInt(maxExclusive) {
  const max = Math.max(0, Math.floor(maxExclusive));
  if (max <= 0) return 0;
  const cryptoObj = typeof globalThis !== "undefined" ? globalThis.crypto : null;
  if (cryptoObj?.getRandomValues) {
    const buf = new Uint32Array(1);
    cryptoObj.getRandomValues(buf);
    return buf[0] % max;
  }
  return Math.floor(Math.random() * max);
}

export function randomAvatar() {
  return {
    peep: 1 + randomInt(PEEP_COUNT),
    color: PLAYER_COLORS[randomInt(PLAYER_COLORS.length)],
  };
}

export function normalizeAvatar(raw, fallbackColor = PLAYER_COLORS[0]) {
  const a = raw && typeof raw === "object" ? raw : {};
  // Migrate old eyes/mouth avatars → random peep
  let peep = Number(a.peep);
  if (!Number.isFinite(peep) || peep < 1 || peep > PEEP_COUNT) {
    peep = 1 + randomInt(PEEP_COUNT);
  }
  const color =
    typeof a.color === "string" && /^#[0-9a-fA-F]{6}$/.test(a.color)
      ? a.color
      : fallbackColor;
  return { peep: Math.floor(peep), color };
}

export function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
