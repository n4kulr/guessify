import {
  rankTrackSuggestions,
  rankArtistSuggestions,
  SUGGEST_FETCH,
} from "../src/suggestRank.js";

const LASTFM = "https://ws.audioscrobbler.com/2.0/";
const UA = { "User-Agent": "Guessify/1.0 (https://guessify.uk)" };

// Guess-field autocomplete from Last.fm — not the playlist (that would spoil answers).
//
// ?q=dan&kind=artist&artists=SZA,Drake
// ?q=dan&kind=track&artists=SZA
export default async function handler(req, res) {
  const key = process.env.LASTFM_API_KEY;
  const q = String(req.query.q || "").trim().slice(0, 120);
  const kind = req.query.kind === "track" ? "track" : "artist";
  const roundArtists = parseArtists(req.query.artists);

  if (!key || q.length < 2) {
    res.status(200).json({ items: [] });
    return;
  }

  try {
    const raw =
      kind === "track"
        ? await searchTracks(key, q)
        : await searchArtists(key, q);
    const items =
      kind === "track"
        ? rankTrackSuggestions(raw, q, roundArtists)
        : rankArtistSuggestions(raw, q, roundArtists);
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json({ items });
  } catch (e) {
    console.error("lastfm suggest", e);
    res.status(200).json({ items: [] });
  }
}

function parseArtists(raw) {
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}

async function lastfm(key, params) {
  const url = `${LASTFM}?${new URLSearchParams({ ...params, api_key: key, format: "json" })}`;
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`lastfm ${r.status}`);
  const data = await r.json();
  if (data?.error) throw new Error(data.message || "lastfm search failed");
  return data;
}

function asList(raw) {
  return Array.isArray(raw) ? raw : raw ? [raw] : [];
}

/** Last.fm's stock placeholder — skip so rows don't all look identical. */
const LASTFM_PLACEHOLDER = "2a96cbd8b46e442fc41c2b86b821562f";

function pickImage(images) {
  const list = Array.isArray(images) ? images : [];
  for (const size of ["medium", "large", "small", "extralarge"]) {
    const row = list.find((i) => i?.size === size);
    const url = String(row?.["#text"] || row?.text || "").trim();
    if (url && !url.includes(LASTFM_PLACEHOLDER)) return url;
  }
  return null;
}

async function searchArtists(key, q) {
  const data = await lastfm(key, {
    method: "artist.search",
    artist: q,
    limit: SUGGEST_FETCH,
  });
  return asList(data?.results?.artistmatches?.artist).map((a) => ({
    name: String(a?.name || "").trim(),
    cover: pickImage(a?.image),
  }));
}

async function searchTracks(key, q) {
  const data = await lastfm(key, {
    method: "track.search",
    track: q,
    limit: SUGGEST_FETCH,
  });
  return asList(data?.results?.trackmatches?.track).map((t) => ({
    name: String(t?.name || "").trim(),
    artist: String(t?.artist || "").trim(),
    cover: pickImage(t?.image),
  }));
}
