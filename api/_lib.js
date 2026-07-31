import crypto from "node:crypto";

// Files/exports starting with "_" are NOT treated as routes by Vercel;
// this module is shared helper code imported by the route handlers.

const SECRET = process.env.SESSION_SECRET || "dev-insecure-secret-change-me";

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
  return crypto.createHash("sha256").update(SECRET).digest(); // 32 bytes
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
export function getBase(req) {
  // Prefer a fixed public URL so OAuth redirect_uri + cookies stay on one host
  // (preview/custom domains otherwise break state cookies → login loops).
  const configured = (process.env.APP_BASE_URL || "").replace(/\/$/, "");
  if (configured) return configured;

  const proto = String(req.headers["x-forwarded-proto"] || "https")
    .split(",")[0]
    .trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0]
    .trim();
  return `${proto}://${host}`;
}

export function redirect(res, url) {
  res.setHeader("Location", url);
  res.status(302).end();
}

function cookie(name, value, { maxAge } = {}) {
  const parts = [`${name}=${value}`, "Path=/", "HttpOnly", "SameSite=Lax", "Secure"];
  if (maxAge != null) parts.push(`Max-Age=${maxAge}`);
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
export async function fetchPlaylistsData(token) {
  const me = await spotifyGet("https://api.spotify.com/v1/me", token);
  const meId = me.id;

  const playlists = [];
  let next = "https://api.spotify.com/v1/me/playlists?limit=50";
  while (next) {
    const page = await spotifyGet(next, token);
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
    next = page.next;
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
  const tracks = [];
  let next =
    `https://api.spotify.com/v1/playlists/${id}/items` +
    `?fields=next,items(item(id,name,preview_url,artists(name),album(images)))&limit=100`;

  while (next) {
    const page = await spotifyGet(next, token);
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
    next = page.next;
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
