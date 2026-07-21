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
];

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
