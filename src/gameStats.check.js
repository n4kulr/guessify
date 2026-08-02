/**
 * Self-check: game end stats helpers.
 * Run: node src/gameStats.check.js
 */
import assert from "node:assert/strict";
import {
  wallSecToStepBin,
  computeGameStats,
  formatSolveSec,
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

console.log("gameStats.check: ok");
