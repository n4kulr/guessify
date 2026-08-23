/** Pull playlist id from open.spotify.com/playlist/… or spotify:playlist:… */
export function parseSpotifyPlaylistId(input) {
  const s = String(input || "").trim();
  if (!s) return null;

  const uri = s.match(/^spotify:playlist:([a-zA-Z0-9]+)/i);
  if (uri) return uri[1];

  try {
    const url = /^https?:\/\//i.test(s) ? new URL(s) : new URL(`https://${s}`);
    if (!url.hostname.replace(/^www\./i, "").endsWith("spotify.com")) return null;
    const m = url.pathname.match(/\/playlist\/([a-zA-Z0-9]+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

if (import.meta.env?.DEV) {
  const id = "37i9dQZF1DX0XUsuxWNTQ";
  console.assert(
    parseSpotifyPlaylistId(`https://open.spotify.com/playlist/${id}?si=abc`) === id
  );
  console.assert(parseSpotifyPlaylistId(`spotify:playlist:${id}`) === id);
  console.assert(parseSpotifyPlaylistId("not a link") === null);
}
