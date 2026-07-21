import crypto from "node:crypto";

// Files/exports starting with "_" are NOT treated as routes by Vercel;
// this module is shared helper code imported by the route handlers.

const SECRET = process.env.SESSION_SECRET || "dev-insecure-secret-change-me";

export const SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-library-read",
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
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0];
  const host = req.headers["x-forwarded-host"] || req.headers.host;
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
export function readSession(req) {
  const c = req.cookies?.gs;
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
    const e = new Error(`spotify ${r.status}`);
    e.status = r.status;
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
