import crypto from "node:crypto";
import { SCOPES, getBase, redirect, setStateCookie } from "./_lib.js";

export default function handler(req, res) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: "Server missing SPOTIFY_CLIENT_ID" });

  const state = crypto.randomBytes(16).toString("hex");
  setStateCookie(res, state);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: `${getBase(req)}/api/callback`,
    state,
  });
  redirect(res, `https://accounts.spotify.com/authorize?${params}`);
}
