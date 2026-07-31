import crypto from "node:crypto";
import { SCOPES, getBase, redirect, setStateCookie, setLinkOwnerCookie } from "./_lib.js";

export default function handler(req, res) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: "Server missing SPOTIFY_CLIENT_ID" });

  const state = crypto.randomBytes(16).toString("hex");
  setStateCookie(res, state);
  // One-time setup: /api/login?owner=1 flags the callback to print a refresh
  // token to paste into OWNER_REFRESH_TOKEN, instead of starting a session.
  if (req.query.owner === "1") setLinkOwnerCookie(res);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: `${getBase(req)}/api/callback`,
    state,
  });
  redirect(res, `https://accounts.spotify.com/authorize?${params}`);
}
