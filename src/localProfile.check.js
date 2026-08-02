/**
 * Self-check: customize flag is only set when requested.
 * Run: node src/localProfile.check.js
 */
import assert from "node:assert/strict";

const store = new Map();
globalThis.localStorage = {
  getItem(k) {
    return store.has(k) ? store.get(k) : null;
  },
  setItem(k, v) {
    store.set(k, String(v));
  },
};

const {
  saveLocalProfile,
  hasSavedLocalProfile,
  loadLocalProfile,
} = await import("./localProfile.js");

assert.equal(hasSavedLocalProfile(), false);
saveLocalProfile({ name: "from-spotify", avatar: { peep: 1, color: "#e2b714" } });
assert.equal(hasSavedLocalProfile(), false, "name sync must not mark customized");
assert.equal(loadLocalProfile().name, "from-spotify");

saveLocalProfile(
  { name: "nakul", avatar: { peep: 2, color: "#7aa2f7" } },
  { customized: true }
);
assert.equal(hasSavedLocalProfile(), true);
assert.equal(loadLocalProfile().name, "nakul");
console.log("localProfile.check: ok");
