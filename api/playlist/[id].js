import { requireAccess, fetchPlaylistTracks } from "../_lib.js";

export default async function handler(req, res) {
  const auth = await requireAccess(req, res);
  if (!auth) return;

  try {
    res.status(200).json(await fetchPlaylistTracks(req.query.id, auth.access));
  } catch (e) {
    console.error(e);
    let error = "Failed to load playlist.";
    if (e.status === 404) error = "Playlist not found.";
    else if (e.status === 403) {
      // Since the Feb 2026 API change, track access is limited to your own playlists.
      error = "Spotify only lets apps read tracks from playlists you created. Pick one you own.";
    }
    res.status(e.status || 500).json({ error, spotifyStatus: e.status || null });
  }
}
