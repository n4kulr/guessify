/**
 * Self-check: online active count stays in 5–9.
 * Run: node src/onlineActive.check.js
 */
import assert from "node:assert/strict";
import { onlineActiveCount } from "./onlineActive.js";

for (let i = 0; i < 200; i++) {
  const n = onlineActiveCount(i * 45_000);
  assert.ok(n >= 5 && n <= 9, `got ${n} at slot ${i}`);
}
assert.equal(onlineActiveCount(0), onlineActiveCount(0));

console.log("onlineActive.check: ok");
