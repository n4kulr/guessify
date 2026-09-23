import { useCallback, useEffect, useRef, useState } from "react";
import { resolvePreview } from "./itunes.js";
import { attachVolumeControl } from "./audioOutput.js";
import { pauseGuessifyNowPlaying, setGuessifyNowPlaying } from "./mediaSession.js";
import { markAudioWarm } from "./previewWarm.js";
import {
  previewIsActive,
  previewPipelineBroken,
  reloadAudioToStart,
  armCanPlay,
  shouldExtendToFull,
} from "./previewLifecycle.js";

function newAudioShell() {
  const audio = new Audio();
  audio.preload = "none";
  audio.playsInline = true;
  return audio;
}

/**
 * Plays iTunes 30s preview MP3s in a plain <audio> element.
 * No Spotify Premium, no Web Playback SDK, no device registration.
 *
 * Pass `seconds` to cut after that many seconds, or `null`/`Infinity`
 * to play through to the end of the preview.
 */
export function usePreviewPlayer() {
  const audioRef = useRef(null);
  const outputRef = useRef(null);
  const stopTimer = useRef(null);
  const endedHandlerRef = useRef(null);
  const onStopRef = useRef(null);
  const currentUrlRef = useRef(null);
  const selfPauseRef = useRef(false);
  const pauseRef = useRef(() => {});
  const pauseListenerRef = useRef(null);
  const [errorMsg, setErrorMsg] = useState(null);

  function clearStop() {
    clearTimeout(stopTimer.current);
    stopTimer.current = null;
  }

  function clearEnded() {
    const a = audioRef.current;
    if (a && endedHandlerRef.current) {
      a.removeEventListener("ended", endedHandlerRef.current);
    }
    endedHandlerRef.current = null;
  }

  function activeRefs() {
    return {
      onStop: onStopRef.current,
      stopTimer: stopTimer.current,
      endedHandler: endedHandlerRef.current,
    };
  }

  /** Drop UI + media-session state without touching the element (OS already paused). */
  function finishPlayback() {
    clearStop();
    clearEnded();
    pauseGuessifyNowPlaying();
    const cb = onStopRef.current;
    onStopRef.current = null;
    cb?.();
  }

  const pause = useCallback(() => {
    clearStop();
    clearEnded();
    const a = audioRef.current;
    if (a) {
      selfPauseRef.current = true;
      a.pause();
      // Don't seek here. Seeking belongs in play()/element swap.
    }
    pauseGuessifyNowPlaying();
    const cb = onStopRef.current;
    onStopRef.current = null;
    cb?.();
  }, []);

  pauseRef.current = pause;

  const prime = useCallback(() => {
    void outputRef.current?.resume();
  }, []);

  useEffect(() => {
    const audio = newAudioShell();
    audioRef.current = audio;
    outputRef.current = attachVolumeControl(audio);

    function onAudioPause() {
      if (selfPauseRef.current) {
        selfPauseRef.current = false;
        return;
      }
      if (!previewIsActive(activeRefs())) return;
      finishPlayback();
    }

    pauseListenerRef.current = onAudioPause;
    audio.addEventListener("pause", onAudioPause);

    async function onVisibilityChange() {
      if (document.hidden) {
        if (previewIsActive(activeRefs())) pauseRef.current();
        return;
      }
      // Await the resume before judging the pipeline: checking synchronously
      // raced the state change and could condemn a context that was fine.
      await outputRef.current?.resume();
      if (previewPipelineBroken(audioRef.current, outputRef.current)) {
        pauseRef.current();
      }
    }

    function onPageShow(e) {
      if (!e.persisted) return;
      // bfcache restore — React may still show "playing" while Web Audio is dead.
      const a = audioRef.current;
      if (previewIsActive(activeRefs()) || (a && !a.paused)) {
        pauseRef.current();
      }
      void outputRef.current?.resume();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      const a = audioRef.current;
      if (a && pauseListenerRef.current) {
        a.removeEventListener("pause", pauseListenerRef.current);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onPageShow);
      outputRef.current?.detach();
      outputRef.current = null;
      clearTimeout(stopTimer.current);
      if (a && endedHandlerRef.current) {
        a.removeEventListener("ended", endedHandlerRef.current);
        endedHandlerRef.current = null;
      }
      if (a) {
        a.pause();
        a.removeAttribute("src");
      }
      audioRef.current = null;
    };
  }, []);

  function armFullUntilEnd(audio, onStop) {
    clearStop();
    clearEnded();
    onStopRef.current = onStop || null;
    const onEnded = () => pauseRef.current();
    endedHandlerRef.current = onEnded;
    audio.addEventListener("ended", onEnded);
    setGuessifyNowPlaying();
  }

  const play = useCallback(async (track, seconds, { onStop } = {}) => {
    setErrorMsg(null);
    void outputRef.current?.resume();

    const playFull = seconds == null || seconds === Infinity;
    let audio = audioRef.current;
    if (!audio) throw new Error("audio missing");

    // Kill the snippet cut before any await — otherwise the timer can pause
    // mid-resolve and we fall into a gesture-less restart.
    if (playFull && !audio.paused) clearStop();

    const url = await resolvePreview(track);
    if (!url) {
      throw new Error("no preview");
    }

    // Round-end: keep a live same-URL clip instead of pause+replay (autoplay).
    if (
      shouldExtendToFull(playFull, {
        paused: audio.paused,
        currentUrl: currentUrlRef.current,
        url,
      })
    ) {
      armFullUntilEnd(audio, onStop);
      return;
    }

    clearStop();
    clearEnded();
    onStopRef.current = onStop || null;

    // iOS MediaElementSource: reusing the same element after a snippet
    // (load/seek/play) doubles the opening second. Swap in a fresh <audio>
    // on the same AudioContext — same pipeline as a first play, which is fine.
    const output = outputRef.current;
    if (output?.usesWebAudio?.() && currentUrlRef.current) {
      const prev = audio;
      const next = newAudioShell();
      if (pauseListenerRef.current) {
        prev.removeEventListener("pause", pauseListenerRef.current);
      }
      audio = output.swapMediaElement(next);
      audioRef.current = audio;
      if (pauseListenerRef.current) {
        audio.addEventListener("pause", pauseListenerRef.current);
      }
      currentUrlRef.current = null;
    }

    // Safari can tear down a backgrounded tab's media resource: the element
    // keeps the same src but drops back to HAVE_NOTHING. Reusing it then
    // "plays" nothing until a reload, so treat an emptied element as a new URL.
    //
    // It must be HAVE_NOTHING exactly, not "< HAVE_CURRENT_DATA": an in-flight
    // seek dips readyState to HAVE_METADATA. Testing for the dip re-downloaded
    // the clip on every single press and started playback with nothing
    // buffered, which stuttered the first second. A torn-down element loses
    // its metadata too, so only 0 means genuinely gone.
    const HAVE_NOTHING = 0;
    if (currentUrlRef.current !== url || audio.readyState === HAVE_NOTHING) {
      currentUrlRef.current = url;
      audio.src = url;
      try {
        const ready = armCanPlay(audio);
        audio.load();
        await ready;
      } catch {
        currentUrlRef.current = null;
        setErrorMsg("Couldn't load preview audio.");
        throw new Error("audio load failed");
      }
    } else {
      // Desktop reuse: same URL mid-clip — reload from cache (no Web Audio).
      try {
        await reloadAudioToStart(audio);
      } catch {
        currentUrlRef.current = null;
        setErrorMsg("Couldn't load preview audio.");
        throw new Error("audio load failed");
      }
    }

    markAudioWarm(url);
    await outputRef.current?.resume();
    try {
      await audio.play();
    } catch (e) {
      // A rejected play() does not mean silence. WebKit rejects with
      // AbortError whenever a play is interrupted by a pause or a load, and
      // playback can already be under way by the time we get here — so
      // calling play() again stacks a second start on top of the first, which
      // is audible as an echo. Only recover when the element really is
      // stopped; otherwise the rejection was cosmetic and we carry on.
      if (!audio.paused) {
        // Playing despite the rejection — nothing to recover.
      } else if (outputRef.current?.isContextSuspended?.()) {
        try {
          await outputRef.current.resume();
          await audio.play();
        } catch {
          setErrorMsg("Couldn't play preview — check autoplay / sound settings.");
          throw e;
        }
      } else {
        setErrorMsg("Couldn't play preview — check autoplay / sound settings.");
        throw e;
      }
    }
    if (playFull) {
      armFullUntilEnd(audio, onStop);
      return;
    }

    setGuessifyNowPlaying();
    const secs = Math.max(0.5, Number(seconds) || 1);
    clearStop();
    stopTimer.current = setTimeout(() => pauseRef.current(), secs * 1000);
  }, []);

  return {
    errorMsg,
    setErrorMsg,
    play,
    pause,
    prime,
    audio: audioRef,
  };
}
