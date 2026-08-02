/**
 * Self-check: region compounds + artist suggestions.
 * Run: node src/chartSuggest.check.js
 */
import assert from "node:assert/strict";
import { buildChartSuggestions } from "./chartSuggest.js";

const mala = buildChartSuggestions("mala");
const names = mala.map((x) => x.name);
assert.ok(names.includes("malayalam"), names.join(", "));
assert.ok(names.includes("malayalam 2000s"), names.join(", "));
assert.ok(names.includes("malayalam 2010s"), names.join(", "));

const withArtist = buildChartSuggestions("tayl", {
  tags: [],
  artists: [{ name: "Taylor Swift" }],
});
assert.ok(
  withArtist.some((x) => x.kind === "artist" && x.label === "Taylor Swift"),
  JSON.stringify(withArtist)
);

const pop = buildChartSuggestions("pop");
assert.ok(pop.some((x) => x.name === "pop" && x.pack));

assert.deepEqual(buildChartSuggestions(""), []);
console.log("chartSuggest.check: ok");
