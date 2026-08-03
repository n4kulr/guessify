const LASTFM = "https://ws.audioscrobbler.com/2.0/";
const UA = { "User-Agent": "Guessify/1.0 (https://guessify.uk)" };

// Charts via Last.fm (metadata only). Audio still comes from iTunes.
//
// ?suggest=drake → tag + artist autocomplete
// ?tag=pop → tag top tracks (fuzzy near-match on miss)
// ?artist=Drake → artist top tracks (fuzzy near-match on miss)
export default async function handler(req, res) {
  const key = process.env.LASTFM_API_KEY;
  if (!key) {
    res.status(503).json({
      error: "Charts aren’t configured yet — add LASTFM_API_KEY on the server.",
    });
    return;
  }

  if ("suggest" in req.query) {
    const suggest = String(req.query.suggest ?? "")
      .trim()
      .slice(0, 64);
    if (suggest.length < 1) {
      res.status(200).json({ tags: [], artists: [] });
      return;
    }
    try {
      const [tags, artists] = await Promise.all([
        searchTags(key, suggest),
        searchArtists(key, suggest),
      ]);
      res.status(200).json({ tags, artists });
    } catch (e) {
      console.error("lastfm suggest", e);
      res.status(500).json({ error: "Failed to suggest charts." });
    }
    return;
  }

  const artist = String(req.query.artist || "").trim().slice(0, 120);
  const tag = String(req.query.tag || "")
    .trim()
    .toLowerCase()
    .slice(0, 64);

  if (!artist && !tag) {
    res.status(400).json({ error: "Enter a tag like pop, 90s, or an artist name." });
    return;
  }

  const limit = Math.min(50, Math.max(10, Number(req.query.limit) || 30));
  const query = artist || tag;

  try {
    const hit = await resolveChart(key, { tag, artist, limit });
    if (!hit) {
      res.status(404).json({
        error: `Couldn't find a chart for “${query}”. Try another pick.`,
      });
      return;
    }

    const { kind, name, tracks, fuzzy } = hit;
    const idKey = kind === "artist" ? `artist-${slug(name)}` : slug(name);

    res.status(200).json({
      id: `lfm-${idKey}`,
      name: kind === "artist" ? `${name} essentials` : formatTagName(name),
      owner: "last.fm",
      cover: tracks.find((t) => t.cover)?.cover || null,
      total: tracks.length,
      playableCount: tracks.length,
      tracks,
      source: "lastfm",
      tag: kind === "tag" ? name : null,
      artist: kind === "artist" ? name : null,
      fuzzy: !!fuzzy,
      query: fuzzy ? query : undefined,
    });
  } catch (e) {
    console.error("lastfm charts", e);
    res.status(500).json({ error: "Failed to load chart tracks." });
  }
}

/**
 * Exact tag/artist first; on miss walk tag.search / artist.search near-matches
 * (and query fragments) until one has enough tracks.
 */
async function resolveChart(apiKey, { tag, artist, limit }) {
  if (artist) {
    const exact = await tryArtist(apiKey, artist, limit);
    if (exact) return exact;
    return fuzzyFromQuery(apiKey, artist, limit, { preferArtists: true });
  }

  const exact = await tryTag(apiKey, tag, limit);
  if (exact) return exact;
  return fuzzyFromQuery(apiKey, tag, limit, { preferArtists: false });
}

async function tryTag(apiKey, tag, limit, fuzzy = false, query) {
  const data = await topTracksForTag(apiKey, tag, limit);
  if (data.error || data.tracks.length < 2) return null;
  return { kind: "tag", name: tag, tracks: data.tracks, fuzzy, query };
}

async function tryArtist(apiKey, artist, limit, fuzzy = false, query) {
  const data = await topTracksForArtist(apiKey, artist, limit);
  if (data.error || data.tracks.length < 2) return null;
  const name =
    String(data.artistName || artist).trim() || artist;
  return { kind: "artist", name, tracks: data.tracks, fuzzy, query };
}

