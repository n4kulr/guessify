/**
 * Self-check: playlist bests (memory localStorage shim).
 * Run: node src/playlistBests.check.js
 */
import assert from "node:assert/strict";
import { recordPlaylistScore, readPlaylistBests } from "./playlistBests.js";

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const a = recordPlaylistScore("pl1", "Taylor Swift", 2740);
assert.equal(a.best, 2740);
assert.equal(a.today, 2740);

const b = recordPlaylistScore("pl1", "Taylor Swift", 2870);
assert.equal(b.best, 2870);
assert.equal(b.today, 2870);

const c = recordPlaylistScore("pl1", "Taylor Swift", 2600);
assert.equal(c.best, 2870);
assert.equal(c.today, 2870);

const read = readPlaylistBests("pl1");
assert.equal(read.best, 2870);
assert.equal(read.today, 2870);

console.log("playlistBests.check: ok");
