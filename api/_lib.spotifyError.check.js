/**
 * Self-check: Spotify allowlist error mapping.
 * Run: node api/_lib.spotifyError.check.js
 */
import assert from "node:assert/strict";

process.env.SESSION_SECRET = "test-secret-for-spotify-error-check";

const { spotifyClientError } = await import("./_lib.js");

const hit = spotifyClientError({
  status: 403,
  body: "The user is not registered for this application. Please check your settings on https://developer.spotify.com/dashboard.",
});
assert.equal(hit?.status, 403);
assert.match(hit.error, /allowlist/i);

assert.equal(spotifyClientError({ status: 500, body: "nope" }), null);
assert.equal(spotifyClientError(null), null);

console.log("_lib.spotifyError.check: ok");
