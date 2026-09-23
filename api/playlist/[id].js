import {
  requireAccess,
  fetchPlaylistTracks,
  clientCredentialsAccess,
  fetchAlbumAsPlaylist,
  fetchPlaylistFromEmbed,
} from "../_lib.js";

export default async function handler(req, res) {
  const id = String(req.query.id || "").trim();
  if (!/^[a-zA-Z0-9]+$/.test(id)) {
    res.status(400).json({ error: "Invalid Spotify id." });
    return;
  }

  const kind = String(req.query.kind || "playlist").toLowerCase();
  if (kind === "album") {
    try {
      const token = await clientCredentialsAccess();
      res.status(200).json(await fetchAlbumAsPlaylist(id, token));
    } catch (e) {
      console.error(e);
      let error = "Failed to load album.";
      if (e.status === 404) error = "Album not found.";
      else if (e.status === 403) error = "That album isn’t available.";
      res.status(e.status || 500).json({ error, spotifyStatus: e.status || null });
    }
    return;
  }

  const auth = await requireAccess(req, res);
  if (!auth) return;

  try {
    res.status(200).json(await fetchPlaylistTracks(id, auth.access));
  } catch (e) {
    // Feb 2026: /items only for playlists you own or collaborate on (403), and
    // Spotify's own editorial playlists 404 for apps in development mode.
    if (e.status === 403 || e.status === 404) {
      const scraped = await fetchPlaylistFromEmbed(id);
      if (scraped) {
        res.status(200).json(scraped);
        return;
      }
    }
    console.error(e);
    let error = "Failed to load playlist.";
    if (e.status === 404) error = "Playlist not found.";
    else if (e.status === 403) {
      error =
        "Couldn’t read that playlist — make sure it’s public, or paste an album link instead.";
    }
    res.status(e.status || 500).json({ error, spotifyStatus: e.status || null });
  }
}
