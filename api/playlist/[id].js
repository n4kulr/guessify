import { requireSession, spotifyGet } from "../_lib.js";

export default async function handler(req, res) {
  const auth = await requireSession(req, res);
  if (!auth) return;

  const id = req.query.id;
  try {
    const meta = await spotifyGet(
      `https://api.spotify.com/v1/playlists/${id}?fields=name,images,owner(display_name)`,
      auth.access
    );

    // Feb 2026 API migration: GET /playlists/{id}/tracks was removed in favour
    // of /items, and each entry's `track` field was renamed to `item`.
    const tracks = [];
    let next =
      `https://api.spotify.com/v1/playlists/${id}/items` +
      `?fields=next,items(item(id,name,preview_url,artists(name),album(images)))&limit=100`;

    while (next) {
      const page = await spotifyGet(next, auth.access);
      for (const entry of page.items || []) {
        const t = entry.item;
        if (!t) continue;
        tracks.push({
          id: t.id,
          name: t.name,
          artists: (t.artists || []).map((a) => a.name),
          previewUrl: t.preview_url,
          cover: t.album?.images?.[0]?.url || null,
        });
      }
      next = page.next;
    }

    const playable = tracks.filter((t) => t.previewUrl);
    res.status(200).json({
      id,
      name: meta.name,
      owner: meta.owner?.display_name || "",
      cover: meta.images?.[0]?.url || null,
      total: tracks.length,
      playableCount: playable.length,
      tracks: playable,
    });
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
