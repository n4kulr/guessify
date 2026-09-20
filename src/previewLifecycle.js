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

/** Close enough to t=0 that another seek would only stall playback. */
const AT_START_EPS = 0.05;

/**
 * Park an element at t=0 and resolve once the seek has settled.
 *
 * Seeking is async: assigning currentTime=0 and calling play() in the same
 * turn lets the first ~1s of audio leak out before the seek lands, which
 * restarts the opening — heard as the clip playing its first second twice.
 * Callers that pause-then-play (every playSnippet) used to race exactly that
 * way once we stopped reloading the resource on every press.
 */
export function seekAudioToStart(audio) {
  if (!audio) return Promise.resolve();
  if (!audio.seeking && audio.currentTime < AT_START_EPS) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      audio.removeEventListener("seeked", finish);
      clearTimeout(timer);
      resolve();
    };
    // ponytail: 500ms ceiling — a hung seek must not block the next press forever.
    const timer = setTimeout(finish, 500);
    audio.addEventListener("seeked", finish);
    if (!audio.seeking) {
      try {
        audio.currentTime = 0;
      } catch {
        finish();
      }
    }
  });
}
