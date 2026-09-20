import { useCallback, useEffect, useRef, useState } from "react";
import { resolvePreview } from "./itunes.js";
import { attachVolumeControl } from "./audioOutput.js";
import { pauseGuessifyNowPlaying, setGuessifyNowPlaying } from "./mediaSession.js";
import { markAudioWarm } from "./previewWarm.js";
import {
  previewIsActive,
  previewPipelineBroken,
  seekAudioToStart,
} from "./previewLifecycle.js";

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
      // Don't seek here. playSnippet pause()-then-plays, and an in-flight
      // seek races the next play() — the opening second leaks, then the seek
      // lands and restarts it. Seeking belongs in play(), where we await it.
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
    const audio = new Audio();
    audio.preload = "none";
    audio.playsInline = true;
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

    async function onVisibilityChange() {
      if (document.hidden) {
        if (previewIsActive(activeRefs())) pauseRef.current();
        return;
      }
      // Await the resume before judging the pipeline: checking synchronously
      // raced the state change and could condemn a context that was fine.
      await outputRef.current?.resume();
      if (previewPipelineBroken(audio, outputRef.current)) {
        pauseRef.current();
      }
    }

    function onPageShow(e) {
      if (!e.persisted) return;
      // bfcache restore — React may still show "playing" while Web Audio is dead.
      if (previewIsActive(activeRefs()) || !audio.paused) {
        pauseRef.current();
      }
      void outputRef.current?.resume();
    }

    audio.addEventListener("pause", onAudioPause);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      audio.removeEventListener("pause", onAudioPause);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onPageShow);
      outputRef.current?.detach();
      outputRef.current = null;
      clearTimeout(stopTimer.current);
      if (endedHandlerRef.current) {
        audio.removeEventListener("ended", endedHandlerRef.current);
        endedHandlerRef.current = null;
      }
      audio.pause();
      audio.removeAttribute("src");
      audioRef.current = null;
    };
  }, []);

  const play = useCallback(async (track, seconds, { onStop } = {}) => {
    setErrorMsg(null);
    void outputRef.current?.resume();
    const url = await resolvePreview(track);
    if (!url) {
      throw new Error("no preview");
    }

    const audio = audioRef.current;
    if (!audio) throw new Error("audio missing");

    clearStop();
    clearEnded();
    onStopRef.current = onStop || null;

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
      await new Promise((resolve, reject) => {
        if (audio.readyState >= 2) {
          resolve();
          return;
        }
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
          currentUrlRef.current = null;
          setErrorMsg("Couldn't load preview audio.");
          reject(new Error("audio load failed"));
        };
        timer = setTimeout(() => {
          cleanup();
          currentUrlRef.current = null;
          setErrorMsg("Couldn't load preview audio.");
          reject(new Error("audio load timed out"));
        }, 8000);
        audio.addEventListener("canplay", onReady, { once: true });
        audio.addEventListener("error", onErr, { once: true });
        audio.load();
      });
    }

    markAudioWarm(url);
    // Await the rewind. Fire-and-forget currentTime=0 before play() lets the
    // first second leak out, then the seek lands and restarts it.
    await seekAudioToStart(audio);
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
    setGuessifyNowPlaying();

    const playFull = seconds == null || seconds === Infinity;
    if (playFull) {
      const onEnded = () => pauseRef.current();
      endedHandlerRef.current = onEnded;
      audio.addEventListener("ended", onEnded);
      return;
    }

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
};
