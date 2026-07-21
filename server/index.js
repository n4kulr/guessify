import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import crypto from "node:crypto";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://127.0.0.1:5173",
    credentials: true,
  })
);

const PORT = process.env.PORT || 8888;
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || "http://127.0.0.1:8888/api/callback";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://127.0.0.1:5173";

const SCOPES = ["playlist-read-private", "playlist-read-collaborative", "user-library-read"].join(
  " "
);

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.warn(
    "\n[!] Missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET.\n" +
      "    Copy server/.env.example to server/.env and fill them in.\n"
  );
}

// --- In-memory session store: sessionId -> { access, refresh, expiresAt } ---
const sessions = new Map();
// state param (CSRF) store: state -> timestamp
const pendingStates = new Map();

function makeId() {
  return crypto.randomBytes(24).toString("hex");
}

async function spotifyTokenRequest(params) {
  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });
  if (!res.ok) {
    throw new Error(`Token request failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

// Return a valid access token for a session, refreshing if needed.
async function getValidAccess(session) {
  if (Date.now() < session.expiresAt - 5000) return session.access;
  const data = await spotifyTokenRequest({
    grant_type: "refresh_token",
    refresh_token: session.refresh,
  });
  session.access = data.access_token;
  session.expiresAt = Date.now() + data.expires_in * 1000;
  if (data.refresh_token) session.refresh = data.refresh_token;
  return session.access;
}

// Middleware: attach req.session or 401.
async function requireAuth(req, res, next) {
  const sid = req.cookies.gsid;
  const session = sid && sessions.get(sid);
  if (!session) return res.status(401).json({ error: "Not logged in" });
  try {
    await getValidAccess(session);
    req.session = session;
    next();
  } catch (err) {
    console.error("Auth refresh failed:", err.message);
    sessions.delete(sid);
    res.status(401).json({ error: "Session expired, please log in again." });
  }
}

async function spotifyGet(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const err = new Error(`Spotify API ${res.status}: ${await res.text()}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// --- Auth routes ---
app.get("/api/login", (req, res) => {
  const state = makeId();
  pendingStates.set(state, Date.now());
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    state,
  });
  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

app.get("/api/callback", async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.redirect(`${FRONTEND_URL}?error=${encodeURIComponent(error)}`);
  if (!state || !pendingStates.has(state)) {
    return res.redirect(`${FRONTEND_URL}?error=state_mismatch`);
  }
  pendingStates.delete(state);

  try {
    const data = await spotifyTokenRequest({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    });
    const sid = makeId();
    sessions.set(sid, {
      access: data.access_token,
      refresh: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    });
    res.cookie("gsid", sid, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    res.redirect(FRONTEND_URL);
  } catch (err) {
    console.error(err);
    res.redirect(`${FRONTEND_URL}?error=token_exchange_failed`);
  }
});

app.post("/api/logout", (req, res) => {
  const sid = req.cookies.gsid;
  if (sid) sessions.delete(sid);
  res.clearCookie("gsid");
  res.json({ ok: true });
});

// --- Data routes ---
app.get("/api/me", requireAuth, async (req, res) => {
  try {
    const me = await spotifyGet("https://api.spotify.com/v1/me", req.session.access);
    res.json({
      loggedIn: true,
      displayName: me.display_name,
      image: me.images?.[0]?.url || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/playlists", requireAuth, async (req, res) => {
  try {
    const token = req.session.access;
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
          cover: p.images?.[0]?.url || null,
          total: p.tracks?.total || 0,
        });
      }
      next = page.next;
    }
    res.json({ playlists });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/playlist/:id", requireAuth, async (req, res) => {
  try {
    const token = req.session.access;
    const id = req.params.id;

    const meta = await spotifyGet(
      `https://api.spotify.com/v1/playlists/${id}?fields=name,images,owner(display_name)`,
      token
    );

    const tracks = [];
    let next =
      `https://api.spotify.com/v1/playlists/${id}/tracks` +
      `?fields=next,items(track(id,name,preview_url,artists(name),album(images)))&limit=100`;

    while (next) {
      const page = await spotifyGet(next, token);
      for (const item of page.items || []) {
        const t = item.track;
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

    const playable = tracks.filter((t) => t.previewUrl);
    res.json({
      id,
      name: meta.name,
      owner: meta.owner?.display_name || "",
      cover: meta.images?.[0]?.url || null,
      total: tracks.length,
      playableCount: playable.length,
      tracks: playable,
    });
  } catch (err) {
    console.error(err);
    const status = err.status === 404 ? 404 : 500;
    res.status(status).json({
      error: status === 404 ? "Playlist not found." : "Failed to load playlist.",
    });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`\n🎧 Guessify server on http://127.0.0.1:${PORT}\n`);
});
