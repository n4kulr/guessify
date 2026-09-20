/**
 * Self-check: fuzzy match + almost band + slash titles + articles.
 * Run: node src/match.check.js
 */
import assert from "node:assert/strict";
import {
  isCorrect,
  isAlmost,
  similarity,
  matchesAnyArtist,
  isAlmostAnyArtist,
  titleParts,
  CORRECT_SIM,
  ALMOST_SIM,
  normalize,
} from "./match.js";

assert.equal(CORRECT_SIM, 0.8);
assert.equal(ALMOST_SIM, 0.5);

assert.equal(isCorrect("daisies", "Daisies"), true);
assert.equal(isAlmost("daisies", "Daisies"), false);

assert.equal(isCorrect("zzzzzzzzzz", "daisies"), false);
assert.equal(isAlmost("zzzzzzzzzz", "daisies"), false);

assert.equal(isCorrect("blinding litez", "blinding lights"), false);
assert.equal(isAlmost("blinding litez", "blinding lights"), true);

// Leading article
assert.equal(normalize("The Weeknd"), "weeknd");
assert.equal(isCorrect("Weeknd", "The Weeknd"), true);
assert.equal(isCorrect("the weeknd", "Weeknd"), true);

// Slash compound — either half or full
const hob = "House of Balloons / Glass Table Dances";
assert.deepEqual(titleParts(hob), [
  "House of Balloons",
  "Glass Table Dances",
]);
assert.equal(isCorrect("House of Balloons", hob), true);
assert.equal(isCorrect("Glass Table Dances", hob), true);
assert.equal(isCorrect("house of balloons // glass table dances", hob), true);
assert.equal(isCorrect("house of baloons // glass animasl", hob), false);
assert.equal(isAlmost("house of baloons // glass animasl", hob), true);

assert.equal(matchesAnyArtist("weeknd", ["The Weeknd", "Future"]), true);
assert.equal(isAlmostAnyArtist("weeknd", ["The Weeknd"]), false);

// Word-order shuffle (artists / multi-word names)
assert.equal(isCorrect("rex county orange", "Rex Orange County"), true);
assert.equal(isCorrect("orange county rex", "Rex Orange County"), true);
assert.equal(matchesAnyArtist("rex county orange", ["Rex Orange County"]), true);

// Common near-miss spelling on longer names (ceaser → caesar)
assert.equal(isCorrect("daniel ceaser", "Daniel Caesar"), true);
assert.equal(isCorrect("Daniel Ceaser", "Daniel Caesar"), true);
assert.equal(matchesAnyArtist("daniel ceaser", ["Daniel Caesar"]), true);

// Short titles: a dropped/typo'd letter is forgiven when the word still
// starts the same way ("helo" is clearly reaching for "hello")...
assert.equal(isCorrect("helo", "Hello"), true);
assert.equal(isCorrect("Creeep", "Creep"), true);
assert.equal(isCorrect("sicko mod", "Sicko Mode"), true);

// ...but a different first letter is a different word, not a typo.
assert.equal(isCorrect("brake", "Drake"), false);
assert.equal(isCorrect("cake", "bake"), false);
assert.equal(isCorrect("mine", "nine"), false);
// Too short to guess at even with a shared first letter.
assert.equal(isCorrect("ba", "be"), false);

// Still reject short near-misses / garbage
assert.equal(isCorrect("zzzzzzzzzz", "Daniel Caesar"), false);

console.log("match.check: ok");
