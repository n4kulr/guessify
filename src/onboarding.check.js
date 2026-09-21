/**
 * Self-check: onboarding flag helpers.
 * Run: node src/onboarding.check.js
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("./onboarding.js", import.meta.url), "utf8");
assert.match(src, /guessify-onboarding-v1/);
assert.match(src, /Blinding Lights/);
assert.match(src, /\/api\/preview/);
assert.match(src, /hasSeenOnboarding/);
assert.match(src, /markOnboardingSeen/);

console.log("onboarding.check.js: ok");
