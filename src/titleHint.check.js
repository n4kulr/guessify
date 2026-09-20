/**
 * Self-check: title hint mask.
 * Run: node src/titleHint.check.js
 */
import assert from "node:assert/strict";
import { titleHintMask, HINT_MAX_LETTERS, displayTitle } from "./titleHint.js";

assert.equal(titleHintMask("daisies"), "d _ _ s _ _ s");
assert.equal(titleHintMask("Daisies"), "d _ _ s _ _ s");
assert.equal(titleHintMask("hello world"), "h _ _ l o   w _ _ l d");
// No decorative separator — a word break is whitespace, nothing else.
assert.equal(titleHintMask("hello world").includes("·"), false);
// ...but not a plain space, which collapses into the letter gaps on render.
assert.match(titleHintMask("hello world"), /o +w/);

// First + last letter always; punctuation always.
assert.equal(titleHintMask("Don't"), "d _ _ ' t");
assert.equal(titleHintMask("Don't Stop"), "d _ _ ' t   s _ _ p");
assert.equal(titleHintMask("Mr. Brightside"), "m r .   b _ _ g _ _ s i");
assert.equal(titleHintMask("a"), "a");
assert.equal(titleHintMask("Be"), "b e");
assert.equal(titleHintMask("Love / Hate"), "l _ _ e   /   h _ _ e");

const balloons = titleHintMask("House of Balloons / Glass Table Girls");
assert.ok(balloons.includes("_"), balloons);
assert.ok(balloons.includes(" _ "), "underscore slots should be spaced");
// Slash is past the 10-letter clip on this title — shorter titles keep it.
assert.ok(!balloons.includes("/"), balloons);

const long = titleHintMask("supercalifragilisticexpialidocious");
const letters = long.replace(/[^a-z0-9]/gi, "");
assert.ok(letters.length <= HINT_MAX_LETTERS, long);
assert.equal(titleHintMask(""), "");
assert.equal(displayTitle("9teen (feat slush puppy)"), "9teen");
assert.equal(titleHintMask("9teen (feat slush puppy)"), "9 _ _ e n");

console.log("titleHint.check: ok");
console.log("  daisies      →", titleHintMask("daisies"));
console.log("  hello world →", titleHintMask("hello world"));
console.log("  Don't Stop  →", titleHintMask("Don't Stop"));
console.log("  Mr. Bright… →", titleHintMask("Mr. Brightside"));
console.log("  balloons    →", balloons);
