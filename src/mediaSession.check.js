/**
 * Self-check: Now Playing metadata never includes track fields.
 * Run: node src/mediaSession.check.js
 */
import assert from "node:assert/strict";

let lastMeta = null;
globalThis.window = { location: { origin: "https://guessify.uk" } };
globalThis.MediaMetadata = class {
  constructor(init) {
    Object.assign(this, init);
  }
};
globalThis.navigator = {
  mediaSession: {
    metadata: null,
    playbackState: "none",
    set metadata(v) {
      lastMeta = v;
      this._m = v;
    },
    get metadata() {
      return this._m;
    },
  },
};

const { setGuessifyNowPlaying } = await import("./mediaSession.js");
setGuessifyNowPlaying();

assert.equal(lastMeta.title, "guessify");
assert.equal(lastMeta.artist, "name that song");
assert.match(lastMeta.artwork[0].src, /\/og\.png$/);
assert.ok(!("name" in lastMeta));
assert.ok(!String(lastMeta.title).includes(" — "));
console.log("mediaSession.check: ok");
