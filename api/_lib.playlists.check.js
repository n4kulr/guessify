/**
 * Self-check: /me/playlists offset pagination (Spotify next-URL bug).
 * Run: node api/_lib.playlists.check.js
 */
import assert from "node:assert/strict";
import { nextMePlaylistsOffset, parseEmbedPlaylist } from "./_lib.js";

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

// Public-playlist fallback: parse the embed page's __NEXT_DATA__.
const entity = {
  name: "All Out 2010s",
  authors: [{ name: "Spotify" }],
  coverArt: { sources: [{ url: "https://i.scdn.co/image/x" }] },
  trackList: [
    { uri: "spotify:track:abc", title: "Starboy", subtitle: "The Weeknd,\u00a0Daft Punk" },
    { uri: "spotify:episode:zzz", title: "a podcast" },
    { uri: "spotify:track:def", title: "Levitating", subtitle: "Dua Lipa" },
  ],
};
const html = `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
  props: { pageProps: { state: { data: { entity } } } },
})}</script></html>`;
const pl = parseEmbedPlaylist(html, "pl1");
assert.equal(pl.name, "All Out 2010s");
assert.equal(pl.owner, "Spotify");
assert.equal(pl.cover, "https://i.scdn.co/image/x");
assert.equal(pl.tracks.length, 2, "non-track entries dropped");
assert.deepEqual(pl.tracks[0].artists, ["The Weeknd", "Daft Punk"]);
assert.equal(pl.tracks[0].id, "abc");
assert.equal(parseEmbedPlaylist("<html>nothing</html>", "x"), null);

console.log("_lib.playlists.check: ok");
