/**
 * Self-check: title hint mask.
 * Run: node src/titleHint.check.js
 */
import assert from "node:assert/strict";
import { titleHintMask, HINT_MAX_LETTERS } from "./titleHint.js";

assert.equal(titleHintMask("daisies"), "d _ _ s _ e _");
assert.equal(titleHintMask("Daisies"), "d _ _ s _ e _");

const long = titleHintMask("supercalifragilisticexpialidocious");
const letters = long.replace(/[^a-z0-9]/gi, "");
assert.ok(letters.length <= HINT_MAX_LETTERS, long);
assert.equal(titleHintMask(""), "");
console.log("titleHint.check: ok");
