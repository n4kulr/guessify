/**
 * Self-check: suggest ranking / dedupe.
 * Run: node src/suggestRank.check.js
 */
import assert from "node:assert/strict";
import {
  rankTrackSuggestions,
  rankArtistSuggestions,
  roundArtistBoost,
} from "./suggestRank.js";

const dupes = [
  { name: "Doves in the Wind", artist: "SZA" },
  { name: "Doves in the Wind", artist: "Sza" },
  { name: "DOVES IN THE WIND", artist: "SZA" },
  { name: "Doves in the Wind", artist: "SZA" },
  { name: "Dove", artist: "Someone Else" },
];
const tracks = rankTrackSuggestions(dupes, "doves in the wind", ["SZA"]);
assert.equal(tracks.length, 2, "one row per distinct title");
assert.equal(tracks[0].name, "Doves in the Wind");
assert.equal(tracks.filter((t) => norm(t.name) === norm("Doves in the Wind")).length, 1);

const mixed = rankTrackSuggestions(
  [
    { name: "Hello", artist: "Adele" },
    { name: "Hello", artist: "Other Band" },
    { name: "Helios", artist: "X" },
  ],
  "hel",
  ["Other Band"]
);
assert.equal(mixed[0].name, "Hello");
assert.equal(mixed[0].artist, "Other Band", "round artist wins the tie on same title");

assert.ok(roundArtistBoost("SZA", ["SZA"]) > roundArtistBoost("Drake", ["SZA"]));

const artists = rankArtistSuggestions(
  [
    { name: "SZA" },
    { name: "Sza" },
    { name: "SZA feat. Kendrick Lamar" },
    { name: "Drake" },
  ],
  "sz",
  ["SZA"]
);
assert.equal(artists.length, 2, "SZA variants collapse; Drake stays");
assert.match(artists[0].name.toLowerCase(), /sza/);

function norm(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

console.log("suggestRank.check: ok");
