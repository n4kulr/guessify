/**
 * Self-check: preview lifecycle helpers.
 * Run: node src/previewLifecycle.check.js
 */
import assert from "node:assert/strict";
import { previewIsActive, previewPipelineBroken } from "./previewLifecycle.js";

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

console.log("previewLifecycle.check: ok");
