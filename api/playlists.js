import { requireSession, spotifyGet } from "./_lib.js";

export default async function handler(req, res) {
  const auth = await requireSession(req, res);
  if (!auth) return;
  try {
    const playlists = [];
    let next = "https://api.spotify.com/v1/me/playlists?limit=50";
    while (next) {
      const page = await spotifyGet(next, auth.access);
      for (const p of page.items || []) {
        if (!p) continue;
        playlists.push({
          id: p.id,
          name: p.name,
          owner: p.owner?.display_name || "",
          cover: p.images?.[0]?.url || null,
          total: p.tracks?.total || 0,
        });
      }
      next = page.next;
    }
    res.status(200).json({ playlists });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load playlists" });
  }
}
