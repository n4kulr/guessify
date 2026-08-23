/**
 * Self-check: iOS path uses gain; desktop path uses element.volume.
 * Run: node src/audioOutput.check.js
 */
import assert from "node:assert/strict";

const listeners = new Map();

function stubWindow({ ios }) {
  globalThis.window = {
    AudioContext: class {
      constructor() {
        this.state = "running";
        this.destination = {};
      }
      createMediaElementSource() {
        return { connect() {} };
      }
      createGain() {
        return { gain: { value: 1 }, connect() {} };
      }
      async resume() {
        this.state = "running";
      }
    },
    webkitAudioContext: undefined,
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
  // Node 24 exposes navigator as a getter-only global — defineProperty past it.
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    writable: true,
    value: ios
      ? { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", platform: "iPhone", maxTouchPoints: 5 }
      : { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X) Chrome/120", platform: "MacIntel", maxTouchPoints: 0 },
  });
  globalThis.localStorage = {
    _m: new Map(),
    getItem(k) {
      return this._m.has(k) ? this._m.get(k) : null;
    },
    setItem(k, v) {
      this._m.set(k, String(v));
    },
  };
}

stubWindow({ ios: true });
const { setVolume } = await import("./volume.js");
const { attachVolumeControl } = await import("./audioOutput.js");

{
  const audio = { volume: 0.5, muted: false, crossOrigin: null };
  const api = attachVolumeControl(audio);
  assert.equal(audio.crossOrigin, "anonymous");
  assert.equal(audio.volume, 1, "iOS: element volume locked at 1");
  setVolume(0.25);
  assert.equal(api.getLevel(), 0.25, "iOS: slider drives gain");
  assert.equal(audio.volume, 1);

  // The bug this guards: element.muted alone leaves gain untouched, so audio
  // kept playing through the Web Audio graph on iOS after pressing mute.
  api.setMuted(true);
  assert.equal(api.getLevel(), 0, "iOS: mute drops the gain, not just the flag");
  assert.equal(audio.muted, true);
  setVolume(0.8); // slider moves while muted — must stay silent
  assert.equal(api.getLevel(), 0, "iOS: muted survives a volume change");
  api.setMuted(false);
  assert.equal(api.getLevel(), 0.8, "iOS: unmute restores the current slider level");
  api.detach();
}

// Re-import won't re-bind needsGainFader — module already loaded with iOS navigator.
// Desktop path: call apply via a fresh attach after flipping navigator, but the
// module closed over nothing — needsGainFader reads navigator each call. Good.
stubWindow({ ios: false });
{
  const audio = { volume: 0.5, muted: false, crossOrigin: null };
  const api = attachVolumeControl(audio);
  assert.equal(audio.crossOrigin, null, "desktop: no crossOrigin force");
  setVolume(0.4);
  assert.equal(audio.volume, 0.4, "desktop: slider writes element.volume");
  assert.equal(api.getLevel(), 0.4);
  api.setMuted(true);
  assert.equal(audio.muted, true, "desktop: mute sets the element flag");
  assert.equal(audio.volume, 0, "desktop: mute also zeroes volume");
  api.setMuted(false);
  assert.equal(audio.volume, 0.4, "desktop: unmute restores the slider level");
  api.detach();
}

console.log("audioOutput.check: ok");
