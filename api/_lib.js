import crypto from "node:crypto";

// Files/exports starting with "_" are NOT treated as routes by Vercel;
// this module is shared helper code imported by the route handlers.

function secret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const prod =
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production";
  if (prod) throw new Error("SESSION_SECRET is required in production");
  return "dev-insecure-secret-change-me";
}

// Library + profile only. Audio previews come from the free iTunes Search API
// (no Premium / Web Playback scopes needed).
export const SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-library-read",
  "user-read-email",
  "user-read-private",
].join(" ");

function key() {
  return crypto.createHash("sha256").update(secret()).digest(); // 32 bytes
}

// --- encrypted cookie sessions (stateless, works on serverless) ---
export function encrypt(obj) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(obj), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, data]).toString("base64url");
}

export function decrypt(str) {
  try {
    const buf = Buffer.from(str, "base64url");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    const out = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(out.toString("utf8"));
  } catch {
    return null;
  }
}

// --- request/response helpers ---

/** Apex hostname from APP_BASE_URL, or null (localhost / unset). */
export function configuredCookieDomain() {
  const configured = (process.env.APP_BASE_URL || "").replace(/\/$/, "");
  if (!configured) return null;
  try {
    const host = new URL(configured).hostname.replace(/^www\./, "");
    if (!host || host === "localhost" || host.endsWith(".localhost")) return null;
    return host;
  } catch {
    return null;
  }
}

/**
 * Public origin for OAuth redirect_uri + post-login redirects.
 * Prefer APP_BASE_URL apex so Spotify always sees one registered URI.
 * Localhost keeps the request host so local cookies match.
 */
export function getBase(req) {
  const configured = (process.env.APP_BASE_URL || "").replace(/\/$/, "");
  const proto = String(req.headers["x-forwarded-proto"] || "https")
    .split(",")[0]
    .trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0]
    .trim();
  const requestBase = host ? `${proto}://${host}` : configured || "";

  const isLocal =
    host === "localhost" ||
    host.startsWith("localhost:") ||
    host.endsWith(".localhost");

  if (isLocal) return requestBase;

  if (configured) {
    try {
      const u = new URL(configured);
      u.hostname = u.hostname.replace(/^www\./, "");
      return u.origin;
    } catch {
      return configured;
    }
  }
  return requestBase;
}

/** True when the browser host is not the OAuth apex (e.g. vercel.app preview). */
export function oauthNeedsApexBounce(req) {
  const apex = getBase(req);
  if (!apex || !process.env.APP_BASE_URL) return false;
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0]
    .trim()
    .replace(/:\d+$/, "");
  if (
    !host ||
    host === "localhost" ||
    host.startsWith("localhost:") ||
    host.endsWith(".localhost")
  ) {
    return false;
  }
  try {
    return host.replace(/^www\./, "") !== new URL(apex).hostname;
  } catch {
    return false;
  }
}

export function redirect(res, url) {
  res.setHeader("Location", url);
  res.status(302).end();
}

function cookie(name, value, { maxAge } = {}) {
  const parts = [`${name}=${value}`, "Path=/", "HttpOnly", "SameSite=Lax", "Secure"];
  if (maxAge != null) parts.push(`Max-Age=${maxAge}`);
  // Share gs_state / session across apex + www (Spotify callback uses APP_BASE_URL apex).
  const domain = configuredCookieDomain();
  if (domain) parts.push(`Domain=.${domain}`);
  return parts.join("; ");
}

export function appendCookie(res, str) {
  if (typeof res.appendHeader === "function") {
    res.appendHeader("Set-Cookie", str);
    return;
  }
  const prev = res.getHeader("Set-Cookie");
  const arr = prev ? (Array.isArray(prev) ? prev : [prev]) : [];
  arr.push(str);
  res.setHeader("Set-Cookie", arr);
}

export function setStateCookie(res, state) {
  appendCookie(res, cookie("gs_state", state, { maxAge: 600 }));
}
export function clearStateCookie(res) {
  appendCookie(res, cookie("gs_state", "", { maxAge: 0 }));
}
export function writeSession(res, session) {
  appendCookie(res, cookie("gs", encrypt(session), { maxAge: 60 * 60 * 24 * 7 }));
}
export function clearSession(res) {
  appendCookie(res, cookie("gs", "", { maxAge: 0 }));
}