async function fuzzyFromQuery(apiKey, raw, limit, { preferArtists }) {
  const variants = queryVariants(raw);
  for (const q of variants) {
    const [tags, artists] = await Promise.all([
      searchTags(apiKey, q),
      searchArtists(apiKey, q),
    ]);

    const tagTries = tags.slice(0, 6);
    const artistTries = artists.slice(0, 4);
    const order = preferArtists
      ? [
          ...artistTries.map((a) => ({ kind: "artist", name: a.name })),
          ...tagTries.map((t) => ({ kind: "tag", name: t.name })),
        ]
      : [
          ...tagTries.map((t) => ({ kind: "tag", name: t.name })),
          ...artistTries.map((a) => ({ kind: "artist", name: a.name })),
        ];

    const seen = new Set();
    for (const c of order) {
      const key = `${c.kind}:${c.name.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // Skip exact query we already failed.
      if (c.name.toLowerCase() === String(raw).trim().toLowerCase()) continue;

      const hit =
        c.kind === "tag"
          ? await tryTag(apiKey, c.name, limit, true, raw)
          : await tryArtist(apiKey, c.name, limit, true, raw);
      if (hit) return hit;
    }
  }
  return null;
}

/** Full query, then space-separated tokens (for “malayalam 90s”). */
function queryVariants(raw) {
  const q = String(raw || "").trim();
  if (!q) return [];
  const out = [];
  const seen = new Set();
  function push(s) {
    const t = s.trim().toLowerCase();
    if (t.length < 2 || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  }
  push(q);
  for (const part of q.split(/[\s,/|_-]+/)) push(part);
  return out.slice(0, 4);
}

async function topTracksForTag(apiKey, tag, limit) {
  const url =
    `${LASTFM}?method=tag.gettoptracks` +
    `&tag=${encodeURIComponent(tag)}` +
    `&limit=${limit}` +
    `&api_key=${encodeURIComponent(apiKey)}` +
    `&format=json`;
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`lastfm ${r.status}`);
  const data = await r.json();
  if (data?.error) return { error: data.message || "Unknown Last.fm tag." };
  return {
    tracks: normalizeTracks(data?.tracks?.track, `tag-${slug(tag)}`),
  };
}

async function topTracksForArtist(apiKey, artist, limit) {
  const url =
    `${LASTFM}?method=artist.gettoptracks` +
    `&artist=${encodeURIComponent(artist)}` +
    `&limit=${limit}` +
    `&autocorrect=1` +
    `&api_key=${encodeURIComponent(apiKey)}` +
    `&format=json`;
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`lastfm ${r.status}`);
  const data = await r.json();
  if (data?.error) return { error: data.message || "Unknown artist." };
  const artistName =
    String(data?.toptracks?.["@attr"]?.artist || artist).trim() || artist;
  return {
    artistName,
    tracks: normalizeTracks(
      data?.toptracks?.track,
      `artist-${slug(artistName)}`,
      artistName
    ),
  };
}

function normalizeTracks(raw, idPrefix, fallbackArtist = "") {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const tracks = [];
  const seen = new Set();
  for (const t of list) {
    const name = String(t?.name || "").trim();
    const artist = String(
      t?.artist?.name || t?.artist || fallbackArtist || ""
    ).trim();
    if (!name || !artist) continue;
    const dedupe = `${name.toLowerCase()}|${artist.toLowerCase()}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    tracks.push({
      id: `lfm-${idPrefix}-${tracks.length}-${slug(name)}-${slug(artist)}`.slice(0, 120),
      name,
      artists: [artist],
      cover: largestImage(t?.image) || null,
      previewUrl: null,
    });
  }
  return tracks;
}

async function searchTags(apiKey, q) {
  const url =
    `${LASTFM}?method=tag.search` +
    `&tag=${encodeURIComponent(q)}` +
    `&limit=8` +
    `&api_key=${encodeURIComponent(apiKey)}` +
    `&format=json`;
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`lastfm ${r.status}`);
  const data = await r.json();
  if (data?.error) throw new Error(data.message || "tag.search failed");
  const raw = data?.results?.tagmatches?.tag;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const out = [];
  const seen = new Set();
  for (const t of list) {
    const name = String(t?.name || "")
      .trim()
      .toLowerCase()
      .slice(0, 64);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push({ name, count: Number(t?.count) || 0 });
  }
  return out;
}

async function searchArtists(apiKey, q) {
  const url =
    `${LASTFM}?method=artist.search` +
    `&artist=${encodeURIComponent(q)}` +
    `&limit=8` +
    `&api_key=${encodeURIComponent(apiKey)}` +
    `&format=json`;
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`lastfm ${r.status}`);
  const data = await r.json();
  if (data?.error) throw new Error(data.message || "artist.search failed");
  const raw = data?.results?.artistmatches?.artist;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const out = [];
  const seen = new Set();
  for (const a of list) {
    const name = String(a?.name || "").trim().slice(0, 120);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name,
      listeners: Number(a?.listeners) || 0,
    });
  }
  return out;
}

function largestImage(images) {
  if (!Array.isArray(images) || !images.length) return null;
  const order = ["extralarge", "large", "medium", "small", ""];
  for (const size of order) {
    const hit = images.find((img) => (img.size || "") === size && img["#text"]);
    if (hit?.["#text"] && !hit["#text"].includes("2a96cbd8b46e442fc41c2b86b821562f")) {
      return hit["#text"];
    }
  }
  return null;
}

function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "x";
}

function formatTagName(tag) {
  if (/^\d{4}$/.test(tag)) return `${tag} hits`;
  if (/^\d{2}s$/.test(tag)) return `${tag} hits`;
  return tag
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
