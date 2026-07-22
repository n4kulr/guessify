// Resolve iTunes/Apple Music preview MP3s for Spotify library tracks.
// Cached by Spotify track id (or title|artist) so repeat plays are instant.

const cache = new Map();

export async function resolvePreview(track) {
  if (!track?.name) return null;
  const key = track.id || `${track.name}|${(track.artists || [])[0] || ""}`;
  if (cache.has(key)) return cache.get(key);

  const params = new URLSearchParams({ title: track.name });
  const artist = (track.artists || [])[0];
  if (artist) params.set("artist", artist);

  const r = await fetch(`/api/preview?${params}`);
  if (!r.ok) {
    cache.set(key, null);
    return null;
  }
  const data = await r.json();
  const url = data.previewUrl || null;
  cache.set(key, url);
  return url;
}

export function clearPreviewCache() {
  cache.clear();
}
