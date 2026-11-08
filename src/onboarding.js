const KEY = "guessify-onboarding-v3";

export function hasSeenOnboarding() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true; // no storage → don't loop the demo
  }
}

export function markOnboardingSeen() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearOnboardingSeen() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export const DEFAULT_DEMO = { id: "onboarding-blinding-lights", title: "Blinding Lights", artist: "The Weeknd" };
/** Replayed when someone switches to the lamia theme. */
export const LAMIA_DEMO = { id: "onboarding-knee-socks", title: "Knee Socks", artist: "Arctic Monkeys" };

/** One-track demo playlist via /api/preview (Blinding Lights unless told otherwise). */
export async function loadOnboardingPlaylist(song = DEFAULT_DEMO) {
  const qs = new URLSearchParams({
    title: song.title,
    artist: song.artist,
  });
  const res = await fetch(`/api/preview?${qs}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.previewUrl) {
    throw new Error(data.error || "preview missing");
  }
  const cover = data.artworkUrl
    ? String(data.artworkUrl).replace("100x100", "600x600")
    : null;
  return {
    id: song.id,
    name: "Quick demo",
    owner: "guessify",
    cover,
    total: 1,
    playableCount: 1,
    tracks: [
      {
        id: song.id,
        name: data.trackName || song.title,
        artists: [data.artistName || song.artist],
        previewUrl: data.previewUrl,
        cover,
      },
    ],
  };
}
