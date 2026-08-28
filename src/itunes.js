// Resolve iTunes/Apple Music preview URLs for Spotify library tracks.
// Cache hits only — failed lookups are retried next play.

const cache = new Map();
/** Cap so a hung /api/preview can't freeze “cueing the record…” forever. */
const PREVIEW_FETCH_MS = 12_000;

export async function resolvePreview(track) {
  if (!track) return null;
  if (track.previewUrl) return track.previewUrl;
  if (!track.name) return null;
  const key = track.id || `${track.name}|${(track.artists || [])[0] || ""}`;
  if (cache.has(key)) return cache.get(key);

  const params = new URLSearchParams({ title: track.name });
  const artist = (track.artists || [])[0];
  if (artist) params.set("artist", artist);

  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), PREVIEW_FETCH_MS) : null;
  try {
    const r = await fetch(`/api/preview?${params}`, ctrl ? { signal: ctrl.signal } : undefined);
    if (!r.ok) return null; // don't cache misses — next attempt may succeed
    const data = await r.json();
    const url = data.previewUrl || null;
    if (data.artworkUrl && !track.cover) {
      track.cover = data.artworkUrl;
    }
    if (url) cache.set(key, url);
    return url;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function clearPreviewCache() {
  cache.clear();
}
