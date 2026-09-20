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
  warmShareCover,
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
  won: true,
});
assert.match(solved.text, /"Blinding Lights" — The Weeknd/);
assert.match(solved.text, /4\.120s/);
assert.match(solved.text, /6s of audio/);
assert.match(solved.text, /guessify\.uk/);

// Missed the round: never treat elapsed wall time as a solve.
const missed = roundSharePayload({
  title: "Alright",
  artist: "Kendrick Lamar",
  wallMs: 18_000,
  won: false,
});
assert.match(missed.text, /i couldn't guess it :\( can you\?/);
assert.match(missed.text, /"Alright" — Kendrick Lamar/);
assert.doesNotMatch(missed.text, /Named/);
assert.doesNotMatch(missed.text, /18/);

// No artist yet: quotes still balance, no dangling dash.
const bare = roundSharePayload({ title: "Teardrop", wallMs: 900, won: true });
assert.match(bare.text, /"Teardrop" in 0\.900s/);

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

// --- cover warming -------------------------------------------------------
// The artwork fetch is the only slow step in building a share card, so it is
// cached and warmed at reveal time. Two things must hold: a warmed cover is
// never fetched twice, and a failed one is not cached as a permanent miss.
{
  let calls = 0;
  let failNext = false;
  globalThis.fetch = async () => {
    calls += 1;
    if (failNext) return { ok: false };
    return { ok: true, blob: async () => ({ type: "image/png" }) };
  };
  globalThis.createImageBitmap = async (blob) => ({ bitmap: blob.type });

  assert.equal(await warmShareCover(""), null, "no src = no fetch");
  assert.equal(await warmShareCover(null), null);
  assert.equal(calls, 0, "empty src must not hit the network");

  const a = await warmShareCover("https://cdn/art.jpg");
  assert.ok(a, "warms a cover");
  assert.equal(calls, 1);

  // Second warm (and the real share press) reuse the decoded bitmap.
  const b = await warmShareCover("https://cdn/art.jpg");
  assert.equal(b, a, "same bitmap returned, not a fresh decode");
  assert.equal(calls, 1, "a warmed cover is never fetched twice");

  // Concurrent callers join one fetch rather than racing two.
  const [c, d] = await Promise.all([
    warmShareCover("https://cdn/two.jpg"),
    warmShareCover("https://cdn/two.jpg"),
  ]);
  assert.equal(c, d);
  assert.equal(calls, 2, "a press landing mid-warm joins the in-flight fetch");

  // A failure must be evicted so a later share can retry.
  failNext = true;
  assert.equal(await warmShareCover("https://cdn/bad.jpg"), null);
  assert.equal(calls, 3);
  failNext = false;
  assert.ok(await warmShareCover("https://cdn/bad.jpg"), "retries after a failure");
  assert.equal(calls, 4);
}

console.log("shareScore.check: ok");
