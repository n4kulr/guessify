/** Same-origin cover proxy so share canvases can draw art without tainting. */

const MAX_BYTES = 2_000_000;
const FETCH_MS = 8_000;

function allowedHost(host) {
  return (
    host.endsWith(".mzstatic.com") ||
    host.endsWith(".scdn.co") ||
    host.endsWith(".spotifycdn.com") ||
    host === "lastfm.freetls.fastly.net"
  );
}

function bumpItunes(url) {
  return url.replace(/\/\d+x\d+bb/i, "/600x600bb");
}

export default async function handler(req, res) {
  let parsed;
  try {
    parsed = new URL(String(req.query.u || ""));
  } catch {
    res.status(400).end();
    return;
  }
  if (parsed.protocol !== "https:" || !allowedHost(parsed.hostname)) {
    res.status(400).end();
    return;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const r = await fetch(bumpItunes(parsed.toString()), {
      signal: ctrl.signal,
      headers: { Accept: "image/*" },
    });
    if (!r.ok) {
      res.status(r.status).end();
      return;
    }
    const ct = r.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) {
      res.status(400).end();
      return;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length || buf.length > MAX_BYTES) {
      res.status(400).end();
      return;
    }
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    res.send(buf);
  } catch {
    res.status(502).end();
  } finally {
    clearTimeout(timer);
  }
}
