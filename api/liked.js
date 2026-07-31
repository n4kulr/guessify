import { requireSession, fetchLikedTracks } from "./_lib.js";

// The user's "Liked Songs" — always theirs, so always playable. Returns the
// same shape as /api/playlist/[id] so the game can consume it identically.
export default async function handler(req, res) {
  const auth = await requireSession(req, res);
  if (!auth) return;
  try {
    res.status(200).json(await fetchLikedTracks(auth.access));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load your Liked Songs." });
  }
}
