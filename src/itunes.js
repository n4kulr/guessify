// Resolve iTunes/Apple Music preview URLs for Spotify library tracks.
// Cache hits only — failed lookups are retried next play.

const STORE_KEY = "guessify-preview-urls";
/** Keep the persisted map bounded; oldest entries fall off first. */
const STORE_MAX = 600;

const cache = new Map(readStore());
/**
 * In-flight lookups by key. The prime pass and the round's own cue effect
 * routinely ask for the same track at once — without this they each pay a
 * full upstream round trip.
 */
const inflight = new Map();
/** Cap so a hung /api/preview can't freeze “cueing the record…” forever. */
const PREVIEW_FETCH_MS = 12_000;

function readStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((e) => Array.isArray(e) && e.length === 2) : [];
  } catch {
    return [];
  }
}

function writeStore() {
  try {
    const entries = [...cache.entries()].slice(-STORE_MAX);
    localStorage.setItem(STORE_KEY, JSON.stringify(entries));
  } catch {
    /* quota or no storage — the in-memory map still works */
  }
}

async function fetchPreview(params, signal) {
  const r = await fetch(`/api/preview?${params}`, signal ? { signal } : undefined);
  if (!r.ok) return null;
  return r.json();
}

export async function resolvePreview(track) {
  if (!track) return null;
  if (track.previewUrl) return track.previewUrl;
  if (!track.name) return null;
  const key = track.id || `${track.name}|${(track.artists || [])[0] || ""}`;
  if (cache.has(key)) return cache.get(key);
  if (inflight.has(key)) return inflight.get(key);

  const job = lookup(track, key).finally(() => inflight.delete(key));
  inflight.set(key, job);
  return job;
}

async function lookup(track, key) {
  const params = new URLSearchParams({ title: track.name });
  const artist = (track.artists || [])[0];
  if (artist) params.set("artist", artist);

  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), PREVIEW_FETCH_MS) : null;
  try {
    // One retry: a single flaky fetch shouldn't burn the track and force a
    // mid-game swap. A real 404 returns null from fetchPreview, not a throw.
    let data = null;
    try {
      data = await fetchPreview(params, ctrl?.signal);
    } catch {
      if (ctrl?.signal.aborted) return null;
      data = await fetchPreview(params, ctrl?.signal).catch(() => null);
    }
    if (!data) return null; // don't cache misses — next attempt may succeed
    const url = data.previewUrl || null;
    if (data.artworkUrl && !track.cover) {
      track.cover = data.artworkUrl;
    }
    if (url) {
      cache.set(key, url);
      writeStore();
    }
    return url;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function clearPreviewCache() {
  inflight.clear();
  cache.clear();
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
}
