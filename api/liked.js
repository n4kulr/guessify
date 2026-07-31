import { requireAccess, fetchLikedTracks } from "./_lib.js";

// The user's "Liked Songs" (or the owner's, if the visitor isn't logged in) —
// always the token's own, so always playable. Same shape as /api/playlist/[id].
export default async function handler(req, res) {
  const auth = await requireAccess(req, res);
  if (!auth) return;
  try {
    res.status(200).json(await fetchLikedTracks(auth.access));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load your Liked Songs." });
  }
}
