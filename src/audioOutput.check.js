/**
 * Self-check: volume + mute ride the plain element on every platform.
 * Run: node src/audioOutput.check.js
 */
import assert from "node:assert/strict";

function stubNavigator(ios) {
  // Node 24 exposes navigator as a getter-only global — defineProperty past it.
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    writable: true,
    value: ios
      ? { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", platform: "iPhone", maxTouchPoints: 5 }
      : { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X) Chrome/120", platform: "MacIntel", maxTouchPoints: 0 },
  });
}

const listeners = new Map();
globalThis.window = {
  addEventListener(type, cb) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(cb);
  },
  removeEventListener(type, cb) {
    listeners.get(type)?.delete(cb);
  },
  dispatchEvent(e) {
    for (const cb of listeners.get(e.type) || []) cb(e);
  },
};
globalThis.localStorage = {
  _m: new Map(),
  getItem(k) {
    return this._m.has(k) ? this._m.get(k) : null;
  },
  setItem(k, v) {
    this._m.set(k, String(v));
  },
};

const { setVolume } = await import("./volume.js");
const { attachVolumeControl, ignoresElementVolume } = await import("./audioOutput.js");

stubNavigator(true);
assert.equal(ignoresElementVolume(), true, "iPhone ignores element.volume");
stubNavigator(false);
assert.equal(ignoresElementVolume(), false, "desktop honours element.volume");

{
  const audio = { volume: 0.5, muted: false, crossOrigin: null };
  const api = attachVolumeControl(audio);
  assert.equal(audio.crossOrigin, null, "no CORS mode — nothing reads the samples");
  setVolume(0.4);
  assert.equal(audio.volume, 0.4, "slider writes element.volume");
  assert.equal(audio.muted, false);

  // iOS ignores volume, so 0 has to mute or the toggle would be silent-fail.
  setVolume(0);
  assert.equal(audio.muted, true, "volume 0 mutes the element");
  setVolume(0.7);
  assert.equal(audio.muted, false, "raising volume unmutes");

  api.setMuted(true);
  assert.equal(audio.muted, true);
  assert.equal(audio.volume, 0);
  setVolume(0.8); // slider moves while muted — must stay silent
  assert.equal(audio.muted, true, "muted survives a volume change");
  api.setMuted(false);
  assert.equal(audio.muted, false);
  assert.equal(audio.volume, 0.8, "unmute restores the current slider level");
  api.detach();
}

console.log("audioOutput.check: ok");
