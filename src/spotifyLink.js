/**
 * Parse open.spotify.com / spotify: URIs into { kind, id }.
 * Albums work via client credentials; playlists need owner/collaborator login.
 */
export function parseSpotifyLink(input) {
  const s = String(input || "").trim();
  if (!s) return null;

  let m = s.match(/^spotify:(album|playlist):([a-zA-Z0-9]+)$/i);
  if (m) return { kind: m[1].toLowerCase(), id: m[2] };

  m = s.match(
    /(?:open\.)?spotify\.com\/(?:intl-[a-z]{2}\/)?(album|playlist)\/([a-zA-Z0-9]+)/i
  );
  if (m) return { kind: m[1].toLowerCase(), id: m[2] };

  return null;
}
