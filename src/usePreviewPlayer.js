import { useCallback, useEffect, useRef, useState } from "react";
import { resolvePreview } from "./itunes.js";
import { getVolume, subscribeVolume } from "./volume.js";

/**
 * Plays iTunes 30s preview MP3s in a plain <audio> element.
 * No Spotify Premium, no Web Playback SDK, no device registration.
 *
 * Pass `seconds` to cut after that many seconds, or `null`/`Infinity`
 * to play through to the end of the preview.
 */
export function usePreviewPlayer() {
  const audioRef = useRef(null);
  const stopTimer = useRef(null);
  const endedHandlerRef = useRef(null);
  const onStopRef = useRef(null);
  const currentUrlRef = useRef(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audio.volume = getVolume();
    audioRef.current = audio;
    const unsub = subscribeVolume((v) => {
      if (audioRef.current) audioRef.current.volume = v;
    });
    return () => {
      unsub();
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

  const pause = useCallback(() => {
    clearStop();
    clearEnded();
    const a = audioRef.current;
    if (a) {
      a.pause();
      try {
        a.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
    const cb = onStopRef.current;
    onStopRef.current = null;
    cb?.();
  }, []);

  const play = useCallback(async (track, seconds, { onStop } = {}) => {
    setErrorMsg(null);
    const url = await resolvePreview(track);
    if (!url) {
      setErrorMsg("No preview found for this track — try skipping.");
      throw new Error("no preview");
    }

    const audio = audioRef.current;
    if (!audio) throw new Error("audio missing");

    clearStop();
    clearEnded();
    onStopRef.current = onStop || null;

    if (currentUrlRef.current !== url) {
      currentUrlRef.current = url;
      audio.src = url;
      await new Promise((resolve, reject) => {
        if (audio.readyState >= 2) {
          resolve();
          return;
        }
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
        const cleanup = () => {
          audio.removeEventListener("canplay", onReady);
          audio.removeEventListener("error", onErr);
        };
        audio.addEventListener("canplay", onReady, { once: true });
        audio.addEventListener("error", onErr, { once: true });
        audio.load();
      });
    }

    audio.currentTime = 0;
    audio.volume = getVolume();
    try {
      await audio.play();
    } catch (e) {
      setErrorMsg("Couldn't play preview — check autoplay / sound settings.");
      throw e;
    }

    const playFull = seconds == null || seconds === Infinity;
    if (playFull) {
      const onEnded = () => {
        endedHandlerRef.current = null;
        const cb = onStopRef.current;
        onStopRef.current = null;
        cb?.();
      };
      endedHandlerRef.current = onEnded;
      audio.addEventListener("ended", onEnded);
      return;
    }

    const secs = Math.max(0.5, Number(seconds) || 1);
    clearStop();
    stopTimer.current = setTimeout(() => {
      stopTimer.current = null;
      const a = audioRef.current;
      if (a) {
        a.pause();
        try {
          a.currentTime = 0;
        } catch {
          /* ignore */
        }
      }
      const cb = onStopRef.current;
      onStopRef.current = null;
      cb?.();
    }, secs * 1000);
  }, []);

  return {
    errorMsg,
    setErrorMsg,
    play,
    pause,
    audio: audioRef,
  };
}
