/**
 * Self-check: game end stats helpers.
 * Run: node src/gameStats.check.js
 */
import assert from "node:assert/strict";
import {
  wallSecToStepBin,
  computeGameStats,
  formatSolveSec,
  solveCompareSeries,
  roundResultsFromLog,
} from "./gameStats.js";

assert.equal(wallSecToStepBin(0), 2);
assert.equal(wallSecToStepBin(0.8), 2);
assert.equal(wallSecToStepBin(2), 2);
assert.equal(wallSecToStepBin(3.2), 4);
assert.equal(wallSecToStepBin(7), 7);
assert.equal(wallSecToStepBin(25), 20);

assert.equal(formatSolveSec(null), "—");
assert.equal(formatSolveSec(6800), "6.8s");
assert.equal(formatSolveSec(12000), "12s");

const log = [
  { won: true, artistClaimed: true, wallMs: 1800 },
  { won: true, artistClaimed: true, wallMs: 5200 },
  { won: false, artistClaimed: false, wallMs: null },
  { won: true, artistClaimed: true, wallMs: 9000 },
  { won: true, artistClaimed: false, wallMs: 15000 },
];
const s = computeGameStats(log, { score: 2000 });
assert.equal(s.wins, 4);
assert.equal(s.accuracy, 0.8);
assert.equal(s.artistsClaimed, 3);
assert.equal(s.bestStreak, 2);
assert.equal(s.distribution[2], 1);
assert.equal(s.distribution[4], 0);
assert.equal(s.distribution[7], 1);
assert.equal(s.distribution[11], 1);
assert.equal(s.distribution[16], 1);
assert.equal(s.fastestMs, 1800);
assert.equal(s.timeline.length, 5);
assert.equal(s.timeline[2].won, false);
assert.equal(s.timelineWins.length, 4);
assert.equal(s.timelineWins[0].round, 1);

const series = solveCompareSeries(
  [
    { round: 1, winnerId: "a", wallMs: 2000, color: "#e2b714" },
    { round: 2, winnerId: "b", wallMs: 4000, color: "#7aa2f7" },
    { round: 3, winnerId: "a", wallMs: 3000, color: "#e2b714" },
  ],
  [
    { id: "a", name: "you", color: "#e2b714" },
    { id: "b", name: "bot", color: "#7aa2f7" },
  ]
);
assert.equal(series.length, 2);
assert.equal(series.find((x) => x.id === "a").points.length, 2);

const fromLog = roundResultsFromLog(log, "you", { name: "you" });
assert.equal(fromLog.length, 4);

console.log("gameStats.check: ok");
