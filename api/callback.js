import {
  getBase,
  getCookies,
  redirect,
  tokenRequest,
  writeSession,
  clearStateCookie,
} from "./_lib.js";

export default async function handler(req, res) {
  const base = getBase(req);
  const { code, state, error } = req.query;

  if (error) return redirect(res, `${base}/?error=${encodeURIComponent(error)}`);

  const saved = getCookies(req).gs_state;
  if (!state || !saved || state !== saved) {
    return redirect(res, `${base}/?error=state_mismatch`);
  }
  clearStateCookie(res);

  try {
    const data = await tokenRequest({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${base}/api/callback`,
    });
    writeSession(res, {
      access: data.access_token,
      refresh: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    });
    redirect(res, `${base}/`);
  } catch (e) {
    console.error(e);
    redirect(res, `${base}/?error=token_exchange_failed`);
  }
}
