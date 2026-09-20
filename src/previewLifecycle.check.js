/**
 * Self-check: preview lifecycle helpers.
 * Run: node src/previewLifecycle.check.js
 */
import assert from "node:assert/strict";
import {
  previewIsActive,
  previewPipelineBroken,
  seekAudioToStart,
} from "./previewLifecycle.js";

assert.equal(previewIsActive({}), false);
assert.equal(previewIsActive({ onStop: () => {} }), true);
assert.equal(previewIsActive({ stopTimer: 1 }), true);

assert.equal(
  previewPipelineBroken({ paused: false }, { isContextSuspended: () => true }),
  true
);
assert.equal(
  previewPipelineBroken({ paused: true }, { isContextSuspended: () => true }),
  false
);
assert.equal(
  previewPipelineBroken({ paused: false }, { isContextSuspended: () => false }),
  false
);

// Already at start, not seeking → resolve without touching currentTime.
{
  let writes = 0;
  const audio = {
    seeking: false,
    get currentTime() {
      return 0;
    },
    set currentTime(_v) {
      writes += 1;
    },
    addEventListener() {},
    removeEventListener() {},
  };
  await seekAudioToStart(audio);
  assert.equal(writes, 0);
}

// Mid-clip → assign 0 and wait for seeked before resolving.
{
  let writes = 0;
  let seeked = null;
  const audio = {
    seeking: false,
    _t: 2.4,
    get currentTime() {
      return this._t;
    },
    set currentTime(v) {
      writes += 1;
      this._t = v;
      queueMicrotask(() => seeked?.());
    },
    addEventListener(type, fn) {
      if (type === "seeked") seeked = fn;
    },
    removeEventListener() {
      seeked = null;
    },
  };
  await seekAudioToStart(audio);
  assert.equal(writes, 1);
  assert.equal(audio.currentTime, 0);
}

// In-flight seek (e.g. leftover) → wait, don't assign again.
{
  let writes = 0;
  let seeked = null;
  const audio = {
    seeking: true,
    currentTime: 1.1,
    set currentTime(_v) {
      writes += 1;
    },
    addEventListener(type, fn) {
      if (type === "seeked") seeked = fn;
    },
    removeEventListener() {
      seeked = null;
    },
  };
  const p = seekAudioToStart(audio);
  queueMicrotask(() => seeked?.());
  await p;
  assert.equal(writes, 0);
}

console.log("previewLifecycle.check: ok");
