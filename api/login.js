import crypto from "node:crypto";
import {
  SCOPES,
  getBase,
  redirect,
  setStateCookie,
  setLinkOwnerCookie,
  oauthNeedsApexBounce,
} from "./_lib.js";

export default function handler(req, res) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: "Server missing SPOTIFY_CLIENT_ID" });

  // Public Spotify login paused — app is in Spotify’s limited-user (allowlist) mode.
  // Owner refresh-token capture still works: /api/login?owner=1
  if (req.query.owner !== "1") {
    redirect(res, `${getBase(req)}/?error=login_paused`);
    return;
  }

  // Preview / alternate hosts can't set cookies for guessify.uk, and Spotify
  // only allows the registered redirect_uri — bounce to the apex first.
  if (oauthNeedsApexBounce(req)) {
    const q = new URLSearchParams(req.query).toString();
    redirect(res, `${getBase(req)}/api/login${q ? `?${q}` : ""}`);
    return;
  }

  const state = crypto.randomBytes(16).toString("hex");
  setStateCookie(res, state);
  // One-time setup: /api/login?owner=1 flags the callback to print a refresh
  // token to paste into OWNER_REFRESH_TOKEN, instead of starting a session.
  setLinkOwnerCookie(res);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: `${getBase(req)}/api/callback`,
    state,
  });
  redirect(res, `https://accounts.spotify.com/authorize?${params}`);
}
