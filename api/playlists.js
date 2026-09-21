import {
  requireAccess,
  fetchPlaylistsData,
  spotifyClientError,
  clearSession,
} from "./_lib.js";

export default async function handler(req, res) {
  const auth = await requireAccess(req, res);
  if (!auth) return;
  try {
    res.status(200).json(await fetchPlaylistsData(auth.access));
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
