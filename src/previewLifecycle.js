/** True while a preview snippet timer or onStop callback is live. */
export function previewIsActive({ onStop, stopTimer, endedHandler } = {}) {
  return !!(onStop || stopTimer || endedHandler);
}

/**
 * iOS WebKit: a stalled AudioContext ("suspended", or WebKit's non-standard
 * "interrupted" after a tab switch / call) with the element not paused means a
 * silent "playing" — the graph carries all the sound and it isn't running.
 * Caller should pause and clear UI when this returns true.
 */
export function previewPipelineBroken(audio, output) {
  if (!audio || audio.paused) return false;
  return output?.isContextSuspended?.() === true;
}
