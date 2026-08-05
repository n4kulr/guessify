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
  HINT_PENALTY,
  TIMED_PLACE_STEP,
} from "./multiplayer/constants.js";

assert.equal(titlePointsForGuess(), TITLE_POINTS);
assert.equal(titlePointsForGuess(0, false), 500);
assert.equal(titlePointsForGuess(1, false), 500 - SKIP_PENALTY);
assert.equal(titlePointsForGuess(2, false), 420);
assert.equal(titlePointsForGuess(4, false), 340);
assert.equal(titlePointsForGuess(4, true), 500 - 4 * SKIP_PENALTY - HINT_PENALTY);
assert.equal(titlePointsForGuess(20, true), 0);
assert.equal(timedTitlePoints(500, 0), 500);
assert.equal(timedTitlePoints(500, 1), 500 - TIMED_PLACE_STEP);
assert.equal(timedTitlePoints(100, 2), 0);
// Timed payouts: faster place always beats a slower one when both use TITLE_POINTS.
assert.equal(timedTitlePoints(TITLE_POINTS, 0) > timedTitlePoints(TITLE_POINTS, 1), true);
assert.equal(timedTitlePoints(TITLE_POINTS, 1), 420);
console.log("scoring.check: ok");
