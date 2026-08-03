import { resolvePreview } from "./itunes.js";

/** URLs that have reached canplay on a warmer (or the game player). */
const warmUrls = new Set();
const warmInflight = new Map();

export function isAudioWarm(url) {
  return Boolean(url && warmUrls.has(url));
}

export function markAudioWarm(url) {
  if (url) warmUrls.add(url);
}

/**
 * Buffer an MP3 in a detached Audio element so the game player hits cache.
 * @returns {Promise<boolean>}
 */
export function warmAudioUrl(url, timeoutMs = 15000) {
  if (!url) return Promise.resolve(false);
  if (warmUrls.has(url)) return Promise.resolve(true);
  if (warmInflight.has(url)) return warmInflight.get(url);
  if (typeof Audio === "undefined") return Promise.resolve(false);

  const p = new Promise((resolve) => {
    const a = new Audio();
    a.preload = "auto";
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      a.removeEventListener("canplay", onReady);
      a.removeEventListener("canplaythrough", onReady);
      a.removeEventListener("error", onErr);
      try {
        a.removeAttribute("src");
        a.load();
      } catch {
        /* ignore */
      }
      warmInflight.delete(url);
      if (ok) warmUrls.add(url);
      resolve(ok);
    };
    const onReady = () => finish(true);
    const onErr = () => finish(false);
    const timer = setTimeout(() => finish(false), timeoutMs);
    a.addEventListener("canplaythrough", onReady, { once: true });
    a.addEventListener("canplay", onReady, { once: true });
    a.addEventListener("error", onErr, { once: true });
    a.src = url;
    try {
      a.load();
    } catch {
      finish(false);
    }
  });
  warmInflight.set(url, p);
  return p;
}

/** Resolve iTunes URL + warm the MP3. Returns url or null. */
export async function warmTrackPreview(track) {
  const url = await resolvePreview(track);
  if (!url) return null;
  await warmAudioUrl(url);
  return url;
}

/**
 * Fire-and-forget: resolve (+ warm) up to `limit` tracks so a later shuffle
 * still hits a hot iTunes + HTTP cache.
 */
export function primePlaylistPreviews(tracks, limit = 12) {
  const list = (Array.isArray(tracks) ? tracks : []).slice(0, limit);
  return Promise.all(list.map((t) => warmTrackPreview(t).catch(() => null)));
}

/** Patch one slot in a rounds array with previewUrl (no-op if unchanged). */
export function patchRoundsPreview(rounds, index, url) {
  if (!url || !Array.isArray(rounds)) return rounds;
  const t = rounds[index];
  if (!t || t.previewUrl === url) return rounds;
  const copy = rounds.slice();
  copy[index] = { ...t, previewUrl: url };
  return copy;
}
