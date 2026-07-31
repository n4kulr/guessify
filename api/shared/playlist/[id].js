import { requireOwner, fetchPlaylistTracks } from "../../_lib.js";

// Public: one of the site owner's playlists, readable without a visitor login.
export default async function handler(req, res) {
  const auth = await requireOwner(req, res);
  if (!auth) return;

  try {
    res.status(200).json(await fetchPlaylistTracks(req.query.id, auth.access));
  } catch (e) {
    console.error(e);
    let error = "Failed to load playlist.";
    if (e.status === 404) error = "Playlist not found.";
    else if (e.status === 403) {
      error = "Spotify only lets apps read tracks from playlists it created.";
    }
    res.status(e.status || 500).json({ error, spotifyStatus: e.status || null });
  }
}
