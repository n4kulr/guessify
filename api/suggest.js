import {
  rankTrackSuggestions,
  rankArtistSuggestions,
  SUGGEST_FETCH,
} from "../src/suggestRank.js";
import { enrichArtistCovers, enrichTrackCovers } from "./_suggestArt.js";

const LASTFM = "https://ws.audioscrobbler.com/2.0/";
const UA = { "User-Agent": "Guessify/1.0 (https://guessify.uk)" };

// Guess-field autocomplete from Last.fm — not the playlist (that would spoil answers).
//
// GET  ?q=dan&kind=artist&artists=SZA,Drake  → text matches (fast)
// POST { kind, q, items }                    → same rows + iTunes cover art
export default async function handler(req, res) {
  if (req.method === "POST") return handleCovers(req, res);
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "GET or POST only" });
    return;
  }
  return handleSearch(req, res);
}

async function handleSearch(req, res) {
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

async function handleCovers(req, res) {
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
    console.error("suggest covers", e);
    res.status(200).json({ items });
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

async function searchArtists(key, q) {
  const data = await lastfm(key, {
    method: "artist.search",
    artist: q,
    limit: SUGGEST_FETCH,
  });
  return asList(data?.results?.artistmatches?.artist).map((a) => ({
    name: String(a?.name || "").trim(),
    listeners: a?.listeners,
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
    listeners: t?.listeners,
  }));
}
