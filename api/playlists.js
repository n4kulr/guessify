import { requireAccess, fetchPlaylistsData } from "./_lib.js";

export default async function handler(req, res) {
  const auth = await requireAccess(req, res);
  if (!auth) return;
  try {
    res.status(200).json(await fetchPlaylistsData(auth.access));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load playlists", detail: e.message });
  }
}
