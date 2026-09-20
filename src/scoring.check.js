/**
 * Self-check: round title payout after skip/hint cuts.
 * Run: node src/scoring.check.js
 */
import assert from "node:assert/strict";
import {
  titlePointsForGuess,
  streakMultiplier,
  timedTitlePoints,
  TITLE_POINTS,
  SKIP_PENALTY,
  ALMOST_POINTS,
  TIMED_PLACE_STEP,
  isHintDue,
  TIMED_ROUND_MS,
  myRevealedArtist,
  makeRoomCode,
} from "./multiplayer/constants.js";

const roomCode = makeRoomCode();
assert.equal(roomCode.length, 6);
assert.match(roomCode, /^[A-Z2-9]{6}$/);

assert.equal(titlePointsForGuess(), TITLE_POINTS);
assert.equal(titlePointsForGuess(0), 500);
// Every skip costs, including the first.
assert.equal(titlePointsForGuess(1), 500 - SKIP_PENALTY);
assert.equal(titlePointsForGuess(2), 420);
assert.equal(titlePointsForGuess(4), 340);
// The hint is automatic and free now — a second arg must not change the payout.
assert.equal(titlePointsForGuess(4, true), 340);
assert.equal(titlePointsForGuess(20), 0);
// Payout never climbs as you skip more, and each step costs SKIP_PENALTY
// until it bottoms out at zero.
for (let n = 1; n <= 20; n++) {
  assert.ok(
    titlePointsForGuess(n) <= titlePointsForGuess(n - 1),
    `payout must not rise at skip ${n}`
  );
}
for (let n = 0; n <= 8; n++) {
  assert.equal(
    titlePointsForGuess(n) - titlePointsForGuess(n + 1),
    Math.min(SKIP_PENALTY, titlePointsForGuess(n)),
    `skip ${n + 1} must cost SKIP_PENALTY`
  );
}

// Streak multiplier: nothing for a lone win, then 10% and 25%.
assert.equal(streakMultiplier(0), 1);
assert.equal(streakMultiplier(1), 1);
assert.equal(streakMultiplier(2), 1.1);
assert.equal(streakMultiplier(3), 1.25);
assert.equal(streakMultiplier(9), 1.25);

assert.equal(ALMOST_POINTS > 0, true);
assert.equal(ALMOST_POINTS < TITLE_POINTS, true);
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
assert.equal(isHintDue(classic, t0 + 29_999), false, "classic: not due before 30s");
assert.equal(isHintDue(classic, t0 + 30_000), true, "classic: due at 30s");

assert.equal(isHintDue({}, t0), false, "no round start = never due");
assert.equal(
  isHintDue({ raceMode: "timed", roundStartedAt: t0, roundEndsAt: null }, t0 + 99_000),
  false,
  "timed without a deadline can't be due"
);

assert.equal(myRevealedArtist({ raceMode: "classic", revealedArtist: "SZA" }, "p1"), "SZA");
assert.equal(
  myRevealedArtist({ raceMode: "timed", artistByPlayer: { p1: "SZA" } }, "p1"),
  "SZA"
);
assert.equal(
  myRevealedArtist({ raceMode: "timed", artistByPlayer: { p2: "SZA" } }, "p1"),
  null
);

console.log("scoring.check: ok");
