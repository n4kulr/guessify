import { getVolume, subscribeVolume } from "./volume.js";

/**
 * iOS Safari (and all iOS browsers — WebKit) ignore HTMLMediaElement.volume.
 * Route those through a GainNode so the in-app slider actually works.
 * Desktop/Android keep using element.volume (avoids CORS/Web-Audio pitfalls).
 */
const wired = new WeakMap();

/**
 * Context states that mean "no sound is reaching the speakers, but it can be".
 *
 * "interrupted" is WebKit-only and absent from the spec: iOS parks the context
 * there on a tab switch, backgrounding, or a phone call. Once an element is fed
 * through createMediaElementSource its audio ONLY travels the graph, so a
 * stalled context is silent even though play() resolves and currentTime keeps
 * advancing — which looked exactly like "the audio broke, I have to refresh".
 * Checking only for "suspended" meant we never tried to resume it.
 */
export function contextStalled(state) {
  return state === "suspended" || state === "interrupted";
}

export function needsGainFader() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  // iPadOS desktop UA
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function prepareMediaElement(el) {
  el.playsInline = true;
}

export function attachVolumeControl(audio) {
  if (!audio) return null;
  if (wired.has(audio)) return wired.get(audio);

  let ctx = null;
  let gain = null;
  let source = null;
  let media = audio;

  prepareMediaElement(media);

  if (needsGainFader()) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        // Required before src for MediaElementSource + cross-origin previews.
        media.crossOrigin = "anonymous";
        ctx = new AC();
        source = ctx.createMediaElementSource(media);
        gain = ctx.createGain();
        gain.gain.value = getVolume();
        source.connect(gain);
        gain.connect(ctx.destination);
        media.volume = 1;
      }
    } catch {
      ctx = null;
      gain = null;
      source = null;
    }
  }

  let level = 0;
  let muted = false;

  const push = () => {
    const out = muted ? 0 : level;
    if (gain) {
      gain.gain.value = out;
    } else {
      media.volume = out;
    }
  };

  const apply = (v) => {
    level = Math.min(1, Math.max(0, Number(v) || 0));
    push();
  };

  apply(getVolume());
  const unsub = subscribeVolume(apply);

  const retire = (el) => {
    try {
      el.pause();
      el.removeAttribute("src");
      el.load();
    } catch {
      /* ignore */
    }
  };

  const api = {
    apply,
    /** Current gain (or element volume when Web Audio unavailable). */
    getLevel() {
      return gain ? gain.gain.value : media.volume;
    },
    /**
     * Mute has to ride the same path as the slider: once WebKit hands the
     * element to a MediaElementSource, `element.muted` stops gating what
     * reaches the speakers, so muting via the element alone is silent-fail
     * on iOS. Set both — the flag still drives the tab's audio indicator.
     */
    setMuted(next) {
      muted = !!next;
      media.muted = muted;
      push();
    },
    isMuted() {
      return muted;
    },
    async resume() {
      if (!ctx || !contextStalled(ctx.state)) return;
      try {
        await ctx.resume();
      } catch {
        /* autoplay / gesture */
      }
    },
    isContextSuspended() {
      return !!ctx && contextStalled(ctx.state);
    },
    /** True when output rides MediaElementSource (iOS / iPadOS). */
    usesWebAudio() {
      return !!gain;
    },
    /**
     * Point the fader at a fresh <audio>. Reusing a MediaElementSource-wired
     * element after a snippet (load/seek/play) glitches the opening second on
     * iOS Safari — heard as the first 1–2s twice. A new element on the same
     * AudioContext + GainNode plays clean. Returns the element to use.
     */
    swapMediaElement(next) {
      if (!next || next === media) return media;
      prepareMediaElement(next);
      if (ctx && gain) {
        next.crossOrigin = "anonymous";
        next.volume = 1;
        next.muted = muted;
        let nextSource;
        try {
          nextSource = ctx.createMediaElementSource(next);
        } catch {
          return media;
        }
        nextSource.connect(gain);
        try {
          source?.disconnect();
        } catch {
          /* already disconnected */
        }
        source = nextSource;
      } else {
        next.muted = muted;
        next.volume = muted ? 0 : level;
      }
      wired.delete(media);
      retire(media);
      media = next;
      wired.set(media, api);
      push();
      return media;
    },
    detach() {
      unsub();
      wired.delete(media);
      try {
        source?.disconnect();
      } catch {
        /* ignore */
      }
    },
  };
  wired.set(media, api);
  return api;
}
