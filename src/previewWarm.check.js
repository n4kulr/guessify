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
  primePlaylistPreviews,
  CUE_FAIL_MS,
} from "./previewWarm.js";

assert.equal(CUE_FAIL_MS, 12_000);
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

// primePlaylistPreviews runs round 1 alone, then the rest two at a time.
// Tracks that already carry a previewUrl never hit the network, so this
// exercises the batching index math without stubbing fetch.
const primed = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: String(i),
    name: `t${i}`,
    previewUrl: `https://example.com/${i}.mp3`,
  }));

assert.deepEqual(await primePlaylistPreviews([], 5), []);
assert.deepEqual(await primePlaylistPreviews(null, 5), []);
for (const n of [1, 2, 3, 4, 5, 8]) {
  const got = await primePlaylistPreviews(primed(n), 12);
  assert.equal(got.length, n, `expected ${n} results`);
  // One result per track, still in play order — the warm order must match
  // the round order or we'd be buffering the wrong songs.
  assert.deepEqual(
    got,
    primed(n).map((t) => t.previewUrl)
  );
}
// `limit` caps the work.
assert.equal((await primePlaylistPreviews(primed(20), 6)).length, 6);

console.log("previewWarm.check: ok");
