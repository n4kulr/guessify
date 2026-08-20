/**
 * Self-check: shelf drag helper must not intercept wheel (native = smooth).
 * Run: node src/useDragScroll.check.js
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "useDragScroll.js"), "utf8");
assert.doesNotMatch(src, /addEventListener\(\s*["']wheel["']/, "must not intercept wheel");
assert.doesNotMatch(src, /onWheel/, "no wheel handler");
assert.match(src, /window\.addEventListener\(\s*["']pointermove["']/, "drag tracks on window (Windows mouse)");
console.log("useDragScroll.check: ok");
