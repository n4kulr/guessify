/**
 * Self-check: expanded seeds + decade compounds + artists.
 * Run: node src/chartSuggest.check.js
 */
import assert from "node:assert/strict";
import {
  buildChartSuggestions,
  CHART_ERA_SUFFIXES,
  CHART_COMPOUND_BASES,
} from "./chartSuggest.js";

assert.ok(CHART_ERA_SUFFIXES.includes("60s"));
assert.ok(CHART_ERA_SUFFIXES.includes("80s"));
assert.ok(CHART_COMPOUND_BASES.includes("tamil"));
assert.ok(CHART_COMPOUND_BASES.includes("brazil"));
assert.ok(CHART_COMPOUND_BASES.includes("bhangra"));

const mala = buildChartSuggestions("mala").map((x) => x.name);
assert.ok(mala.includes("malayalam"), mala.join(", "));
assert.ok(mala.includes("malayalam 2000s"), mala.join(", "));
assert.ok(mala.includes("malayalam 2010s"), mala.join(", "));

const rock = buildChartSuggestions("rock").map((x) => x.name);
assert.ok(rock.includes("rock 80s"), rock.join(", "));

const bill = buildChartSuggestions("bill").map((x) => x.name);
assert.ok(bill.includes("billboard hot 100"), bill.join(", "));
assert.ok(!bill.some((n) => n.startsWith("billboard hot 100 ")));

const withArtist = buildChartSuggestions("tayl", {
  tags: [],
  artists: [{ name: "Taylor Swift" }],
});
assert.ok(withArtist.some((x) => x.kind === "artist" && x.label === "Taylor Swift"));

assert.deepEqual(buildChartSuggestions(""), []);
console.log("chartSuggest.check: ok");
