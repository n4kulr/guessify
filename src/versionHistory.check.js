/**
 * Self-check: version history and changelog integrity.
 * Run: node src/versionHistory.check.js
 */
import assert from "node:assert/strict";
import { APP_VERSION, CHANGELOG } from "./versionHistory.js";

assert.ok(typeof APP_VERSION === "string" && APP_VERSION.startsWith("v"));
assert.ok(Array.isArray(CHANGELOG) && CHANGELOG.length >= 5);

for (const entry of CHANGELOG) {
  assert.ok(entry.version, "entry must have version");
  assert.ok(entry.date, "entry must have date");
  assert.ok(entry.title, "entry must have title");
  assert.ok(Array.isArray(entry.items) && entry.items.length > 0, "entry must have items");
}

assert.equal(CHANGELOG[0].version, APP_VERSION, "latest changelog entry should match APP_VERSION");

console.log("versionHistory.check.js ok");
