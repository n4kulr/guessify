export const PLAY_NUDGE_MS = 3000;
export const SKIP_NUDGE_MS = 15000;
export const GUESS_NUDGE_MS = 2500;
export const REVEAL_NUDGE_MS = 4000;

/** `kind` is "play" (idle), "skip" (heard, no solve), "guess" (typed text idle), or "reveal" (un-advanced reveal). */
export function roundNudgeWaitMs(kind, fast) {
  if (kind === "play") {
    if (fast) return 200;
    return PLAY_NUDGE_MS;
  }
  if (kind === "guess") {
    if (fast) return 200;
    return GUESS_NUDGE_MS;
  }
  if (kind === "reveal") {
    if (fast) return 200;
    return REVEAL_NUDGE_MS;
  }
  if (fast) return 800;
  return SKIP_NUDGE_MS;
}
