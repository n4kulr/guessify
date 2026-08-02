/**
 * Self-check: fuzzy match + almost band.
 * Run: node src/match.check.js
 */
import assert from "node:assert/strict";
import {
  isCorrect,
  isAlmost,
  similarity,
  matchesAnyArtist,
  isAlmostAnyArtist,
} from "./match.js";

assert.equal(isCorrect("daisies", "Daisies"), true);
assert.equal(isAlmost("daisies", "Daisies"), false);

assert.ok(similarity("hause of ballons", "house of balloons") >= 0.7);
assert.equal(isCorrect("zzzzzzzzzz", "daisies"), false);
assert.equal(isAlmost("zzzzzzzzzz", "daisies"), false);

// Past typo window, still ~73%+ similar via barely-missed band
assert.equal(isCorrect("blinding litez", "blinding lights"), false);
assert.equal(isAlmost("blinding litez", "blinding lights"), true);

assert.equal(matchesAnyArtist("drake", ["Drake", "Future"]), true);
assert.equal(isAlmostAnyArtist("drake", ["Drake"]), false);

console.log("match.check: ok");
