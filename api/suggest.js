const LASTFM = "https://ws.audioscrobbler.com/2.0/";
const UA = { "User-Agent": "Guessify/1.0 (https://guessify.uk)" };
const LIMIT = 8;

// Guess-field autocomplete, from the whole Last.fm catalogue — deliberately not
// from the current playlist. Suggesting the playlist's own tracks would hand the
// player the answer list (see f4b44b4, which removed exactly that).
//
// ?q=dan&kind=artist → { items: [{ name }] }
// ?q=dan&kind=track  → { items: [{ name, artist }] }
export default async function handler(req, res) {
  const key = process.env.LASTFM_API_KEY;
  const q = String(req.query.q || "").trim().slice(0, 120);
  const kind = req.query.kind === "track" ? "track" : "artist";

  // Not configured, or nothing worth searching — an empty list is a fine answer
  // here, the guess fields stay perfectly usable without suggestions.
  if (!key || q.length < 2) {
    res.status(200).json({ items: [] });
    return;
  }

  try {
    const items = kind === "track" ? await searchTracks(key, q) : await searchArtists(key, q);
    // Same query from many players in a round; let the edge absorb the repeats.
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json({ items });
  } catch (e) {
    console.error("lastfm suggest", e);
    res.status(200).json({ items: [] });
  }
}

async function lastfm(key, params) {
  const url = `${LASTFM}?${new URLSearchParams({ ...params, api_key: key, format: "json" })}`;
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`lastfm ${r.status}`);
  const data = await r.json();
  if (data?.error) throw new Error(data.message || "lastfm search failed");
  return data;
}

/** Last.fm returns a bare object instead of an array when there's one match. */
function asList(raw) {
  return Array.isArray(raw) ? raw : raw ? [raw] : [];
}

async function searchArtists(key, q) {
  const data = await lastfm(key, { method: "artist.search", artist: q, limit: LIMIT });
  const out = [];
  const seen = new Set();
  for (const a of asList(data?.results?.artistmatches?.artist)) {
    const name = String(a?.name || "").trim().slice(0, 120);
    if (!name) continue;
    const dedupe = name.toLowerCase();
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    out.push({ name });
  }
  return out;
}

async function searchTracks(key, q) {
  const data = await lastfm(key, { method: "track.search", track: q, limit: LIMIT });
  const out = [];
  const seen = new Set();
  for (const t of asList(data?.results?.trackmatches?.track)) {
    const name = String(t?.name || "").trim().slice(0, 160);
    if (!name) continue;
    const artist = String(t?.artist || "").trim().slice(0, 120);
    // Covers and re-releases repeat the same title under different artists;
    // key on both so the list stays varied instead of ten "Dance Monkey"s.
    const dedupe = `${name.toLowerCase()}|${artist.toLowerCase()}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    out.push({ name, artist: artist || null });
  }
  return out;
}
