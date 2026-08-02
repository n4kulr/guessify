import assert from "node:assert/strict";
import { resolveButtonSound } from "./buttonSounds.js";

function el(tag, className, text = "") {
  // Minimal DOM stand-in for resolve checks under node.
  const node = {
    tagName: tag.toUpperCase(),
    className,
    classList: {
      contains: (c) => className.split(/\s+/).includes(c),
    },
    textContent: text,
    disabled: false,
    getAttribute: () => null,
    closest(sel) {
      if (sel.includes("button") || sel.includes("guess-transport")) return this;
      return null;
    },
  };
  return node;
}

assert.equal(resolveButtonSound(el("button", "btn btn-skip", "skip")), "skip");
assert.equal(resolveButtonSound(el("button", "btn btn-guess", "guess")), "guess");
assert.equal(
  resolveButtonSound(el("button", "btn btn-big btn-multi", "host party")),
  "host-party"
);
assert.equal(
  resolveButtonSound(el("button", "btn btn-big btn-online", "play online")),
  "play-online"
);
assert.equal(
  resolveButtonSound(
    el("button", "btn btn-big btn-online", "pick another playlist")
  ),
  "pick-playlist"
);
assert.equal(
  resolveButtonSound(el("button", "btn btn-big btn-play", "play solo")),
  "play-solo"
);
assert.equal(
  resolveButtonSound(el("button", "btn btn-big btn-play", "play again")),
  "play-again"
);
assert.equal(
  resolveButtonSound(el("button", "btn btn-big btn-play", "back home")),
  "back-home"
);
assert.equal(
  resolveButtonSound(
    el("button", "guess-transport-switch is-paused", "")
  ),
  "transport-play"
);
assert.equal(
  resolveButtonSound(
    el("button", "guess-transport-switch is-playing", "")
  ),
  "transport-pause"
);
assert.equal(resolveButtonSound(el("button", "theme-btn", "theme")), null);

console.log("buttonSounds.check.js: ok");
