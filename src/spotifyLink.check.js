/**
 * Self-check: Spotify link parser.
 * Run: node src/spotifyLink.check.js
 */
import assert from "node:assert/strict";
import { parseSpotifyLink } from "./spotifyLink.js";

assert.deepEqual(parseSpotifyLink("spotify:album:4aawyAB9vmqN3uQ7FjRGTy"), {
  kind: "album",
  id: "4aawyAB9vmqN3uQ7FjRGTy",
});
assert.deepEqual(
  parseSpotifyLink("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"),
  { kind: "playlist", id: "37i9dQZF1DXcBWIGoYBM5M" }
);
assert.deepEqual(
  parseSpotifyLink(
    "https://open.spotify.com/intl-de/album/4aawyAB9vmqN3uQ7FjRGTy?si=abc"
  ),
  { kind: "album", id: "4aawyAB9vmqN3uQ7FjRGTy" }
);
assert.equal(parseSpotifyLink("https://open.spotify.com/track/abc"), null);
assert.equal(parseSpotifyLink(""), null);
assert.equal(parseSpotifyLink("not a link"), null);

console.log("spotifyLink.check.js: ok");
