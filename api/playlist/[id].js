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

    const tracks = [];
    let next =
      `https://api.spotify.com/v1/playlists/${id}/tracks` +
      `?fields=next,items(track(id,name,preview_url,artists(name),album(images)))&limit=100`;

    while (next) {
      const page = await spotifyGet(next, auth.access);
      for (const item of page.items || []) {
        const t = item.track;
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
    const status = e.status === 404 ? 404 : 500;
    res.status(status).json({
      error: status === 404 ? "Playlist not found." : "Failed to load playlist.",
      detail: e.message,
      spotifyStatus: e.status || null,
    });
  }
}
