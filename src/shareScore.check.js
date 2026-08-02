/**
 * Self-check: score share copy + no-preview helper.
 * Run: node src/shareScore.check.js
 */
import assert from "node:assert/strict";
import { scoreSharePayload, isNoPreviewError } from "./shareScore.js";

const solo = scoreSharePayload({ mode: "solo", score: 1200, maxScore: 3000 });
assert.match(solo.text, /1200\/3000/);
assert.match(solo.text, /guessify\.uk/);

const online = scoreSharePayload({ mode: "online", score: 800, place: 2 });
assert.match(online.text, /#2/);
assert.match(online.text, /800/);

assert.equal(isNoPreviewError(new Error("no preview")), true);
assert.equal(isNoPreviewError(new Error("audio load failed")), false);
console.log("shareScore.check: ok");
