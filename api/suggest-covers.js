import { enrichArtistCovers, enrichTrackCovers } from "./suggestArt.js";

// POST { kind, q, items: [{ name, artist? }] } → same rows with cover URLs filled in.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "POST only" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: "Invalid JSON" });
      return;
    }
  }

  const kind = body?.kind === "track" ? "track" : "artist";
  const q = String(body?.q || "").trim().slice(0, 120);
  const items = (Array.isArray(body?.items) ? body.items : [])
    .slice(0, 6)
    .map((row) => ({
      name: String(row?.name || "").trim(),
      artist: row?.artist ? String(row.artist).trim() : null,
    }))
    .filter((row) => row.name);

  if (!items.length || q.length < 2) {
    res.status(200).json({ items: [] });
    return;
  }

  try {
    const enriched =
      kind === "track"
        ? await enrichTrackCovers(items, q)
        : await enrichArtistCovers(items, q);
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=86400, stale-while-revalidate=604800"
    );
    res.status(200).json({ items: enriched });
  } catch (e) {
    console.error("suggest-covers", e);
    res.status(200).json({ items });
  }
}
