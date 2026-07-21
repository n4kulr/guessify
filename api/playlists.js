import { requireSession, spotifyGet } from "./_lib.js";

export default async function handler(req, res) {
  const auth = await requireSession(req, res);
  if (!auth) return;
  try {
    const token = auth.access;

    // Who am I? Needed to tell which playlists the user actually owns
    // (only owned playlists' tracks are readable since the Feb 2026 API change).
    const me = await spotifyGet("https://api.spotify.com/v1/me", token);
    const meId = me.id;

    const playlists = [];
    let next = "https://api.spotify.com/v1/me/playlists?limit=50";
    while (next) {
      const page = await spotifyGet(next, token);
      for (const p of page.items || []) {
        if (!p) continue;
        playlists.push({
          id: p.id,
          name: p.name,
          owner: p.owner?.display_name || "",
          owned: p.owner?.id === meId,
          cover: p.images?.[0]?.url || null,
          // Feb 2026 API: playlist object's track-count moved tracks -> items
          total: p.items?.total ?? p.tracks?.total ?? 0,
        });
      }
      next = page.next;
    }

    // Liked Songs summary (always the user's own, so always playable).
    let liked = null;
    try {
      const saved = await spotifyGet("https://api.spotify.com/v1/me/tracks?limit=1", token);
      const first = saved.items?.[0];
      const firstTrack = first?.track || first?.item;
      liked = {
        total: saved.total || 0,
        cover: firstTrack?.album?.images?.[0]?.url || null,
      };
    } catch {
      liked = null;
    }

    res.status(200).json({ playlists, liked });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load playlists", detail: e.message });
  }
}
