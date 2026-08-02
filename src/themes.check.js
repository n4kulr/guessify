/**
 * Self-check: every player accent maps to a unique theme.
 * Run: node src/themes.check.js
 */
import assert from "node:assert/strict";
import {
  themeKeyForAccent,
  THEMES,
  DEFAULT_THEME,
  getThemePalette,
  currentThemeKey,
} from "./themes.js";
import { PLAYER_COLORS } from "./multiplayer/constants.js";

const used = new Map();
for (const hex of PLAYER_COLORS) {
  const key = themeKeyForAccent(hex);
  assert.ok(THEMES[key], `${hex} → missing theme ${key}`);
  assert.equal(
    THEMES[key].main.toLowerCase(),
    hex.toLowerCase(),
    `${hex} theme main should match accent (got ${THEMES[key].main})`
  );
  assert.ok(!used.has(key), `${hex} collides with ${used.get(key)} on theme ${key}`);
  used.set(key, hex);
}
assert.equal(used.size, PLAYER_COLORS.length);

assert.equal(currentThemeKey(), DEFAULT_THEME);
const palette = getThemePalette();
assert.equal(palette.main, THEMES[DEFAULT_THEME].main);
assert.equal(palette.bg, THEMES[DEFAULT_THEME].bg);

console.log("themes.check: ok");
