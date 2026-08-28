/**
 * Self-check: round-nudge waits. Run: node src/skipLingerNudge.check.js
 */
import assert from "node:assert/strict";
import { roundNudgeWaitMs, PLAY_NUDGE_MS, SKIP_NUDGE_MS } from "./skipNudge.js";

assert.equal(PLAY_NUDGE_MS, 3000);
assert.equal(SKIP_NUDGE_MS, 20000);
assert.equal(roundNudgeWaitMs("play", false), 3000);
assert.equal(roundNudgeWaitMs("skip", false), 20000);
assert.equal(roundNudgeWaitMs("play", true), 200);
assert.equal(roundNudgeWaitMs("skip", true), 800);
console.log("skipLingerNudge.check.js ok");
