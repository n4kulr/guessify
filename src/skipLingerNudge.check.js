/**
 * Self-check: round-nudge waits. Run: node src/skipLingerNudge.check.js
 */
import assert from "node:assert/strict";
import {
  roundNudgeWaitMs,
  PLAY_NUDGE_MS,
  SKIP_NUDGE_MS,
  GUESS_NUDGE_MS,
  REVEAL_NUDGE_MS,
} from "./skipNudge.js";

assert.equal(PLAY_NUDGE_MS, 3000);
assert.equal(SKIP_NUDGE_MS, 15000);
assert.equal(GUESS_NUDGE_MS, 2500);
assert.equal(REVEAL_NUDGE_MS, 4000);
assert.equal(roundNudgeWaitMs("play", false), 3000);
assert.equal(roundNudgeWaitMs("skip", false), 15000);
assert.equal(roundNudgeWaitMs("guess", false), 2500);
assert.equal(roundNudgeWaitMs("reveal", false), 4000);
assert.equal(roundNudgeWaitMs("play", true), 200);
assert.equal(roundNudgeWaitMs("guess", true), 200);
assert.equal(roundNudgeWaitMs("reveal", true), 200);
assert.equal(roundNudgeWaitMs("skip", true), 800);
console.log("skipLingerNudge.check.js ok");
