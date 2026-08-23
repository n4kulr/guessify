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
        ? await enrichTrackCovers(
            rankTrackSuggestions(raw, q, roundArtists),
            q
          )
        : await enrichArtistCovers(
            rankArtistSuggestions(raw, q, roundArtists),
            q
          );
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

async function searchArtists(key, q) {
  const data = await lastfm(key, {
    method: "artist.search",
    artist: q,
    limit: SUGGEST_FETCH,
  });
  return asList(data?.results?.artistmatches?.artist).map((a) => ({
    name: String(a?.name || "").trim(),
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
  }));
}

/** Last.fm search only returns a stock placeholder — artwork comes from iTunes. */
async function itunesRows(params) {
  const url = `https://itunes.apple.com/search?${new URLSearchParams({
    country: "US",
    ...params,
  })}`;
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) return [];
  const data = await r.json();
  return Array.isArray(data.results) ? data.results : [];
}

function artUrl(url) {
  if (!url) return null;
  return String(url).replace(/100x100bb\.jpg$/, "200x200bb.jpg");
}

function normLoose(s = "") {
  return String(s)
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreTitle(want, got) {
  const a = normLoose(want);
  const b = normLoose(got);
  if (!a || !b) return 0;
  if (a === b) return 10;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (
    shorter.length >= 5 &&
    longer.startsWith(shorter) &&
    longer.length - shorter.length <= 2
  ) {
    return 7;
  }
  return 0;
}

function scoreArtist(want, got) {
  const a = normLoose(want);
  const b = normLoose(got);
  if (!a || !b) return 0;
  if (a === b) return 8;
  if (b.includes(a) || a.includes(b)) {
    if (Math.min(a.length, b.length) >= 4) return 5;
  }
  return 0;
}

function pickTrackArtwork(rows, title, artist) {
  let best = null;
  let bestScore = 0;
  for (const row of rows) {
    if (!row?.artworkUrl100) continue;
    let score = scoreTitle(title, row.trackName);
    if (score <= 0) continue;
    if (artist) {
      const artistScore = scoreArtist(artist, row.artistName || "");
      if (artistScore <= 0) continue;
      score += artistScore;
    }
    if (score > bestScore) {
      bestScore = score;
      best = row.artworkUrl100;
    }
  }
  return artUrl(best);
}

function pickArtistArtwork(rows, name) {
  let best = null;
  let bestScore = 0;
  for (const row of rows) {
    if (!row?.artworkUrl100) continue;
    const score = scoreArtist(name, row.artistName || "");
    if (score > bestScore) {
      bestScore = score;
      best = row.artworkUrl100;
    }
  }
  return artUrl(best);
}

async function enrichTrackCovers(items, q) {
  if (!items.length) return items;
  const rows = await itunesRows({
    term: q,
    media: "music",
    entity: "song",
    limit: "25",
  });
  const out = items.map((item) => ({
    ...item,
    cover: pickTrackArtwork(rows, item.name, item.artist),
  }));
  await Promise.all(
    out
      .filter((item) => !item.cover)
      .map(async (item) => {
        const term = [item.artist, item.name].filter(Boolean).join(" ");
        if (!term) return;
        const extra = await itunesRows({
          term,
          media: "music",
          entity: "song",
          limit: "8",
        });
        item.cover = pickTrackArtwork(extra, item.name, item.artist);
      })
  );
  return out;
}

async function enrichArtistCovers(items, q) {
  if (!items.length) return items;
  const rows = await itunesRows({
    term: q,
    entity: "musicArtist",
    limit: "15",
  });
  return items.map((item) => ({
    ...item,
    cover: pickArtistArtwork(rows, item.name),
  }));
}
