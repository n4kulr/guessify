/**
 * Self-check: spare picker skips used + current; party deal splits play/spares.
 * Run: node src/deadPreview.check.js
 */
import assert from "node:assert/strict";
import { nextSpareTrack, dealPartyTracks } from "./deadPreview.js";

const pool = [{ id: "a" }, { id: "b" }, { id: "c" }];
const used = new Set(["a"]);

assert.equal(nextSpareTrack(pool, used, "b")?.id, "c");
assert.equal(nextSpareTrack(pool, used, null)?.id, "b");
used.add("b");
used.add("c");
assert.equal(nextSpareTrack(pool, used, "a"), null);

const dealt = dealPartyTracks(
  [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }, { id: "5" }, { id: "6" }],
  5
);
assert.equal(dealt.tracks.length, 5);
assert.equal(dealt.spareTracks.length, 1);
assert.equal(
  new Set([...dealt.tracks, ...dealt.spareTracks].map((t) => t.id)).size,
  6
);
assert.equal(dealPartyTracks([{ id: "x" }], 5).tracks.length, 1);
assert.equal(dealPartyTracks([], 5).tracks.length, 0);

console.log("deadPreview.check: ok");
