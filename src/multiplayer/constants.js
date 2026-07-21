// Shared game constants (imported by PartyKit room + React clients).
export const STEPS = [1, 2, 4, 7, 11, 16];
export const MAX_GUESSES = STEPS.length;
export const TOTAL = STEPS[STEPS.length - 1];
export const ROUND_COUNT = 5;

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

// Skribbl-style face parts (rendered as SVG paths in PlayerAvatar).
export const AVATAR_EYES = 6;
export const AVATAR_MOUTHS = 6;

export function randomAvatar() {
  return {
    color: PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)],
    eyes: Math.floor(Math.random() * AVATAR_EYES),
    mouth: Math.floor(Math.random() * AVATAR_MOUTHS),
  };
}

export function normalizeAvatar(raw, fallbackColor = PLAYER_COLORS[0]) {
  const a = raw && typeof raw === "object" ? raw : {};
  const color =
    typeof a.color === "string" && /^#[0-9a-fA-F]{6}$/.test(a.color)
      ? a.color
      : fallbackColor;
  return {
    color,
    eyes: Math.abs(Number(a.eyes) || 0) % AVATAR_EYES,
    mouth: Math.abs(Number(a.mouth) || 0) % AVATAR_MOUTHS,
  };
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
