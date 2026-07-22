import { requireSession } from "./_lib.js";

const LASTFM = "https://ws.audioscrobbler.com/2.0/";

// Tag → top tracks via Last.fm (metadata only). Audio still comes from iTunes.
export default async function handler(req, res) {
  const auth = await requireSession(req, res);
  if (!auth) return;

  const key = process.env.LASTFM_API_KEY;
  if (!key) {
    res.status(503).json({
      error: "Charts aren’t configured yet — add LASTFM_API_KEY on the server.",
    });
    return;
  }

  const tag = String(req.query.tag || "")
    .trim()
    .toLowerCase()
    .slice(0, 64);
  if (!tag) {
    res.status(400).json({ error: "Enter a tag like pop, 90s, or 1995." });
    return;
  }

  const limit = Math.min(50, Math.max(10, Number(req.query.limit) || 30));

  try {
    const url =
      `${LASTFM}?method=tag.gettoptracks` +
      `&tag=${encodeURIComponent(tag)}` +
      `&limit=${limit}` +
      `&api_key=${encodeURIComponent(key)}` +
      `&format=json`;

    const r = await fetch(url, {
      headers: { "User-Agent": "Guessify/1.0 (https://guessify-black.vercel.app)" },
    });
    if (!r.ok) {
      res.status(502).json({ error: "Last.fm request failed." });
      return;
    }
    const data = await r.json();
    if (data?.error) {
      res.status(400).json({ error: data.message || "Unknown Last.fm tag." });
      return;
    }

    const raw = data?.tracks?.track;
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const tracks = [];
    const seen = new Set();

    for (const t of list) {
      const name = String(t?.name || "").trim();
      const artist = String(t?.artist?.name || t?.artist || "").trim();
      if (!name || !artist) continue;
      const dedupe = `${name.toLowerCase()}|${artist.toLowerCase()}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);

      tracks.push({
        id: `lfm-${slug(tag)}-${tracks.length}-${slug(name)}-${slug(artist)}`.slice(0, 120),
        name,
        artists: [artist],
        cover: largestImage(t?.image) || null,
        previewUrl: null,
      });
    }

    if (tracks.length < 2) {
      res.status(404).json({
        error: `Not enough tracks for “${tag}”. Try another tag.`,
      });
      return;
    }

    const display = formatTagName(tag);
    res.status(200).json({
      id: `lfm-${slug(tag)}`,
      name: display,
      owner: "last.fm",
      cover: tracks.find((t) => t.cover)?.cover || null,
      total: tracks.length,
      playableCount: tracks.length,
      tracks,
      source: "lastfm",
      tag,
    });
  } catch (e) {
    console.error("lastfm charts", e);
    res.status(500).json({ error: "Failed to load chart tracks." });
  }
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
  // "90s" / "1995" / "hip-hop" → nicer playlist title
  if (/^\d{4}$/.test(tag)) return `${tag} hits`;
  if (/^\d{2}s$/.test(tag)) return `${tag} hits`;
  return tag
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
