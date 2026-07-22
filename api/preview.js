// Resolve a 30s preview via the free iTunes Search API (no key).
// Spotify is only used for the user's library; audio comes from Apple.
// Keep this self-contained — Vercel serverless shouldn't import from src/.

export default async function handler(req, res) {
  const title = String(req.query.title || "").trim();
  const artist = String(req.query.artist || "").trim();
  if (!title) {
    res.status(400).json({ error: "title required" });
    return;
  }

  try {
    const pick = await findPreview(title, artist);
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
    console.error("preview lookup failed", e);
    res.status(500).json({ error: "Preview lookup failed." });
  }
}

async function findPreview(title, artist) {
  const cleanTitle = cleanForSearch(title);
  const cleanArtist = cleanForSearch(artist);
  const queries = [
    [cleanArtist, cleanTitle].filter(Boolean).join(" "),
    cleanTitle,
    // Original strings as a last resort (sometimes cleaning hurts).
    [artist, title].filter(Boolean).join(" ").trim(),
  ].filter((q, i, arr) => q && arr.indexOf(q) === i);

  for (const term of queries) {
    const results = await itunesSearch(term);
    const pick = pickBest(results, cleanTitle || title, cleanArtist || artist);
    if (pick?.previewUrl) return pick;
  }
  return null;
}

async function itunesSearch(term) {
  const url =
    `https://itunes.apple.com/search?term=${encodeURIComponent(term)}` +
    `&media=music&entity=song&limit=12&country=US`;
  const r = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!r.ok) return [];
  const data = await r.json();
  return Array.isArray(data.results) ? data.results : [];
}

function pickBest(results, title, artist) {
  const withPreview = results.filter((r) => r.previewUrl && r.trackName);
  if (!withPreview.length) return null;

  let best = null;
  let bestScore = -1;
  for (const r of withPreview) {
    let score = 0;
    if (fuzzyMatch(title, r.trackName)) score += 3;
    else if (includesLoose(r.trackName, title) || includesLoose(title, r.trackName)) score += 1;
    if (artist && fuzzyMatch(artist, r.artistName || "")) score += 2;
    else if (artist && includesLoose(r.artistName || "", artist)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return bestScore > 0 ? best : withPreview[0];
}

function cleanForSearch(str = "") {
  return String(str)
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/-\s*(remaster(?:ed)?(?:\s+\d{4})?|remix|live|radio edit|mono|stereo|bonus track).*$/i, " ")
    .replace(/feat\.?|ft\.?/gi, " ")
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLoose(s = "") {
  return String(s)
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesLoose(hay, needle) {
  const h = normalizeLoose(hay);
  const n = normalizeLoose(needle);
  return n.length >= 3 && h.includes(n);
}

function fuzzyMatch(guess, answer) {
  const g = normalizeLoose(guess);
  const t = normalizeLoose(answer);
  if (!g || !t) return false;
  if (g === t) return true;
  if (g.length >= 4 && (t.includes(g) || g.includes(t))) return true;
  const tolerance = Math.max(2, Math.floor(t.length * 0.25));
  return editDistance(g, t) <= tolerance;
}

function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}
