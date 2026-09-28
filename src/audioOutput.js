import { getVolume, subscribeVolume } from "./volume.js";

/**
 * Previews play straight from the <audio> element on every platform.
 *
 * iOS/iPadOS ignore HTMLMediaElement.volume, so the slider can't work there.
 * Routing through a Web Audio GainNode made it work, but WebKit parks that
 * context as "interrupted" on every tab switch / call and it often never
 * comes back — silent audio until a reload. Plain elements survive all of
 * that, so iOS gets hardware volume plus a mute toggle instead of a slider.
 */
const wired = new WeakMap();

export function ignoresElementVolume() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  // iPadOS desktop UA
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function attachVolumeControl(audio) {
  if (!audio) return null;
  if (wired.has(audio)) return wired.get(audio);

  audio.playsInline = true;
  let level = 0;
  let muted = false;

  // `muted` also carries volume 0 — the only silence iOS honours.
  const push = () => {
    audio.muted = muted || level <= 0;
    audio.volume = muted ? 0 : level;
  };

  const apply = (v) => {
    level = Math.min(1, Math.max(0, Number(v) || 0));
    push();
  };

  apply(getVolume());
  const unsub = subscribeVolume(apply);

  const api = {
    apply,
    setMuted(next) {
      muted = !!next;
      push();
    },
    isMuted() {
      return muted;
    },
    detach() {
      unsub();
      wired.delete(audio);
    },
  };
  wired.set(audio, api);
  return api;
}
