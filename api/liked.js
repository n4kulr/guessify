import { requireSession, spotifyGet } from "./_lib.js";

// The user's "Liked Songs" — always theirs, so always playable. Returns the
// same shape as /api/playlist/[id] so the game can consume it identically.
export default async function handler(req, res) {
  const auth = await requireSession(req, res);
  if (!auth) return;
  try {
    const token = auth.access;
    // Cap pages so huge libraries don't blow the serverless timeout —
    // 200 tracks is plenty for a 5-round game.
    const MAX_PAGES = 4;
    const tracks = [];
    let next = "https://api.spotify.com/v1/me/tracks?limit=50";
    let pages = 0;

    while (next && pages < MAX_PAGES) {
      const page = await spotifyGet(next, token);
      pages += 1;
      for (const entry of page.items || []) {
        const t = entry.track || entry.item; // Feb 2026 rename tolerance
        if (!t?.id) continue; // skip local files / unavailable
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

    res.status(200).json({
      id: "liked",
      name: "Liked Songs",
      owner: "you",
      cover: tracks[0]?.cover || null,
      total: tracks.length,
      playableCount: tracks.length,
      tracks,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load your Liked Songs." });
  }
}
