/**
 * Self-check: suggest ranking / dedupe.
 * Run: node src/suggestRank.check.js
 */
import assert from "node:assert/strict";
import {
  rankTrackSuggestions,
  rankArtistSuggestions,
  roundArtistBoost,
  popularityScore,
} from "./suggestRank.js";

const dupes = [
  { name: "Doves in the Wind", artist: "SZA", listeners: "120000" },
  { name: "Doves in the Wind", artist: "Sza", listeners: "500" },
  { name: "DOVES IN THE WIND", artist: "SZA", listeners: "900000" },
  { name: "Doves in the Wind", artist: "SZA", listeners: "900000" },
  { name: "Dove", artist: "Someone Else", listeners: "50" },
];
const tracks = rankTrackSuggestions(dupes, "doves in the wind", ["SZA"]);
assert.equal(tracks.length, 2, "one row per distinct title");
assert.equal(norm(tracks[0].name), norm("Doves in the Wind"));
assert.equal(tracks.filter((t) => norm(t.name) === norm("Doves in the Wind")).length, 1);

const mixed = rankTrackSuggestions(
  [
    { name: "Hello", artist: "Adele", listeners: "5000000" },
    { name: "Hello", artist: "Other Band", listeners: "100" },
    { name: "Helios", artist: "X", listeners: "800" },
  ],
  "hel",
  ["Other Band"]
);
assert.equal(mixed[0].name, "Hello");
assert.equal(mixed[0].artist, "Adele", "popularity beats round-artist nudge on same title");

const popularTrack = rankTrackSuggestions(
  [
    { name: "Daisies", artist: "Obscure Act", listeners: "200" },
    { name: "Daisies", artist: "Justin Bieber", listeners: "800000" },
    { name: "Daisies", artist: "Katy Perry", listeners: "250000" },
  ],
  "dais"
);
assert.equal(popularTrack[0].artist, "Justin Bieber", "popular same-title row wins");

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

const daniels = rankArtistSuggestions(
  [
    { name: "Daniel", listeners: "420000" },
    { name: "DanièL", listeners: "800" },
    { name: "Đảniël", listeners: "1200" },
    { name: "Daníel", listeners: "600" },
    { name: "Daniel Caesar", listeners: "2800000" },
    { name: "Trevor Daniel", listeners: "1900000" },
  ],
  "daniel"
);
assert.equal(
  daniels.filter((a) => asciiFold(a.name) === "daniel").length,
  1,
  "diacritic Daniels collapse to one row"
);
assert.equal(daniels[0].name, "Daniel Caesar", "most popular artist first");
assert.ok(daniels.some((a) => a.name === "Trevor Daniel"));
assert.ok(!daniels.some((a) => a.name === "DanièL"));

assert.ok(popularityScore(1_000_000) > popularityScore(1_000));

function norm(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function asciiFold(s) {
  return String(s)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

console.log("suggestRank.check: ok");
