// Shared game constants (imported by PartyKit room + React clients).
export const STEPS = [2, 4, 7, 11, 16, 20];
export const MAX_GUESSES = STEPS.length;
export const TOTAL = STEPS[STEPS.length - 1];
export const ROUND_COUNT = 5;

/** Points for nailing the title before skip/hint cuts. */
export const TITLE_POINTS = 500;
/** Small bonus for revealing the artist first (hint + a little score). */
export const ARTIST_BONUS = 100;
/** Cut from this round's title payout each skip (not banked score). */
export const SKIP_PENALTY = 40;
/** Cut from this round's title payout the first time you take the hint. */
export const HINT_PENALTY = 100;
/** @deprecated use TITLE_POINTS */
export const TITLE_POINTS_SONG_FIRST = TITLE_POINTS;
/** @deprecated title is never reduced after artist */
export const TITLE_POINTS_AFTER_ARTIST = TITLE_POINTS;
/** Max points from one round (title + artist). */
export const ROUND_MAX_POINTS = TITLE_POINTS + ARTIST_BONUS;

/** Votes to advance after reveal: every active player in the room. */
export function nextVotesNeeded(playerCount) {
  return Math.max(1, Number(playerCount) || 1);
}

/** Players still in the race (not left, and currently connected when flagged). */
export function activePlayerCount(players = []) {
  return players.filter((p) => p && !p.left && p.connected !== false).length;
}

/** True when every active player has unlocked the full snippet via skip. */
export function allPlayersMaxUnlocked(players = [], unlockByPlayer = {}) {
  const active = players.filter((p) => p && !p.left && p.connected !== false);
  if (!active.length) return false;
  return active.every(
    (p) => (unlockByPlayer?.[p.id] ?? 0) >= MAX_GUESSES - 1
  );
}

/**
 * Title payout for this round after skip/hint cuts.
 * Banked score from earlier rounds is never touched — only what you earn now.
 */
export function titlePointsForGuess(skips = 0, hintUsed = false) {
  const n = Math.max(0, Math.floor(Number(skips) || 0));
  const cut = n * SKIP_PENALTY + (hintUsed ? HINT_PENALTY : 0);
  return Math.max(0, TITLE_POINTS - cut);
}

/** Timed (45s) rounds: wall-clock length before reveal. */
export const TIMED_ROUND_MS = 45_000;
/** Drop title payout by this much per place after 1st in timed mode. */
export const TIMED_PLACE_STEP = 80;

/**
 * Timed scoreboard: place 0 (fastest) gets full titlePts; each later place −80.
 * Timed rounds pass TITLE_POINTS here so speed — not skip count — decides rank pay.
 */
export function timedTitlePoints(titlePts, placeIndex = 0) {
  const place = Math.max(0, Math.floor(Number(placeIndex) || 0));
  return Math.max(0, Math.floor(Number(titlePts) || 0) - place * TIMED_PLACE_STEP);
}

export function normalizeRaceMode(mode) {
  return mode === "timed" ? "timed" : "classic";
}

/**
 * Seconds unlocked for a player's personal skip step (multiplayer).
 * Prefers unlockByPlayer[playerId]; falls back to legacy shared unlocked /
 * own skip count so a stale Party Worker still grows the bar.
 */
export function unlockSecondsFor(unlockByPlayer, playerId, legacy) {
  if (
    unlockByPlayer != null &&
    playerId &&
    Object.prototype.hasOwnProperty.call(unlockByPlayer, playerId)
  ) {
    const step = unlockByPlayer[playerId] ?? 0;
    return STEPS[Math.min(Math.max(0, step), MAX_GUESSES - 1)];
  }
  if (playerId && legacy?.guesses?.length) {
    const skips = legacy.guesses.filter((g) => g.playerId === playerId && g.skip).length;
    if (skips > 0) return STEPS[Math.min(skips, MAX_GUESSES - 1)];
  }
  if (typeof legacy?.unlocked === "number") return legacy.unlocked;
  if (typeof legacy?.guessNum === "number") {
    return STEPS[Math.min(Math.max(0, legacy.guessNum), MAX_GUESSES - 1)];
  }
  return STEPS[0];
}

// Open Peeps bust presets live in /public/peeps/peep-1.svg … peep-105.svg
export const PEEP_COUNT = 105;

export const PLAYER_COLORS = [
  "#e2b714", // serika
  "#7aa2f7", // tokyo night
  "#ff7a90", // bento
  "#bd93f9", // dracula
  "#88c0d0", // nord
  "#f66e0d", // carbon
  "#f5c2e7", // catppuccin
  "#ebbcba", // rosé pine
  "#e9d5c6", // olivia
  "#d79921", // gruvbox
  "#5dba63", // matrix
  "#f7768e", // tokyo pink
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
