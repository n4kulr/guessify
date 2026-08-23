/**
 * Self-check: title hint mask.
 * Run: node src/titleHint.check.js
 */
import assert from "node:assert/strict";
import { titleHintMask, HINT_MAX_LETTERS, displayTitle } from "./titleHint.js";

assert.equal(titleHintMask("daisies"), "d _ _ s _ e _");
assert.equal(titleHintMask("Daisies"), "d _ _ s _ e _");
assert.equal(titleHintMask("hello world"), "h _ _ l _ · w _ _ l _");

const balloons = titleHintMask("House of Balloons / Glass Table Girls");
assert.ok(!balloons.includes("/"), balloons);
assert.ok(balloons.includes("_"), balloons);
assert.ok(balloons.includes(" _ "), "underscore slots should be spaced");

const long = titleHintMask("supercalifragilisticexpialidocious");
const letters = long.replace(/[^a-z0-9]/gi, "");
assert.ok(letters.length <= HINT_MAX_LETTERS, long);
assert.equal(titleHintMask(""), "");
assert.equal(displayTitle("9teen (feat slush puppy)"), "9teen");
assert.equal(titleHintMask("9teen (feat slush puppy)"), "9 _ _ e _");
console.log("titleHint.check: ok");
console.log("  balloons →", balloons);
