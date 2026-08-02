import { STEPS, TOTAL } from "./multiplayer/constants.js";

/**
 * @typedef {{ won: boolean, artistClaimed?: boolean, wallMs?: number | null, unlockStep?: number }} RoundResult
 */

/** Map wall-clock seconds into a STEPS bin: intervals (prev, step]. */
export function wallSecToStepBin(wallSec) {
  const s = Number(wallSec);
  if (!Number.isFinite(s) || s < 0) return null;
  for (const step of STEPS) {
    if (s <= step) return step;
  }
  return TOTAL;
}

/** @param {number | null | undefined} wallMs */
export function formatSolveSec(wallMs) {
  if (wallMs == null || !Number.isFinite(wallMs) || wallMs < 0) return "—";
  const sec = wallMs / 1000;
  if (sec < 10) return `${sec.toFixed(1)}s`;
  return `${Math.round(sec)}s`;
}

/**
 * @param {RoundResult[]} log
 * @param {{ score?: number }} [opts]
 */
export function computeGameStats(log = [], opts = {}) {
  const rounds = Array.isArray(log) ? log : [];
  const n = rounds.length;
  const wins = rounds.filter((r) => r && r.won);
  const winMs = wins
    .map((r) => r.wallMs)
    .filter((ms) => ms != null && Number.isFinite(ms) && ms >= 0);

  const accuracy = n ? wins.length / n : 0;
  const artistsClaimed = rounds.filter((r) => r && r.artistClaimed).length;
  const avgSolveMs =
    winMs.length > 0 ? winMs.reduce((a, b) => a + b, 0) / winMs.length : null;
  const fastestMs = winMs.length > 0 ? Math.min(...winMs) : null;

  let bestStreak = 0;
  let streak = 0;
  for (const r of rounds) {
    if (r?.won) {
      streak += 1;
      if (streak > bestStreak) bestStreak = streak;
    } else {
      streak = 0;
    }
  }

  /** @type {Record<number, number>} */
  const distribution = Object.fromEntries(STEPS.map((s) => [s, 0]));
  for (const r of wins) {
    if (r.wallMs == null || !Number.isFinite(r.wallMs)) continue;
    const bin = wallSecToStepBin(r.wallMs / 1000);
    if (bin != null) distribution[bin] = (distribution[bin] || 0) + 1;
  }

  const timeline = rounds.map((r, i) => {
    const won = !!r?.won;
    const wallMs = won && r.wallMs != null && Number.isFinite(r.wallMs) ? r.wallMs : null;
    return {
      round: i + 1,
      won,
      wallMs,
      stepBin: wallMs != null ? wallSecToStepBin(wallMs / 1000) : null,
      barPct: wallMs != null ? Math.min(100, (wallMs / 1000 / TOTAL) * 100) : 0,
    };
  });

  return {
    score: opts.score ?? 0,
    rounds: n,
    wins: wins.length,
    accuracy,
    artistsClaimed,
    artistsTotal: n,
    avgSolveMs,
    fastestMs,
    bestStreak,
    distribution,
    timeline,
    steps: STEPS,
  };
}
