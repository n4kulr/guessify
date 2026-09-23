import {
  requireAccess,
  readSession,
  fetchPlaylistsData,
  spotifyClientError,
  clearSession,
} from "./_lib.js";

// ponytail: per-warm-instance cache of the owner's shared shelf (logged-out view);
// cold starts still pay the Spotify round trips. Move to a KV if that matters.
const SHARED_TTL_MS = 5 * 60 * 1000;
let sharedCache = null; // { at, data }

export default async function handler(req, res) {
  const shared = !readSession(req);
  if (shared && sharedCache && Date.now() - sharedCache.at < SHARED_TTL_MS) {
    res.status(200).json(sharedCache.data);
    return;
  }
  const auth = await requireAccess(req, res);
  if (!auth) return;
  try {
    const data = await fetchPlaylistsData(auth.access);
    if (shared) sharedCache = { at: Date.now(), data };
    res.status(200).json(data);
  } catch (e) {
    console.error(e);
    const known = spotifyClientError(e);
    if (known) {
      // Session is useless until the account is allowlisted.
      clearSession(res);
      res.status(known.status).json({ error: known.error });
      return;
    }
    res.status(e.status || 500).json({
      error: "Failed to load playlists",
      detail: String(e.body || e.message || "").slice(0, 240),
    });
  }
}
