import { requireOwner, fetchLikedTracks } from "../_lib.js";

// Public: the site owner's Liked Songs, readable without a visitor login.
export default async function handler(req, res) {
  const auth = await requireOwner(req, res);
  if (!auth) return;
  try {
    res.status(200).json(await fetchLikedTracks(auth.access));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load Liked Songs." });
  }
}
