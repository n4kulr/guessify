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

/** Stopwatch with milliseconds: 3847 → "3.847s". */
export function formatSolveClock(wallMs) {
  if (wallMs == null || !Number.isFinite(wallMs) || wallMs < 0) return "—";
  const total = Math.round(wallMs);
  const sec = Math.floor(total / 1000);
  const ms = total % 1000;
  return `${sec}.${String(ms).padStart(3, "0")}s`;
}

/**
 * Wall-clock to show on the round reveal. Prefers this player's solve,
 * then the winner's, then elapsed since `startedAt`.
 */
export function resolveRevealMs({
  solveTimes,
  playerId,
  winnerId,
  startedAt,
  now = Date.now(),
} = {}) {
  const mine = playerId != null ? solveTimes?.[playerId] : null;
  if (mine != null && Number.isFinite(mine) && mine >= 0) return mine;
  const win = winnerId ? solveTimes?.[winnerId] : null;
  if (win != null && Number.isFinite(win) && win >= 0) return win;
  if (startedAt != null && Number.isFinite(startedAt)) {
    return Math.max(0, now - startedAt);
  }
  return null;
}

/**
 * Compare this round to earlier ones in `prior` (current round not included).
 * `deltaMs` > 0 means this solve was faster than the previous win.
 */
export function roundRevealFacts(prior = [], { won = false, wallMs = null } = {}) {
  const rounds = Array.isArray(prior) ? prior : [];
  const curWon = !!won;
  const curMs = wallMs != null && Number.isFinite(wallMs) && wallMs >= 0 ? wallMs : null;
  const priorWins = rounds.filter(
    (r) => r?.won && r.wallMs != null && Number.isFinite(r.wallMs) && r.wallMs >= 0
  );
  const lastWin = priorWins[priorWins.length - 1];
  const fastestPrior =
    priorWins.length > 0 ? Math.min(...priorWins.map((r) => r.wallMs)) : null;
  const isPb = curWon && curMs != null && fastestPrior != null && curMs < fastestPrior;
  const deltaMs =
    curWon && curMs != null && lastWin ? lastWin.wallMs - curMs : null;

  let streak = 0;
  if (curWon) {
    streak = 1;
    for (let i = rounds.length - 1; i >= 0; i--) {
      if (rounds[i]?.won) streak += 1;
      else break;
    }
  }

  return { isPb, deltaMs, streak };
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
    const title = r?.title || null;
    const artist = r?.artist || null;
    return {
      round: i + 1,
      won,
      wallMs,
      title,
      artist,
      label:
        title && artist
          ? `${title} · ${artist}`
          : title || artist || `Round ${i + 1}`,
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
    /** Solved rounds only (misses dropped for replay / share). */
    timelineWins: timeline.filter((row) => row.won),
    steps: STEPS,
  };
}

/**
 * Build per-player solve-time series for rounds that were solved.
 * @param {{ round: number, winnerId: string, wallMs?: number|null, winnerName?: string, color?: string }[]} roundResults
 * @param {{ id: string, name?: string, color?: string, avatar?: { color?: string } }[]} players
 */
export function solveCompareSeries(roundResults = [], players = []) {
  const seriesById = new Map();
  for (const p of players || []) {
    if (!p?.id) continue;
    seriesById.set(p.id, {
      id: p.id,
      name: p.name || "player",
      color: p.color || p.avatar?.color || null,
      points: [],
    });
  }
  for (const r of roundResults || []) {
    if (!r?.winnerId || r.wallMs == null || !Number.isFinite(r.wallMs)) continue;
    let s = seriesById.get(r.winnerId);
    if (!s) {
      s = {
        id: r.winnerId,
        name: r.winnerName || "player",
        color: r.color || null,
        points: [],
      };
      seriesById.set(r.winnerId, s);
    }
    s.points.push({
      round: r.round,
      wallMs: r.wallMs,
      label: r.label || r.title || null,
      title: r.title || null,
      artist: r.artist || null,
    });
  }
  return [...seriesById.values()]
    .filter((s) => s.points.length > 0)
    .map((s) => ({
      ...s,
      points: [...s.points].sort((a, b) => a.round - b.round),
    }));
}

/** Round results from a personal log (solo / single-player view). */
export function roundResultsFromLog(log = [], playerId = "you", meta = {}) {
  return (Array.isArray(log) ? log : []).flatMap((r, i) => {
    if (!r?.won || r.wallMs == null || !Number.isFinite(r.wallMs)) return [];
    return [
      {
        round: i + 1,
        winnerId: playerId,
        winnerName: meta.name || "you",
        color: meta.color || null,
        wallMs: r.wallMs,
      },
    ];
  });
}
