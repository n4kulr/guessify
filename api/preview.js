import { isCorrect } from "../src/match.js";

// Resolve a 30s MP3 preview via the free iTunes Search API (no key).
// Spotify is only used for the user's library; audio comes from Apple.
export default async function handler(req, res) {
  const title = String(req.query.title || "").trim();
  const artist = String(req.query.artist || "").trim();
  if (!title) {
    res.status(400).json({ error: "title required" });
    return;
  }

  const term = [artist, title].filter(Boolean).join(" ");
  try {
    const url =
      `https://itunes.apple.com/search?term=${encodeURIComponent(term)}` +
      `&media=music&entity=song&limit=8`;
    const r = await fetch(url);
    if (!r.ok) {
      res.status(502).json({ error: "iTunes search failed" });
      return;
    }
    const data = await r.json();
    const pick = pickBest(data.results || [], title, artist);
    if (!pick?.previewUrl) {
      res.status(404).json({ error: "No preview found for this track." });
      return;
    }
    res.status(200).json({
      previewUrl: pick.previewUrl,
      trackName: pick.trackName,
      artistName: pick.artistName,
      artworkUrl: pick.artworkUrl100 || null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Preview lookup failed." });
  }
}

function pickBest(results, title, artist) {
  const withPreview = results.filter((r) => r.previewUrl && r.trackName);
  if (!withPreview.length) return null;

  let best = null;
  let bestScore = -1;
  for (const r of withPreview) {
    let score = 0;
    if (isCorrect(title, r.trackName)) score += 3;
    else if (normalizeLoose(title) && normalizeLoose(r.trackName).includes(normalizeLoose(title)))
      score += 1;
    if (artist && isCorrect(artist, r.artistName || "")) score += 2;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  // Prefer a fuzzy match; otherwise first result with a preview.
  return bestScore > 0 ? best : withPreview[0];
}

function normalizeLoose(s = "") {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
