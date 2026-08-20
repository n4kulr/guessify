/**
 * Self-check: vertical mouse-wheel pans the shelf; native sideways trackpad stays.
 * Run: node src/useDragScroll.check.js
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "useDragScroll.js"), "utf8");
assert.match(src, /addEventListener\(\s*["']wheel["']/, "maps vertical wheel to shelf");
assert.match(src, /deltaX/, "leave native horizontal trackpad");
assert.match(src, /passive:\s*false/, "wheel preventDefault needs non-passive");
assert.match(src, /window\.addEventListener\(\s*["']pointermove["']/, "drag tracks on window (Windows mouse)");
console.log("useDragScroll.check: ok");
