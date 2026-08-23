/** True while a preview snippet timer or onStop callback is live. */
export function previewIsActive({ onStop, stopTimer, endedHandler } = {}) {
  return !!(onStop || stopTimer || endedHandler);
}

/**
 * iOS WebKit: suspended AudioContext + element not paused = silent "playing".
 * Caller should pause and clear UI when this returns true.
 */
export function previewPipelineBroken(audio, output) {
  if (!audio || audio.paused) return false;
  return output?.isContextSuspended?.() === true;
}
