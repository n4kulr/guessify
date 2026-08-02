/**
 * Self-check: spare picker skips used + current.
 * Run: node src/deadPreview.check.js
 */
import assert from "node:assert/strict";
import { nextSpareTrack } from "./deadPreview.js";

const pool = [{ id: "a" }, { id: "b" }, { id: "c" }];
const used = new Set(["a"]);

assert.equal(nextSpareTrack(pool, used, "b")?.id, "c");
assert.equal(nextSpareTrack(pool, used, null)?.id, "b");
used.add("b");
used.add("c");
assert.equal(nextSpareTrack(pool, used, "a"), null);
console.log("deadPreview.check: ok");
