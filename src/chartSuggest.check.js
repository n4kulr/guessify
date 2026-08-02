/**
 * Self-check: “mala” suggests malayalam + decade compounds.
 * Run: node src/chartSuggest.check.js
 */
import assert from "node:assert/strict";
import { buildChartSuggestions } from "./chartSuggest.js";

const mala = buildChartSuggestions("mala");
const names = mala.map((x) => x.name);
assert.ok(names.includes("malayalam"), names.join(", "));
assert.ok(names.includes("malayalam 2000s"), names.join(", "));
assert.ok(names.includes("malayalam 2010s"), names.join(", "));

const pop = buildChartSuggestions("pop");
assert.ok(pop.some((x) => x.name === "pop" && x.pack));

const remote = buildChartSuggestions("tam", [{ name: "tamil" }]);
assert.ok(remote.some((x) => x.name === "tamil 2000s"));

assert.deepEqual(buildChartSuggestions(""), []);
console.log("chartSuggest.check: ok");
