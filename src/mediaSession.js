/**
 * Lock-screen / Control Center Now Playing art.
 * Always Guessify branding — never track title/artist/cover (that spoils the game).
 */
export function setGuessifyNowPlaying() {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  try {
    const origin = window.location.origin;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: "guessify",
      artist: "name that song",
      album: "guessify",
      artwork: [
        { src: `${origin}/og.png`, sizes: "1024x1024", type: "image/png" },
      ],
    });
    navigator.mediaSession.playbackState = "playing";
  } catch {
    /* older browsers */
  }
}

export function pauseGuessifyNowPlaying() {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.playbackState = "paused";
  } catch {
    /* ignore */
  }
}