/** Prefer req.cookies; fall back to parsing Cookie header (safer across runtimes). */
export function getCookies(req) {
  if (req.cookies && typeof req.cookies === "object") return req.cookies;
  const raw = req.headers?.cookie;
  if (!raw || typeof raw !== "string") return {};
  const out = {};
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

export function readSession(req) {
  const c = getCookies(req).gs;
  return c ? decrypt(c) : null;
}

// --- Spotify ---
export async function tokenRequest(params) {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  const creds = Buffer.from(`${id}:${secret}`).toString("base64");
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });
  if (!r.ok) throw new Error(`token ${r.status}: ${await r.text()}`);
  return r.json();
}

export async function spotifyGet(url, token) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) {
    const body = await r.text();
    const e = new Error(`spotify ${r.status} @ ${url} :: ${body}`);
    e.status = r.status;
    e.body = body;
    throw e;
  }
  return r.json();
}

/**
 * Map known Spotify failures to a client-facing message.
 * @returns {{ status: number, error: string } | null}
 */
export function spotifyClientError(e) {
  const body = String(e?.body || e?.message || "");
  if (/not registered for this application/i.test(body)) {
    return {
      status: 403,
      error:
        "This Spotify account isn’t on Guessify’s allowlist. Add its email under Spotify Developer Dashboard → User Management, then log in again.",
    };
  }
  return null;
}

// Return a valid access token, refreshing (and re-writing the cookie) if needed.
export async function ensureAccess(session, res) {
  if (Date.now() < session.expiresAt - 5000) return session.access;
  const data = await tokenRequest({
    grant_type: "refresh_token",
    refresh_token: session.refresh,
  });
  session.access = data.access_token;
  session.expiresAt = Date.now() + data.expires_in * 1000;
  if (data.refresh_token) session.refresh = data.refresh_token;
  writeSession(res, session);
  return session.access;
}

// Guard for protected routes. Returns { access } or null (after sending 401).
export async function requireSession(req, res) {
  const session = readSession(req);
  if (!session) {
    res.status(401).json({ error: "Not logged in" });
    return null;
  }
  try {
    const access = await ensureAccess(session, res);
    return { session, access };
  } catch {
    clearSession(res);
    res.status(401).json({ error: "Session expired, log in again." });
    return null;
  }
}

// --- shared/public playlists: the site owner's library, readable without login ---
// One-time setup: visit /api/login?owner=1, log in as the owner, and the
// callback prints a refresh token to paste into OWNER_REFRESH_TOKEN.
let ownerTokenCache = null; // { access, expiresAt } — reused across warm invocations

