/**
 * Cloudflare-safe preview lookup for party rooms.
 * iTunes first, Deezer if Apple has no clip. Mirrors api/preview.js.
 */

export async function resolveItunesPreview(title, artist = "") {
  const cleanTitle = cleanForSearch(title);
  const cleanArtist = cleanForSearch(artist);
  const wantTitle = cleanTitle || title;
  const wantArtist = cleanArtist || artist;
  const queries = [
    [cleanArtist, cleanTitle].filter(Boolean).join(" "),
    // Only search title alone when we have no artist — otherwise wrong covers win.
    cleanArtist ? null : cleanTitle,
    [artist, title].filter(Boolean).join(" ").trim(),
  ].filter((q, i, arr) => q && arr.indexOf(q) === i);

  for (const term of queries) {
    const results = await itunesSearch(term);
    const pick = pickBest(results, wantTitle, wantArtist);
    if (pick?.previewUrl) {
      return {
        previewUrl: pick.previewUrl,
        artworkUrl: pick.artworkUrl100 || null,
      };
    }
  }

  for (const term of queries) {
    const results = await deezerSearch(term);
    const pick = pickBest(results, wantTitle, wantArtist);
    if (pick?.previewUrl) {
      return {
        previewUrl: pick.previewUrl,
        artworkUrl: pick.artworkUrl100 || null,
      };
    }
  }
  return null;
}

async function itunesSearch(term) {
  const url =
    `https://itunes.apple.com/search?term=${encodeURIComponent(term)}` +
    `&media=music&entity=song&limit=25&country=US`;
  const r = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!r.ok) return [];
  const data = await r.json();
  return Array.isArray(data.results) ? data.results : [];
}

async function deezerSearch(term) {
  const url = `https://api.deezer.com/search?q=${encodeURIComponent(term)}&limit=25`;
  const r = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!r.ok) return [];
  const data = await r.json();
  const rows = Array.isArray(data.data) ? data.data : [];
  return rows
    .filter((t) => t?.preview && t?.title)
    .map((t) => ({
      previewUrl: t.preview,
      trackName: t.title,
      artistName: t.artist?.name || "",
      artworkUrl100: t.album?.cover_medium || t.album?.cover || null,
    }));
}

function pickBest(results, title, artist) {
  const withPreview = results.filter((r) => r.previewUrl && r.trackName);
  if (!withPreview.length) return null;

  let best = null;
  let bestScore = 0;
  for (const r of withPreview) {
    const titleScore = scoreTitle(title, r.trackName);
    if (titleScore <= 0) continue;

    let score = titleScore;
    if (artist) {
      const artistScore = scoreArtist(artist, r.artistName || "");
      // Artist known → require a real artist match (stops random same-title covers).
      if (artistScore <= 0) continue;
      score += artistScore;
    }

    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  // Never fall back to results[0] — that caused many wrong previews.
  return best;
}

function scoreTitle(want, got) {
  const a = normalizeLoose(want);
  const b = normalizeLoose(got);
  if (!a || !b) return 0;
  if (a === b) return 10;

  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  // "Love" must not match "Love Story"; allow only near-prefix extras.
  if (
    shorter.length >= 5 &&
    longer.startsWith(shorter) &&
    longer.length - shorter.length <= 2
  ) {
    return 7;
  }
  if (
    shorter.length >= 6 &&
    longer.includes(shorter) &&
    longer.length <= Math.ceil(shorter.length * 1.35)
  ) {
    return 5;
  }

  const tolerance = Math.max(1, Math.floor(Math.min(a.length, b.length) * 0.12));
  if (a.length >= 5 && b.length >= 5 && editDistance(a, b) <= tolerance) return 6;
  return 0;
}

function scoreArtist(want, got) {
  const a = normalizeLoose(want);
  const b = normalizeLoose(got);
  if (!a || !b) return 0;
  if (a === b) return 8;
  if (b.includes(a) || a.includes(b)) {
    if (Math.min(a.length, b.length) >= 4) return 5;
  }
  const tokens = b.split(/\s+/).filter(Boolean);
  if (
    a.length >= 4 &&
    tokens.some((t) => t === a || (t.length >= 4 && (t.includes(a) || a.includes(t))))
  ) {
    return 4;
  }
  const tolerance = Math.max(1, Math.floor(Math.min(a.length, b.length) * 0.15));
  if (a.length >= 4 && b.length >= 4 && editDistance(a, b) <= tolerance) return 4;
  return 0;
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
