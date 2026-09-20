/**
 * Self-check: title hint mask.
 * Run: node src/titleHint.check.js
 */
import assert from "node:assert/strict";
import { titleHintMask, displayTitle } from "./titleHint.js";

assert.equal(titleHintMask("daisies"), "d _ _ s _ _ s");
assert.equal(titleHintMask("Daisies"), "d _ _ s _ _ s");
assert.equal(titleHintMask("hello world"), "h _ _ l o   w _ _ l d");
assert.equal(titleHintMask("hello world").includes("·"), false);
assert.match(titleHintMask("hello world"), /o +w/);

assert.equal(titleHintMask("Don't"), "d _ _ ' t");
assert.equal(titleHintMask("Don't Stop"), "d _ _ ' t   s _ _ p");
assert.equal(titleHintMask("Mr. Brightside"), "m r .   b _ _ g _ _ s _ _ e");
assert.equal(titleHintMask("a"), "a");
assert.equal(titleHintMask("Be"), "b e");
assert.equal(titleHintMask("Love / Hate"), "l _ _ e   /   h _ _ e");

// Full title — no letter cap.
const balloons = titleHintMask("House of Balloons / Glass Table Girls");
assert.ok(balloons.includes("/"), balloons);
assert.match(balloons, /g _ _ l s/, balloons);
assert.ok(balloons.includes(" _ "), "underscore slots should be spaced");

const long = titleHintMask("supercalifragilisticexpialidocious");
assert.ok(long.startsWith("s "), long);
assert.ok(long.endsWith(" s"), long);
assert.ok(long.includes("_"), long);

assert.equal(titleHintMask(""), "");
assert.equal(displayTitle("9teen (feat slush puppy)"), "9teen");
assert.equal(titleHintMask("9teen (feat slush puppy)"), "9 _ _ e n");

// Featured artists stripped — only the song name is hinted.
assert.equal(displayTitle("monkey ft. bryson"), "monkey");
assert.equal(titleHintMask("monkey ft. bryson"), "m _ _ k _ y");
assert.equal(displayTitle("Stay (feat. Justin Bieber)"), "Stay");
assert.equal(titleHintMask("Stay (feat. Justin Bieber)"), "s _ _ y");

console.log("titleHint.check: ok");
console.log("  Mr. Brightside →", titleHintMask("Mr. Brightside"));
console.log("  monkey ft.…   →", titleHintMask("monkey ft. bryson"));
console.log("  balloons      →", balloons);
