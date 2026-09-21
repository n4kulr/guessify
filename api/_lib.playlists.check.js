/**
 * Self-check: /me/playlists offset pagination (Spotify next-URL bug).
 * Run: node api/_lib.playlists.check.js
 */
import assert from "node:assert/strict";
import { nextMePlaylistsOffset } from "./_lib.js";

assert.equal(
  nextMePlaylistsOffset({ offset: 0, limit: 50, total: 54, items: [{}] }),
  50
);
assert.equal(
  nextMePlaylistsOffset({ offset: 50, limit: 50, total: 54, items: [{}] }),
  null
);
assert.equal(
  nextMePlaylistsOffset({ offset: 0, limit: 50, total: 20, items: [{}] }),
  null
);
assert.equal(nextMePlaylistsOffset({ offset: 0, limit: 50, total: 100, items: [] }), null);
assert.equal(nextMePlaylistsOffset(null), null);

console.log("_lib.playlists.check: ok");
