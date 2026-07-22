// Resolve iTunes/Apple Music preview URLs for Spotify library tracks.
// Cache hits only — failed lookups are retried next play.

const cache = new Map();

export async function resolvePreview(track) {
  if (!track?.name) return null;
  const key = track.id || `${track.name}|${(track.artists || [])[0] || ""}`;
  if (cache.has(key)) return cache.get(key);

  const params = new URLSearchParams({ title: track.name });
  const artist = (track.artists || [])[0];
  if (artist) params.set("artist", artist);

  try {
    const r = await fetch(`/api/preview?${params}`);
    if (!r.ok) return null; // don't cache misses — next attempt may succeed
    const data = await r.json();
    const url = data.previewUrl || null;
    if (url) cache.set(key, url);
    return url;
  } catch {
    return null;
  }
}

export function clearPreviewCache() {
  cache.clear();
}
