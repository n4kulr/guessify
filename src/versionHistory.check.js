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
  assert.ok(/^\d{2}\/\d{2}\/\d{2}$/.test(entry.date), `date must be dd/mm/yy, got ${entry.date}`);
  assert.ok(entry.title, "entry must have title");
  assert.ok(!entry.title.endsWith("."), `title must not end with a period: ${entry.title}`);
  assert.ok(Array.isArray(entry.items) && entry.items.length > 0, "entry must have items");
  for (const item of entry.items) {
    assert.ok(!item.endsWith("."), `item must not end with a period: ${item}`);
  }
}

assert.equal(CHANGELOG[0].version, APP_VERSION, "latest changelog entry should match APP_VERSION");

console.log("versionHistory.check.js ok");
