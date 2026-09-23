import {
  requireSession,
  readSession,
  spotifyGet,
  spotifyClientError,
  clearSession,
} from "./_lib.js";

export default async function handler(req, res) {
  if (!readSession(req)) {
    res.status(200).json({ loggedIn: false });
    return;
  }
  const auth = await requireSession(req, res);
  if (!auth) return;
  try {
    const me = await spotifyGet("https://api.spotify.com/v1/me", auth.access);
    res.status(200).json({
      loggedIn: true,
      displayName: me.display_name,
      image: me.images?.[0]?.url || null,
    });
  } catch (e) {
    console.error(e);
    const known = spotifyClientError(e);
    if (known) {
      clearSession(res);
      res.status(known.status).json({ error: known.error });
      return;
    }
    res.status(e.status || 500).json({ error: "Failed to load profile" });
  }
}
