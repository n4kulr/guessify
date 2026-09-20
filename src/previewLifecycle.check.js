/**
 * Self-check: preview lifecycle helpers.
 * Run: node src/previewLifecycle.check.js
 */
import assert from "node:assert/strict";
import {
  previewIsActive,
  previewPipelineBroken,
  reloadAudioToStart,
  waitUntilCanPlay,
  armCanPlay,
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

// Already ready → waitUntilCanPlay resolves without listeners.
{
  let added = 0;
  const audio = {
    readyState: 2,
    addEventListener() {
      added += 1;
    },
    removeEventListener() {},
  };
  await waitUntilCanPlay(audio);
  assert.equal(added, 0);
}

// Not ready → resolves on canplay.
{
  let canplay = null;
  const audio = {
    readyState: 1,
    addEventListener(type, fn) {
      if (type === "canplay") canplay = fn;
    },
    removeEventListener() {
      canplay = null;
    },
  };
  const p = waitUntilCanPlay(audio, 1000);
  audio.readyState = 2;
  canplay?.();
  await p;
}

// Parked at start with data → reloadAudioToStart is a no-op.
{
  let loads = 0;
  const audio = {
    seeking: false,
    currentTime: 0,
    readyState: 4,
    load() {
      loads += 1;
    },
    addEventListener() {},
    removeEventListener() {},
  };
  await reloadAudioToStart(audio);
  assert.equal(loads, 0);
}

// Mid-clip → arm, load (drops readyState), then canplay.
{
  let loads = 0;
  let canplay = null;
  const audio = {
    seeking: false,
    currentTime: 3.9,
    readyState: 4,
    load() {
      loads += 1;
      this.readyState = 1;
      this.currentTime = 0;
      queueMicrotask(() => {
        this.readyState = 4;
        canplay?.();
      });
    },
    addEventListener(type, fn) {
      if (type === "canplay") canplay = fn;
    },
    removeEventListener() {
      canplay = null;
    },
  };
  await reloadAudioToStart(audio);
  assert.equal(loads, 1);
  assert.equal(audio.currentTime, 0);
  assert.equal(audio.readyState, 4);
}

// Mid-clip with sync canplay inside load() — must not hang.
{
  let loads = 0;
  let canplay = null;
  const audio = {
    seeking: false,
    currentTime: 2,
    readyState: 4,
    load() {
      loads += 1;
      this.readyState = 0;
      this.currentTime = 0;
      this.readyState = 4;
      canplay?.();
    },
    addEventListener(type, fn) {
      if (type === "canplay") canplay = fn;
    },
    removeEventListener() {
      canplay = null;
    },
  };
  await reloadAudioToStart(audio);
  assert.equal(loads, 1);
}

// armCanPlay: load drops readyState before the "already ready" microtask —
// must wait for the real canplay, not resolve early on stale readyState.
{
  let canplay = null;
  let resolvedEarly = false;
  const audio = {
    readyState: 4,
    addEventListener(type, fn) {
      if (type === "canplay") canplay = fn;
    },
    removeEventListener() {
      canplay = null;
    },
  };
  const p = armCanPlay(audio, 1000).then(() => {
    // readyState must be post-load ready, not the pre-load 4
    assert.equal(audio.readyState, 2);
  });
  // Simulate load() dropping readyState in the same turn as arm.
  audio.readyState = 0;
  await Promise.resolve(); // flush arm's microtask — must NOT resolve yet
  resolvedEarly = false;
  p.then(() => {
    resolvedEarly = true;
  });
  await Promise.resolve();
  assert.equal(resolvedEarly, false);
  audio.readyState = 2;
  canplay?.();
  await p;
}

console.log("previewLifecycle.check: ok");