export async function ownerAccess() {
  const refresh = process.env.OWNER_REFRESH_TOKEN;
  if (!refresh) return null;
  if (ownerTokenCache && Date.now() < ownerTokenCache.expiresAt - 5000) {
    return ownerTokenCache.access;
  }
  const data = await tokenRequest({ grant_type: "refresh_token", refresh_token: refresh });
  ownerTokenCache = { access: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return ownerTokenCache.access;
}

// Guard for library routes: your session if logged in, else the owner's
// shared library, so the same route serves both cases (keeps the Vercel
// Hobby-plan function count down — no separate /api/shared/* routes).
// Returns { access } or null (after sending an error).
export async function requireAccess(req, res) {
  const session = readSession(req);
  if (session) {
    try {
      return { access: await ensureAccess(session, res) };
    } catch {
      clearSession(res);
      res.status(401).json({ error: "Session expired, log in again." });
      return null;
    }
  }
  try {
    const access = await ownerAccess();
    if (access) return { access };
  } catch (e) {
    console.error(e);
  }
  res.status(503).json({ error: "Log in with Spotify to load playlists." });
  return null;
}

export function setLinkOwnerCookie(res) {
  appendCookie(res, cookie("gs_link_owner", "1", { maxAge: 600 }));
}
export function clearLinkOwnerCookie(res) {
  appendCookie(res, cookie("gs_link_owner", "", { maxAge: 0 }));
}

// --- fetch helpers shared by /api and /api/shared routes (session token vs owner token) ---

/**
 * Build the next /me/playlists offset. Do not follow Spotify's `page.next` —
 * since Feb 2026 it often points at removed GET /users/{id}/playlists (403).
 * @returns {number | null} next offset, or null when done
 */
export function nextMePlaylistsOffset(page, limit = 50) {
  if (!page) return null;
  const offset = Number(page.offset) || 0;
  const total = Number(page.total) || 0;
  const step = Number(page.limit) || limit;
  const next = offset + step;
  if (next >= total) return null;
  if (!(page.items || []).length) return null;
  return next;
}

export async function fetchPlaylistsData(token) {
  const me = await spotifyGet("https://api.spotify.com/v1/me", token);
  const meId = me.id;

  const playlists = [];
  const limit = 50;
  // ponytail: cap pages — 1000 playlists is enough for the shelf; raise if needed
  const MAX_PAGES = 20;
  let offset = 0;
  let pages = 0;

  while (pages < MAX_PAGES) {
    const page = await spotifyGet(
      `https://api.spotify.com/v1/me/playlists?limit=${limit}&offset=${offset}`,
      token
    );
    pages += 1;
    for (const p of page.items || []) {
      if (!p) continue;
      playlists.push({
        id: p.id,
        name: p.name,
        owner: p.owner?.display_name || "",
        owned: p.owner?.id === meId,
        cover: p.images?.[0]?.url || null,
        // Feb 2026 API: playlist object's track-count moved tracks -> items
        total: p.items?.total ?? p.tracks?.total ?? 0,
      });
    }
    const next = nextMePlaylistsOffset(page, limit);
    if (next == null) break;
    offset = next;
  }

  let liked = null;
  try {
    const saved = await spotifyGet("https://api.spotify.com/v1/me/tracks?limit=1", token);
    const first = saved.items?.[0];
    const firstTrack = first?.track || first?.item;
    liked = {
      total: saved.total || 0,
      cover: firstTrack?.album?.images?.[0]?.url || null,
    };
  } catch {
    liked = null;
  }

  return { playlists, liked };
}

export async function fetchLikedTracks(token) {
  // Cap pages so huge libraries don't blow the serverless timeout —
  // 200 tracks is plenty for a 5-round game.
  const MAX_PAGES = 4;
  const tracks = [];
  let next = "https://api.spotify.com/v1/me/tracks?limit=50";
  let pages = 0;

  while (next && pages < MAX_PAGES) {
    const page = await spotifyGet(next, token);
    pages += 1;
    for (const entry of page.items || []) {
      const t = entry.track || entry.item; // Feb 2026 rename tolerance
      if (!t?.id) continue; // skip local files / unavailable
      tracks.push({
        id: t.id,
        name: t.name,
        artists: (t.artists || []).map((a) => a.name),
        previewUrl: t.preview_url,
        cover: t.album?.images?.[0]?.url || null,
      });
    }
    next = page.next;
  }

  return {
    id: "liked",
    name: "Liked Songs",
    owner: "you",
    cover: tracks[0]?.cover || null,
    total: tracks.length,
    playableCount: tracks.length,
    tracks,
  };
}

export async function fetchPlaylistTracks(id, token) {
  const meta = await spotifyGet(
    `https://api.spotify.com/v1/playlists/${id}?fields=name,images,owner(display_name)`,
    token
  );

  // Feb 2026 API migration: GET /playlists/{id}/tracks was removed in favour
  // of /items, and each entry's `track` field was renamed to `item`.
  // Limit max is 50 — do not follow page.next if it ever drifts off /items;
  // paginate with offset instead (same class of Spotify bug as /me/playlists).
  const tracks = [];
  const limit = 50;
  let offset = 0;
  let pages = 0;
  const MAX_PAGES = 10; // 500 tracks — enough for a game

  while (pages < MAX_PAGES) {
    const page = await spotifyGet(
      `https://api.spotify.com/v1/playlists/${id}/items` +
        `?fields=total,offset,limit,items(item(id,name,preview_url,artists(name),album(images)))` +
        `&limit=${limit}&offset=${offset}`,
      token
    );
    pages += 1;
    for (const entry of page.items || []) {
      const t = entry.item;
      if (!t) continue;
      tracks.push({
        id: t.id,
        name: t.name,
        artists: (t.artists || []).map((a) => a.name),
        previewUrl: t.preview_url,
        cover: t.album?.images?.[0]?.url || null,
      });
    }
    const total = Number(page.total) || 0;
    offset += limit;
    if (offset >= total || !(page.items || []).length) break;
  }

  return {
    id,
    name: meta.name,
    owner: meta.owner?.display_name || "",
    cover: meta.images?.[0]?.url || null,
    total: tracks.length,
    playableCount: tracks.length,
    tracks,
  };
}

// Client-credentials token for catalog endpoints (albums). Cached per warm lambda.
let ccTokenCache = null; // { access, expiresAt }

export async function clientCredentialsAccess() {
  if (ccTokenCache && Date.now() < ccTokenCache.expiresAt - 5000) {
    return ccTokenCache.access;
  }
  const data = await tokenRequest({ grant_type: "client_credentials" });
  ccTokenCache = {
    access: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return ccTokenCache.access;
}

/** Album → same shape as fetchPlaylistTracks. Works without user login. */
export async function fetchAlbumAsPlaylist(id, token, market = "US") {
  const meta = await spotifyGet(
    `https://api.spotify.com/v1/albums/${id}?market=${encodeURIComponent(market)}`,
    token
  );
  const cover = meta.images?.[0]?.url || null;
  const tracks = [];
  let next =
    `https://api.spotify.com/v1/albums/${id}/tracks` +
    `?limit=50&market=${encodeURIComponent(market)}`;

  while (next) {
    const page = await spotifyGet(next, token);
    for (const t of page.items || []) {
      if (!t?.id) continue;
      tracks.push({
        id: t.id,
        name: t.name,
        artists: (t.artists || []).map((a) => a.name),
        previewUrl: t.preview_url,
        cover,
      });
    }
    next = page.next;
  }

  return {
    id,
    name: meta.name,
    owner: (meta.artists || []).map((a) => a.name).join(", "),
    cover,
    total: tracks.length,
    playableCount: tracks.length,
    tracks,
    kind: "album",
  };
}

// --- public playlist fallback: Spotify's embed page ---
// Since Feb 2026 the API only reads playlists the token's account owns or
// collaborates on. The public embed page still ships the track list as JSON.
// ponytail: scraped, undocumented page, capped at 100 tracks, and may break
// whenever Spotify changes it. Drop this if the app ever gets extended quota.

/** Parse an open.spotify.com/embed/playlist page into fetchPlaylistTracks' shape, or null. */
export function parseEmbedPlaylist(html, id) {
  const m = String(html || "").match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]+?)<\/script>/
  );
  if (!m) return null;
  let entity;
  try {
    entity = JSON.parse(m[1])?.props?.pageProps?.state?.data?.entity;
  } catch {
    return null;
  }
  if (!entity || !Array.isArray(entity.trackList)) return null;
  const tracks = entity.trackList
    .filter((t) => t?.title && /^spotify:track:/.test(t.uri || ""))
    .map((t) => ({
      id: t.uri.slice("spotify:track:".length),
      name: t.title,
      artists: String(t.subtitle || "")
        .split(/,\s*/)
        .map((a) => a.trim())
        .filter(Boolean),
      // Spotify's own clips run ~16s, shorter than a full unlock — let
      // /api/preview find the usual 30s one instead.
      previewUrl: null,
      cover: null,
    }));
  if (!tracks.length) return null;
  return {
    id,
    name: entity.name || entity.title || "playlist",
    owner: entity.authors?.[0]?.name || entity.subtitle || "",
    cover: entity.coverArt?.sources?.[0]?.url || null,
    total: tracks.length,
    playableCount: tracks.length,
    tracks,
  };
}

export async function fetchPlaylistFromEmbed(id) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(`https://open.spotify.com/embed/playlist/${id}`, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Guessify/1.0)" },
    });
    if (!r.ok) return null;
    return parseEmbedPlaylist(await r.text(), id);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
