/**
 * Self-check: chart suggest merge prefers local packs, dedupes remote.
 * Run: node src/chartSuggest.check.js
 */
import assert from "node:assert/strict";

function mergeSuggest(local, remote, limit = 8) {
  const seen = new Set(local.map((x) => x.name));
  const merged = [...local];
  for (const hit of remote) {
    if (seen.has(hit.name)) continue;
    seen.add(hit.name);
    merged.push(hit);
    if (merged.length >= limit) break;
  }
  return merged;
}

const local = [{ name: "pop", local: true }];
const remote = [
  { name: "pop", local: false },
  { name: "malayalam", local: false },
  { name: "malayalam 2000s", local: false },
];
const out = mergeSuggest(local, remote, 8);
assert.equal(out[0].name, "pop");
assert.equal(out[0].local, true);
assert.equal(out.filter((x) => x.name === "pop").length, 1);
assert.ok(out.some((x) => x.name === "malayalam"));
console.log("chartSuggest.check: ok");
