/**
 * Self-check: preview warm helpers (no DOM Audio in node).
 * Run: node src/previewWarm.check.js
 */
import assert from "node:assert/strict";
import {
  isAudioWarm,
  markAudioWarm,
  warmAudioUrl,
  patchRoundsPreview,
  warmUpcomingRounds,
} from "./previewWarm.js";

assert.equal(isAudioWarm(null), false);
assert.equal(isAudioWarm(""), false);
assert.equal(await warmAudioUrl(null), false);
assert.equal(await warmAudioUrl(""), false);

markAudioWarm("https://example.com/a.mp3");
assert.equal(isAudioWarm("https://example.com/a.mp3"), true);

const rounds = [{ id: "1", name: "x" }, { id: "2", name: "y" }];
const patched = patchRoundsPreview(rounds, 0, "https://example.com/a.mp3");
assert.equal(patched[0].previewUrl, "https://example.com/a.mp3");
assert.equal(rounds[0].previewUrl, undefined);
assert.equal(patchRoundsPreview(patched, 0, "https://example.com/a.mp3"), patched);

assert.equal(typeof warmUpcomingRounds, "function");
warmUpcomingRounds(() => [], () => {}, 0, 1);

console.log("previewWarm.check: ok");
