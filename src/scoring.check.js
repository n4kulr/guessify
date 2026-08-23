/**
 * Self-check: round title payout after skip/hint cuts.
 * Run: node src/scoring.check.js
 */
import assert from "node:assert/strict";
import {
  titlePointsForGuess,
  timedTitlePoints,
  TITLE_POINTS,
  SKIP_PENALTY,
  TIMED_PLACE_STEP,
  isHintDue,
  TIMED_ROUND_MS,
} from "./multiplayer/constants.js";

assert.equal(titlePointsForGuess(), TITLE_POINTS);
assert.equal(titlePointsForGuess(0), 500);
assert.equal(titlePointsForGuess(1), 500 - SKIP_PENALTY);
assert.equal(titlePointsForGuess(2), 420);
assert.equal(titlePointsForGuess(4), 340);
// The hint is automatic and free now — a second arg must not change the payout.
assert.equal(titlePointsForGuess(4, true), 340);
assert.equal(titlePointsForGuess(20), 0);
assert.equal(timedTitlePoints(500, 0), 500);
assert.equal(timedTitlePoints(500, 1), 500 - TIMED_PLACE_STEP);
assert.equal(timedTitlePoints(100, 2), 0);
// Timed payouts: faster place always beats a slower one when both use TITLE_POINTS.
assert.equal(timedTitlePoints(TITLE_POINTS, 0) > timedTitlePoints(TITLE_POINTS, 1), true);
assert.equal(timedTitlePoints(TITLE_POINTS, 1), 420);

// --- auto-hint timing ---
const t0 = 1_000_000;
const timed = { raceMode: "timed", roundStartedAt: t0, roundEndsAt: t0 + TIMED_ROUND_MS };
assert.equal(isHintDue(timed, t0), false, "timed: not due at the start");
assert.equal(isHintDue(timed, t0 + 34_000), false, "timed: not due at 11s left");
assert.equal(isHintDue(timed, t0 + 35_000), true, "timed: due at exactly 10s left");
assert.equal(isHintDue(timed, t0 + TIMED_ROUND_MS), true, "timed: still due at the buzzer");

const classic = { raceMode: "classic", roundStartedAt: t0, roundEndsAt: null };
assert.equal(isHintDue(classic, t0 + 44_999), false, "classic: not due before 45s");
assert.equal(isHintDue(classic, t0 + 45_000), true, "classic: due at 45s");

assert.equal(isHintDue({}, t0), false, "no round start = never due");
assert.equal(
  isHintDue({ raceMode: "timed", roundStartedAt: t0, roundEndsAt: null }, t0 + 99_000),
  false,
  "timed without a deadline can't be due"
);

console.log("scoring.check: ok");
