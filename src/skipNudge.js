export const PLAY_NUDGE_MS = 3000;
export const SKIP_NUDGE_MS = 20000;

/** `kind` is "play" (idle) or "skip" (heard, no solve). */
export function roundNudgeWaitMs(kind, fast) {
  if (kind === "play") {
    if (fast) return 200;
    return PLAY_NUDGE_MS;
  }
  if (fast) return 800;
  return SKIP_NUDGE_MS;
}
