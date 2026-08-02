/**
 * Self-check: title hint mask.
 * Run: node src/titleHint.check.js
 */
import assert from "node:assert/strict";
import { titleHintMask } from "./titleHint.js";

assert.equal(titleHintMask("daisies"), "d _ _ s _ e _");
assert.equal(titleHintMask("Daisies"), "d _ _ s _ e _");
assert.ok(titleHintMask("hello world").includes("_"));
assert.equal(titleHintMask(""), "");
console.log("titleHint.check: ok");
