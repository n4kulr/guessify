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
  paletteFor,
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

assert.equal(THEMES.serika_light, undefined);
const serikaLight = paletteFor("serika_dark", "light");
assert.equal(serikaLight.bg, "#e1e1e1");
assert.equal(serikaLight.text, "#323437");
assert.equal(serikaLight.main, THEMES.serika_dark.main);

const oliviaLight = paletteFor("olivia", "light");
assert.equal(oliviaLight.main, THEMES.olivia.main);
assert.equal(oliviaLight.text, THEMES.olivia.bg);
assert.notEqual(oliviaLight.bg.toLowerCase(), THEMES.olivia.bg.toLowerCase());

assert.equal(currentThemeKey(), DEFAULT_THEME);
const palette = getThemePalette();
assert.equal(palette.main, THEMES[DEFAULT_THEME].main);
assert.equal(palette.bg, THEMES[DEFAULT_THEME].bg);

console.log("themes.check: ok");
