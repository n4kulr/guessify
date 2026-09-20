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

/** Close enough to t=0 that a restart is not needed. */
const AT_START_EPS = 0.05;
const HAVE_CURRENT_DATA = 2;

/**
 * Arm canplay/error listeners. Always attach before audio.load() — load can
 * fire canplay in the same turn, and an early readyState check would miss it
 * when we are about to drop readyState by reloading.
 */
export function armCanPlay(audio, timeoutMs = 8000) {
  if (!audio) return Promise.reject(new Error("audio missing"));
  return new Promise((resolve, reject) => {
    let timer = null;
    const cleanup = () => {
      if (timer) clearTimeout(timer);
      audio.removeEventListener("canplay", onReady);
      audio.removeEventListener("error", onErr);
    };
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new Error("audio load failed"));
    };
    timer = setTimeout(() => {
      cleanup();
      reject(new Error("audio load timed out"));
    }, timeoutMs);
    audio.addEventListener("canplay", onReady, { once: true });
    audio.addEventListener("error", onErr, { once: true });
    // Already ready (no load coming) — resolve on next microtask so the
    // caller can still sequence load() after arming when needed.
    if (audio.readyState >= HAVE_CURRENT_DATA) {
      queueMicrotask(() => {
        if (audio.readyState >= HAVE_CURRENT_DATA) onReady();
      });
    }
  });
}

/**
 * Wait until the element can play, or reject on error / timeout.
 * Use when no load() is about to run. Prefer armCanPlay + load() for reloads.
 */
export function waitUntilCanPlay(audio, timeoutMs = 8000) {
  if (!audio) return Promise.reject(new Error("audio missing"));
  if (audio.readyState >= HAVE_CURRENT_DATA) return Promise.resolve();
  return armCanPlay(audio, timeoutMs);
}

/**
 * Restart a clip that was already advanced (snippet auto-stop, scrub, etc.).
 *
 * Seeking back to 0 and calling play() still glitches real iTunes MP3s — the
 * opening second plays, stalls, then restarts. load() rebuilds the decode
 * pipeline at t=0 the same way a first play does; the URL is warm in HTTP
 * cache so it is cheap. No-ops when already parked at the start with data.
 */
export async function reloadAudioToStart(audio) {
  if (!audio) return;
  if (
    !audio.seeking &&
    audio.currentTime < AT_START_EPS &&
    audio.readyState >= HAVE_CURRENT_DATA
  ) {
    return;
  }
  // Arm first, then load — readyState is still high here, so waitUntilCanPlay
  // would no-op and miss the post-load canplay.
  const ready = armCanPlay(audio);
  audio.load();
  await ready;
}
