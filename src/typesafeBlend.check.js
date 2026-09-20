/**
 * Self-check: Jev suggest blend (no API call).
 * Run: node src/typesafeBlend.check.js
 */
import assert from "node:assert/strict";
import {
  blendSuggestScore,
  SUGGEST_JEV_WEIGHT,
  FEEDBACK_SPAM_BLOCK,
  CHART_PICK_MIN_CONF,
} from "../api/_typesafe.js";

assert.ok(SUGGEST_JEV_WEIGHT > 0 && SUGGEST_JEV_WEIGHT < 1);
assert.ok(FEEDBACK_SPAM_BLOCK > 0.5 && FEEDBACK_SPAM_BLOCK < 1);
assert.ok(CHART_PICK_MIN_CONF > 0 && CHART_PICK_MIN_CONF < 1);

// High Jev score should beat a top catalogue row with a weak Jev score.
const strong = blendSuggestScore(3, 0.2);
const weakTop = blendSuggestScore(0.5, 1);
assert.ok(strong > weakTop, "strong semantic match beats catalogue position alone");

// Equal Jev: better catalogue rank wins.
assert.ok(
  blendSuggestScore(2, 1) > blendSuggestScore(2, 0.2),
  "catalogue tie-break when Jev scores match"
);

// Weight identity: pure catalogue (jev=0) scales with rank.
assert.ok(blendSuggestScore(0, 1) > blendSuggestScore(0, 0));

console.log("typesafeBlend.check: ok");
