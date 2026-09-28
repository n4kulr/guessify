/**
 * Self-check: preview picking prefers the exact version asked for.
 * Run: node api/preview.check.js
 */
import assert from "node:assert/strict";
import { pickBest } from "./preview.js";

const row = (trackName, artistName = "The Weeknd") => ({
  trackName,
  artistName,
  previewUrl: `https://x/${trackName}`,
});

// iTunes order as of Sep 2026: remix and live list ahead of the studio cut.
const results = [
  row("Blinding Lights (Remix)", "The Weeknd & ROSALIA"),
  row("Blinding Lights (Live)"),
  row("Blinding Lights"),
];

assert.equal(
  pickBest(results, "Blinding Lights", "The Weeknd").trackName,
  "Blinding Lights"
);
// Asking for the live cut still gets it.
assert.equal(
  pickBest(results, "Blinding Lights", "The Weeknd", "Blinding Lights (Live)").trackName,
  "Blinding Lights (Live)"
);
// With only a variant available, it's still used rather than nothing.
assert.equal(
  pickBest([row("Blinding Lights (Live)")], "Blinding Lights", "The Weeknd").trackName,
  "Blinding Lights (Live)"
);

console.log("preview.check: ok");
