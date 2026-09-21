/**
 * Self-check: space toggle play helpers.
 * Run: node src/useSpaceTogglePlay.check.js
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isFinePointerPc } from "./useSpaceTogglePlay.js";

assert.equal(isFinePointerPc(), false, "no window.matchMedia in node");

const src = readFileSync(new URL("./useSpaceTogglePlay.js", import.meta.url), "utf8");
assert.match(src, /pointer:\s*fine/);
assert.match(src, /e\.code !== "Space"/);
assert.match(src, /contenteditable/);

console.log("useSpaceTogglePlay.check.js: ok");
