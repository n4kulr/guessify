/**
 * Self-check: title hint mask.
 * Run: node src/titleHint.check.js
 */
import assert from "node:assert/strict";
import { titleHintMask, HINT_MAX_LETTERS } from "./titleHint.js";

assert.equal(titleHintMask("daisies"), "d▢▢s▢e▢");
assert.equal(titleHintMask("Daisies"), "d▢▢s▢e▢");
assert.equal(titleHintMask("hello world"), "h▢▢l▢ · w▢▢l▢");

const balloons = titleHintMask("House of Balloons / Glass Table Girls");
assert.ok(!balloons.includes("/"), balloons);
assert.ok(balloons.includes("▢"), balloons);

const long = titleHintMask("supercalifragilisticexpialidocious");
const letters = long.replace(/[^a-z0-9]/gi, "");
assert.ok(letters.length <= HINT_MAX_LETTERS, long);
assert.equal(titleHintMask(""), "");
console.log("titleHint.check: ok");
console.log("  balloons →", balloons);
