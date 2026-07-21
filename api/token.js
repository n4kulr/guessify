import { requireSession } from "./_lib.js";

// The Web Playback SDK needs the access token in the browser. This returns the
// logged-in user's current token (refreshing it server-side if expired).
export default async function handler(req, res) {
  const auth = await requireSession(req, res);
  if (!auth) return;
  res.status(200).json({ access: auth.access });
}
