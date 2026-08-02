import { getVolume, subscribeVolume } from "./volume.js";

/**
 * iOS Safari (and all iOS browsers — WebKit) ignore HTMLMediaElement.volume.
 * Route those through a GainNode so the in-app slider actually works.
 * Desktop/Android keep using element.volume (avoids CORS/Web-Audio pitfalls).
 */
const wired = new WeakMap();

function needsGainFader() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  // iPadOS desktop UA
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function attachVolumeControl(audio) {
  if (!audio) return null;
  if (wired.has(audio)) return wired.get(audio);

  let ctx = null;
  let gain = null;

  if (needsGainFader()) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        // Required before src for MediaElementSource + cross-origin previews.
        audio.crossOrigin = "anonymous";
        ctx = new AC();
        const source = ctx.createMediaElementSource(audio);
        gain = ctx.createGain();
        gain.gain.value = getVolume();
        source.connect(gain);
        gain.connect(ctx.destination);
        audio.volume = 1;
      }
    } catch {
      ctx = null;
      gain = null;
    }
  }

  const apply = (v) => {
    const level = Math.min(1, Math.max(0, Number(v) || 0));
    if (gain) {
      gain.gain.value = level;
    } else {
      audio.volume = level;
    }
  };

  apply(getVolume());
  const unsub = subscribeVolume(apply);

  const api = {
    apply,
    /** Current gain (or element volume when Web Audio unavailable). */
    getLevel() {
      return gain ? gain.gain.value : audio.volume;
    },
    async resume() {
      if (ctx?.state === "suspended") {
        try {
          await ctx.resume();
        } catch {
          /* autoplay / gesture */
        }
      }
    },
    detach() {
      unsub();
      wired.delete(audio);
    },
  };
  wired.set(audio, api);
  return api;
}
