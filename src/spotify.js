// Fetch the logged-in user's Spotify access token (needed by the Web Playback
// SDK and the play/pause Web API calls). Cached briefly; the backend refreshes
// the underlying token as needed, so this always returns a valid one.
let cache = { token: null, exp: 0 };

export async function getToken() {
  if (cache.token && Date.now() < cache.exp) return cache.token;
  const r = await fetch("/api/token", { credentials: "include" });
  if (!r.ok) throw new Error("Could not get Spotify token");
  const d = await r.json();
  cache = { token: d.access, exp: Date.now() + 45 * 1000 };
  return d.access;
}

export function clearTokenCache() {
  cache = { token: null, exp: 0 };
}
