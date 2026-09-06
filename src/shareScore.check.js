/**
 * Self-check: score share copy + no-preview helper.
 * Run: node src/shareScore.check.js
 */
import assert from "node:assert/strict";
import {
  scoreSharePayload,
  roundSharePayload,
  wrapLines,
  isNoPreviewError,
} from "./shareScore.js";

const solo = scoreSharePayload({ mode: "solo", score: 1200, maxScore: 3000 });
assert.match(solo.text, /1200\/3000/);
assert.match(solo.text, /guessify\.uk/);

const online = scoreSharePayload({ mode: "online", score: 800, place: 2 });
assert.match(online.text, /#2/);
assert.match(online.text, /800/);

const solved = roundSharePayload({
  title: "Blinding Lights",
  artist: "The Weeknd",
  wallMs: 4120,
  unlockedSec: 6,
});
assert.match(solved.text, /"Blinding Lights" — The Weeknd/);
assert.match(solved.text, /4\.1s/);
assert.match(solved.text, /6s of audio/);
assert.match(solved.text, /guessify\.uk/);

// Missed the round: share the answer, never a bogus time.
const missed = roundSharePayload({ title: "Alright", artist: "Kendrick Lamar" });
assert.match(missed.text, /Couldn't name/);
assert.doesNotMatch(missed.text, /—s|NaN|undefined/);

// No artist yet: quotes still balance, no dangling dash.
const bare = roundSharePayload({ title: "Teardrop", wallMs: 900 });
assert.match(bare.text, /"Teardrop" in 0\.9s/);

// Canvas title wrapping. Fake metrics: every glyph is 10px wide.
const w10 = (s) => s.length * 10;

assert.deepEqual(wrapLines("", 100, 2, w10), []);
assert.deepEqual(wrapLines("short", 100, 2, w10), ["short"]);
assert.deepEqual(wrapLines("one two three", 90, 2, w10), ["one two", "three"]);

// Past the line cap the last kept line is ellipsised, never dropped silently.
const capped = wrapLines("one two three four five six", 90, 2, w10);
assert.equal(capped.length, 2);
assert.match(capped[1], /…$/);
capped.forEach((l) => assert.ok(w10(l) <= 90, `"${l}" overflows`));

// A single unbreakable word longer than the line still gets cut to fit.
const long = wrapLines("Supercalifragilistic", 100, 2, w10);
assert.equal(long.length, 1);
assert.ok(w10(long[0]) <= 100);
assert.match(long[0], /…$/);

assert.equal(isNoPreviewError(new Error("no preview")), true);
assert.equal(isNoPreviewError(new Error("audio load failed")), false);
console.log("shareScore.check: ok");
