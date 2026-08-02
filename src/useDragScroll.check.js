/**
 * Self-check: wheel mapping is horizontal-only (no vertical remap).
 * Run: node src/useDragScroll.check.js
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "useDragScroll.js"), "utf8");
assert.match(src, /e\.deltaX/, "uses deltaX");
assert.doesNotMatch(
  src,
  /Math\.abs\(e\.deltaX\) > Math\.abs\(e\.deltaY\) \? e\.deltaX : e\.deltaY/,
  "must not remap dominant vertical to horizontal"
);
assert.match(src, /Math\.abs\(e\.deltaY\) > Math\.abs\(dx\)/, "ignores vertical-dominant gestures");
assert.doesNotMatch(src, /el\.addEventListener\("wheel"/, "single wheel listener only");
console.log("useDragScroll.check: ok");
